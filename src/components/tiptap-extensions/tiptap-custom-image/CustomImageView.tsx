import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Editor } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'
import { NodeViewWrapper } from '@tiptap/react'
import { createPortal } from 'react-dom'
import { CustomImageFigure, type ResizeDirection } from './CustomImageFigure'
import { normalizeImageCrop } from './cropUtils'
import {
  areImageOverlayMountsEqual,
  resolveImageOverlayFigureStyle,
  resolveImageOverlayMount
} from './imageOverlayUtils'
import { DOCUMENT_IMAGE_UI_EVENT, type DocumentImageUiMode } from './pictureUiEvents'
import { DEFAULT_IMAGE_SIZE_REFERENCE } from './sizeUtils'
import { getFigureDataAttributes, normalizeNullableNumber } from './styleUtils'
import {
  DEFAULT_IMAGE_BORDER_COLOR,
  DEFAULT_IMAGE_BORDER_DASH,
  DEFAULT_IMAGE_BORDER_WIDTH_PT,
  type CustomImageAttributes,
  type CustomImageOptions
} from './types'
import { analyzeImageWrapContour, areImageWrapContoursEqual, type ImageWrapContour } from './wrapContourUtils'
import {
  getImageFlowShimAttributes,
  resolveImageAnchorGeometryElement,
  resolveImageFlowShimStyle,
  resolveImageFlowShimTarget,
  syncImageFlowShimHost
} from './wrapFlowShimRuntime'
import { resolveWordLikeImageLayout } from './wrapLayoutEngine'
import { isFloatingWrapMode } from './wrapUtils'

interface CustomImageViewProps {
  readonly node: {
    readonly attrs: CustomImageAttributes
  }
  readonly editor: Editor | null
  readonly getPos: () => number | undefined
  readonly selected: boolean
  readonly options: Pick<
    CustomImageOptions,
    | 'defaultAlign'
    | 'defaultWrapMode'
    | 'defaultAnchorMode'
    | 'defaultDisplay'
    | 'defaultDistance'
    | 'getAccessToken'
    | 'isProtectedSrc'
    | 'resolveProtectedSrc'
    | 'minSize'
  >
}

type InteractionState =
  | { kind: 'resize'; direction: ResizeDirection }
  | { kind: 'crop'; direction: ResizeDirection }
  | { kind: 'rotate' }
  | { kind: 'move' }
  | null
const ROTATION_SNAP_INCREMENT = 15
const ROTATION_SNAP_TOLERANCE = 3
const DEFAULT_KEYBOARD_NUDGE_PX = 1
const LARGE_KEYBOARD_NUDGE_PX = 10

function getHandleCursor(direction: ResizeDirection, cropMode: boolean) {
  if (cropMode) {
    if (direction === 'n' || direction === 's') return 'ns-resize'
    if (direction === 'e' || direction === 'w') return 'ew-resize'
    if (direction === 'ne' || direction === 'sw') return 'nesw-resize'
    return 'nwse-resize'
  }

  if (direction === 'n' || direction === 's') return 'ns-resize'
  if (direction === 'e' || direction === 'w') return 'ew-resize'
  if (direction === 'ne' || direction === 'sw') return 'nesw-resize'
  return 'nwse-resize'
}

function clampRotation(rotation: number) {
  const normalized = ((rotation % 360) + 360) % 360
  const nearestSnap = Math.round(normalized / ROTATION_SNAP_INCREMENT) * ROTATION_SNAP_INCREMENT
  if (Math.abs(nearestSnap - normalized) <= ROTATION_SNAP_TOLERANCE) {
    return nearestSnap % 360
  }

  return Number(normalized.toFixed(2))
}

function getPointerAngle(clientX: number, clientY: number, rect: DOMRect) {
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  return (Math.atan2(clientY - centerY, clientX - centerX) * 180) / Math.PI
}

function getEditorViewSafely(editor: Editor | null) {
  if (!editor || editor.isDestroyed) {
    return null
  }

  try {
    return editor.view
  } catch {
    return null
  }
}

function getEditorDomSafely(editor: Editor | null) {
  const view = getEditorViewSafely(editor)
  return view?.dom instanceof HTMLElement ? view.dom : null
}

function isEditorEditable(editor: Editor | null) {
  return Boolean(editor && !editor.isDestroyed && editor.isEditable)
}

export function CustomImageView({ node, editor, getPos, selected, options }: Readonly<CustomImageViewProps>) {
  const src = node.attrs.src ?? ''
  const [displaySrc, setDisplaySrc] = useState<string>(() => (options.isProtectedSrc(src) ? '' : src))
  const [error, setError] = useState(false)
  const [uiMode, setUiMode] = useState<DocumentImageUiMode>('default')
  const [previewAttrs, setPreviewAttrs] = useState<Partial<CustomImageAttributes> | null>(null)
  const [measurementContext, setMeasurementContext] = useState<{
    containerWidth: number | null
    containerHeight: number | null
  }>({
    containerWidth: null,
    containerHeight: null
  })
  const [overlayMount, setOverlayMount] = useState<ReturnType<typeof resolveImageOverlayMount> | null>(null)
  const [flowShimMount, setFlowShimMount] = useState<HTMLElement | null>(null)
  const [wrapContour, setWrapContour] = useState<ImageWrapContour | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const protectedSrcResolverRef = useRef(options.resolveProtectedSrc)
  const resolvedSrcRef = useRef<string | null>(options.isProtectedSrc(src) ? null : src)
  const wrapperRef = useRef<HTMLElement | null>(null)
  const flowShimHostRef = useRef<HTMLElement | null>(null)
  const flowShimElementRef = useRef<HTMLElement | null>(null)
  const imageFrameRef = useRef<HTMLElement | null>(null)
  const interactionStateRef = useRef<InteractionState>(null)
  const previewAttrsRef = useRef<Partial<CustomImageAttributes> | null>(null)
  const protectedSrcEnabled = options.isProtectedSrc(src) && typeof options.resolveProtectedSrc === 'function'
  const protectedSrcAccessToken = protectedSrcEnabled ? options.getAccessToken() : ''
  protectedSrcResolverRef.current = options.resolveProtectedSrc

  const mergedAttributes = useMemo<CustomImageAttributes>(
    () => ({
      ...node.attrs,
      originalWidth: node.attrs.originalWidth ?? null,
      originalHeight: node.attrs.originalHeight ?? null,
      align: node.attrs.align ?? options.defaultAlign,
      widthUnit: node.attrs.widthUnit ?? 'px',
      heightUnit: node.attrs.heightUnit ?? 'px',
      widthPercent: node.attrs.widthPercent ?? null,
      heightPercent: node.attrs.heightPercent ?? null,
      widthRelativeTo: node.attrs.widthRelativeTo ?? DEFAULT_IMAGE_SIZE_REFERENCE,
      heightRelativeTo: node.attrs.heightRelativeTo ?? DEFAULT_IMAGE_SIZE_REFERENCE,
      scaleWidthPercent: node.attrs.scaleWidthPercent ?? 100,
      scaleHeightPercent: node.attrs.scaleHeightPercent ?? 100,
      rotation: node.attrs.rotation ?? 0,
      cropTop: node.attrs.cropTop ?? 0,
      cropRight: node.attrs.cropRight ?? 0,
      cropBottom: node.attrs.cropBottom ?? 0,
      cropLeft: node.attrs.cropLeft ?? 0,
      wrapMode: node.attrs.wrapMode ?? options.defaultWrapMode,
      wrapTextSide: node.attrs.wrapTextSide ?? null,
      anchorMode: node.attrs.anchorMode ?? options.defaultAnchorMode,
      display: node.attrs.display ?? options.defaultDisplay,
      lockAspectRatio: node.attrs.lockAspectRatio ?? true,
      distanceTop: node.attrs.distanceTop ?? options.defaultDistance,
      distanceRight: node.attrs.distanceRight ?? options.defaultDistance,
      distanceBottom: node.attrs.distanceBottom ?? options.defaultDistance,
      distanceLeft: node.attrs.distanceLeft ?? options.defaultDistance,
      offsetX: node.attrs.offsetX ?? 0,
      offsetY: node.attrs.offsetY ?? 0,
      allowOverlap: node.attrs.allowOverlap ?? false,
      zIndex: node.attrs.zIndex ?? 1,
      borderVisible: node.attrs.borderVisible ?? false,
      borderColor: node.attrs.borderColor ?? DEFAULT_IMAGE_BORDER_COLOR,
      borderWidthPt: node.attrs.borderWidthPt ?? DEFAULT_IMAGE_BORDER_WIDTH_PT,
      borderDash: node.attrs.borderDash ?? DEFAULT_IMAGE_BORDER_DASH
    }),
    [
      node.attrs,
      options.defaultAlign,
      options.defaultAnchorMode,
      options.defaultDisplay,
      options.defaultDistance,
      options.defaultWrapMode
    ]
  )
  const interactiveAttributes = useMemo(
    () => ({ ...mergedAttributes, ...(previewAttrs ?? {}) }),
    [mergedAttributes, previewAttrs]
  )
  const layout = useMemo(
    () =>
      resolveWordLikeImageLayout(interactiveAttributes, {
        ...measurementContext,
        displaySrc: displaySrc || null,
        wrapContour
      }),
    [displaySrc, interactiveAttributes, measurementContext, wrapContour]
  )
  const figureDataAttributes = getFigureDataAttributes(interactiveAttributes)
  const isCropMode = selected && uiMode === 'crop'
  const lockAspectRatio = interactiveAttributes.lockAspectRatio ?? true
  const isFloatingImage = isFloatingWrapMode(interactiveAttributes.wrapMode)
  const usesPageOverlayVisual = layout.renderMode === 'overlay'
  const usesSquareDecorationExclusion =
    layout.wrapMode === 'square' && layout.exclusionMode === 'square' && layout.anchorMode !== 'fixed'
  const usesFlowShim =
    layout.exclusionMode !== 'none' &&
    (usesPageOverlayVisual || layout.flowMode === 'float') &&
    !usesSquareDecorationExclusion
  const usesLocalFlowShimFigure = usesFlowShim && !usesPageOverlayVisual
  const displayWidth = layout.frameWidth
  const displayHeight = layout.frameHeight
  const shouldRenderOverlayPortal = usesPageOverlayVisual && overlayMount !== null
  const imageNodePos = getPos()
  const imageEditable = isEditorEditable(editor)
  const flowShimStyle = useMemo(() => resolveImageFlowShimStyle(layout, wrapContour), [layout, wrapContour])
  const anchorRuntimeAttributes = useMemo(
    () =>
      usesFlowShim || usesSquareDecorationExclusion
        ? {
            ...layout.runtimeAttributes,
            'data-image-exclusion-mode': 'none',
            'data-image-layout-height': '0',
            'data-image-layout-width': '0',
            'data-image-visual-bottom': '0',
            'data-image-measurement-mode': 'overlay',
            ...(imageNodePos !== undefined ? { 'data-image-node-pos': String(imageNodePos) } : {})
          }
        : {
            ...layout.runtimeAttributes,
            ...(imageNodePos !== undefined ? { 'data-image-node-pos': String(imageNodePos) } : {})
          },
    [imageNodePos, layout.runtimeAttributes, usesFlowShim, usesSquareDecorationExclusion]
  )
  const overlayFigureStyle = useMemo(
    () =>
      overlayMount && shouldRenderOverlayPortal
        ? resolveImageOverlayFigureStyle({
            layout,
            attributes: interactiveAttributes,
            mount: overlayMount
          })
        : null,
    [interactiveAttributes, layout, overlayMount, shouldRenderOverlayPortal]
  )

  const refreshPagination = useCallback(() => {
    if (editor?.commands.refreshPagesAndStabilize) {
      editor.commands.refreshPagesAndStabilize()
    }
  }, [editor])

  const applyPreviewAttrs = useCallback((nextAttrs: Partial<CustomImageAttributes> | null) => {
    previewAttrsRef.current = nextAttrs
    setPreviewAttrs(nextAttrs)
  }, [])

  const commitAttrs = useCallback(
    (nextAttrs: Partial<CustomImageAttributes>) => {
      if (!isEditorEditable(editor)) return false
      if (!editor) return false
      const view = getEditorViewSafely(editor)
      if (!view) return false
      const pos = getPos()
      if (pos === undefined) return false

      const currentNode = editor.state.doc.nodeAt(pos)
      if (currentNode?.type.name !== 'image') return false

      const tr = editor.state.tr.setNodeMarkup(pos, undefined, {
        ...currentNode.attrs,
        ...nextAttrs
      })
      tr.setSelection(NodeSelection.create(tr.doc, pos))
      view.dispatch(tr)
      view.focus()
      refreshPagination()
      return true
    },
    [editor, getPos, refreshPagination]
  )

  const handleSelectNode = useCallback(
    (event: React.MouseEvent) => {
      if (!editor) return
      const view = getEditorViewSafely(editor)
      if (!view) return
      const pos = getPos()
      if (pos === undefined) return
      event.preventDefault()
      event.stopPropagation()

      const tr = editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, pos))
      view.dispatch(tr)
      view.focus()
    },
    [editor, getPos]
  )

  const finalizeInteraction = useCallback(
    (nextAttrs: Partial<CustomImageAttributes> | null) => {
      interactionStateRef.current = null
      applyPreviewAttrs(null)
      if (nextAttrs) {
        commitAttrs(nextAttrs)
      }
    },
    [applyPreviewAttrs, commitAttrs]
  )

  const startResizeInteraction = useCallback(
    (direction: ResizeDirection, event: React.MouseEvent) => {
      if (!isEditorEditable(editor)) return
      event.preventDefault()
      event.stopPropagation()
      if (!editor) return

      const startWidth = displayWidth
      const startHeight = displayHeight
      const startOffsetX = interactiveAttributes.offsetX ?? 0
      const startOffsetY = interactiveAttributes.offsetY ?? 0
      const aspectRatio = startHeight > 0 ? startWidth / startHeight : null

      interactionStateRef.current = isCropMode ? { kind: 'crop', direction } : { kind: 'resize', direction }
      const startX = event.clientX
      const startY = event.clientY
      const startCrop = normalizeImageCrop(interactiveAttributes)

      const onMove = (moveEvent: MouseEvent) => {
        const dx = moveEvent.clientX - startX
        const dy = moveEvent.clientY - startY
        const includesWest = direction.includes('w')
        const includesEast = direction.includes('e')
        const includesNorth = direction.includes('n')
        const includesSouth = direction.includes('s')

        if (isCropMode) {
          const nextCrop = {
            top: startCrop.top + (includesNorth ? dy / startHeight : 0),
            right: startCrop.right + (includesEast ? -dx / startWidth : 0),
            bottom: startCrop.bottom + (includesSouth ? -dy / startHeight : 0),
            left: startCrop.left + (includesWest ? dx / startWidth : 0)
          }
          const normalizedCrop = normalizeImageCrop({
            cropTop: nextCrop.top,
            cropRight: nextCrop.right,
            cropBottom: nextCrop.bottom,
            cropLeft: nextCrop.left
          })

          applyPreviewAttrs({
            cropTop: normalizedCrop.top,
            cropRight: normalizedCrop.right,
            cropBottom: normalizedCrop.bottom,
            cropLeft: normalizedCrop.left
          })
          return
        }

        let width = startWidth + (includesEast ? dx : 0) - (includesWest ? dx : 0)
        let height = startHeight + (includesSouth ? dy : 0) - (includesNorth ? dy : 0)
        width = Math.max(options.minSize, Math.round(width))
        height = Math.max(options.minSize, Math.round(height))

        if (lockAspectRatio && aspectRatio) {
          if ((includesEast || includesWest) && (includesNorth || includesSouth)) {
            const widthScale = width / startWidth
            const heightScale = height / startHeight
            const scale = Math.max(widthScale, heightScale)
            width = Math.max(options.minSize, Math.round(startWidth * scale))
            height = Math.max(options.minSize, Math.round(startHeight * scale))
          } else if (includesEast || includesWest) {
            height = Math.max(options.minSize, Math.round(width / aspectRatio))
          } else if (includesNorth || includesSouth) {
            width = Math.max(options.minSize, Math.round(height * aspectRatio))
          }
        }

        const nextPreview: Partial<CustomImageAttributes> = {
          width,
          height,
          widthUnit: 'px',
          heightUnit: 'px',
          widthPercent: null,
          heightPercent: null,
          scaleWidthPercent: 100,
          scaleHeightPercent: 100
        }

        if (
          (interactiveAttributes.wrapMode === 'behind' || interactiveAttributes.wrapMode === 'front') &&
          includesWest
        ) {
          nextPreview.offsetX = startOffsetX + (startWidth - width)
        }
        if (
          (interactiveAttributes.wrapMode === 'behind' || interactiveAttributes.wrapMode === 'front') &&
          includesNorth
        ) {
          nextPreview.offsetY = startOffsetY + (startHeight - height)
        }

        applyPreviewAttrs(nextPreview)
      }

      const onUp = () => {
        globalThis.removeEventListener('mousemove', onMove)
        globalThis.removeEventListener('mouseup', onUp)
        finalizeInteraction(previewAttrsRef.current)
      }

      globalThis.addEventListener('mousemove', onMove)
      globalThis.addEventListener('mouseup', onUp)
    },
    [
      displayHeight,
      displayWidth,
      editor,
      finalizeInteraction,
      interactiveAttributes,
      isCropMode,
      lockAspectRatio,
      options.minSize,
      applyPreviewAttrs
    ]
  )

  const startRotateInteraction = useCallback(
    (event: React.MouseEvent) => {
      if (!isEditorEditable(editor)) return
      event.preventDefault()
      event.stopPropagation()
      const frame = imageFrameRef.current
      if (!frame) return

      interactionStateRef.current = { kind: 'rotate' }
      const rect = frame.getBoundingClientRect()
      const startAngle = getPointerAngle(event.clientX, event.clientY, rect)
      const startRotation = interactiveAttributes.rotation ?? 0

      const onMove = (moveEvent: MouseEvent) => {
        const currentAngle = getPointerAngle(moveEvent.clientX, moveEvent.clientY, rect)
        applyPreviewAttrs({
          rotation: clampRotation(startRotation + currentAngle - startAngle)
        })
      }

      const onUp = () => {
        globalThis.removeEventListener('mousemove', onMove)
        globalThis.removeEventListener('mouseup', onUp)
        finalizeInteraction(previewAttrsRef.current)
      }

      globalThis.addEventListener('mousemove', onMove)
      globalThis.addEventListener('mouseup', onUp)
    },
    [applyPreviewAttrs, finalizeInteraction, interactiveAttributes.rotation]
  )

  const startMoveInteraction = useCallback(
    (event: React.MouseEvent) => {
      if (!isEditorEditable(editor)) return
      if (!selected) return
      if (!isFloatingImage || isCropMode) return
      if ((event.target as HTMLElement).closest('[data-image-handle="true"]')) return

      event.preventDefault()
      event.stopPropagation()
      interactionStateRef.current = { kind: 'move' }
      const startX = event.clientX
      const startY = event.clientY
      const startOffsetX = interactiveAttributes.offsetX ?? 0
      const startOffsetY = interactiveAttributes.offsetY ?? 0

      const onMove = (moveEvent: MouseEvent) => {
        applyPreviewAttrs({
          offsetX: Math.round(startOffsetX + moveEvent.clientX - startX),
          offsetY: Math.round(startOffsetY + moveEvent.clientY - startY)
        })
      }

      const onUp = () => {
        globalThis.removeEventListener('mousemove', onMove)
        globalThis.removeEventListener('mouseup', onUp)
        finalizeInteraction(previewAttrsRef.current)
      }

      globalThis.addEventListener('mousemove', onMove)
      globalThis.addEventListener('mouseup', onUp)
    },
    [
      applyPreviewAttrs,
      finalizeInteraction,
      interactiveAttributes.offsetX,
      interactiveAttributes.offsetY,
      isCropMode,
      isFloatingImage,
      selected
    ]
  )

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const target = wrapper.parentElement ?? wrapper
    const updateMeasurements = () => {
      const containerWidth = target.clientWidth || wrapper.clientWidth || null
      const containerHeight = target.clientHeight || null
      setMeasurementContext(prev => {
        if (prev.containerWidth === containerWidth && prev.containerHeight === containerHeight) {
          return prev
        }
        return { containerWidth, containerHeight }
      })
    }

    updateMeasurements()

    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => {
      updateMeasurements()
    })

    observer.observe(target)

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const revokeObjectUrl = () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }

    if (!src) {
      revokeObjectUrl()
      resolvedSrcRef.current = null
      setDisplaySrc('')
      setError(true)
      return
    }

    if (!protectedSrcEnabled) {
      revokeObjectUrl()
      resolvedSrcRef.current = src
      setDisplaySrc(src)
      setError(false)
      return
    }

    if (!protectedSrcAccessToken) {
      revokeObjectUrl()
      resolvedSrcRef.current = src
      setDisplaySrc(src)
      setError(false)
      return
    }

    let disposed = false
    const shouldKeepResolvedDisplay = resolvedSrcRef.current === src && displaySrc.length > 0
    if (!shouldKeepResolvedDisplay) {
      setDisplaySrc('')
    }

    const protectedSrcResolver = protectedSrcResolverRef.current
    if (!protectedSrcResolver) {
      return
    }

    protectedSrcResolver(src, protectedSrcAccessToken)
      .then(resolved => {
        if (disposed) {
          return
        }

        if (typeof resolved === 'string') {
          revokeObjectUrl()
          setDisplaySrc(resolved)
        } else {
          revokeObjectUrl()
          objectUrlRef.current = URL.createObjectURL(resolved)
          setDisplaySrc(objectUrlRef.current)
        }

        resolvedSrcRef.current = src
        setError(false)
      })
      .catch(() => {
        if (disposed) {
          return
        }

        resolvedSrcRef.current = null
        setDisplaySrc('')
        setError(true)
      })

    return () => {
      disposed = true
    }
  }, [protectedSrcAccessToken, protectedSrcEnabled, src])

  useEffect(
    () => () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
      flowShimElementRef.current = null
      if (flowShimHostRef.current?.parentElement) {
        flowShimHostRef.current.parentElement.removeChild(flowShimHostRef.current)
      }
      flowShimHostRef.current = null
    },
    []
  )

  useEffect(() => {
    setWrapContour(previousWrapContour => (previousWrapContour === null ? previousWrapContour : null))
  }, [
    displaySrc,
    interactiveAttributes.cropBottom,
    interactiveAttributes.cropLeft,
    interactiveAttributes.cropRight,
    interactiveAttributes.cropTop,
    interactiveAttributes.rotation,
    interactiveAttributes.wrapMode
  ])

  useEffect(() => {
    if (!usesFlowShim) {
      flowShimElementRef.current = null
      if (flowShimHostRef.current?.parentElement) {
        flowShimHostRef.current.parentElement.removeChild(flowShimHostRef.current)
      }
      setFlowShimMount(null)
      return
    }

    const wrapper = wrapperRef.current
    if (!(wrapper instanceof HTMLElement)) {
      if (flowShimHostRef.current?.parentElement) {
        flowShimHostRef.current.parentElement.removeChild(flowShimHostRef.current)
      }
      setFlowShimMount(null)
      return
    }

    const target = resolveImageFlowShimTarget(wrapper, layout)
    if (!(target instanceof HTMLElement)) {
      if (flowShimHostRef.current?.parentElement) {
        flowShimHostRef.current.parentElement.removeChild(flowShimHostRef.current)
      }
      setFlowShimMount(null)
      return
    }

    const host = flowShimHostRef.current ?? document.createElement('span')
    flowShimHostRef.current = host
    syncImageFlowShimHost(target, host, getPos() ?? Number.MAX_SAFE_INTEGER)
    setFlowShimMount(host)
  }, [getPos, layout, usesFlowShim])

  useEffect(() => {
    if (!usesFlowShim || !flowShimMount) {
      flowShimElementRef.current = null
    }
  }, [flowShimMount, usesFlowShim])

  useEffect(() => {
    if (selected) return
    setUiMode('default')
    applyPreviewAttrs(null)
    interactionStateRef.current = null
  }, [applyPreviewAttrs, selected])

  useEffect(() => {
    const handleUiEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ pos: number | null; mode: DocumentImageUiMode }>
      const pos = getPos()
      if (pos === undefined) return
      if (customEvent.detail?.pos !== pos) return
      setUiMode(customEvent.detail.mode)
    }

    globalThis.addEventListener(DOCUMENT_IMAGE_UI_EVENT, handleUiEvent)
    return () => globalThis.removeEventListener(DOCUMENT_IMAGE_UI_EVENT, handleUiEvent)
  }, [getPos])

  useEffect(() => {
    if (!selected || !editor || !isFloatingImage || !imageEditable) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isEditorEditable(editor)) return
      const editorDom = getEditorDomSafely(editor)
      if (!editorDom) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
      if (!editorDom.contains(document.activeElement)) return

      event.preventDefault()
      const step = event.shiftKey ? LARGE_KEYBOARD_NUDGE_PX : DEFAULT_KEYBOARD_NUDGE_PX
      const deltaX = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0
      const deltaY = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0
      commitAttrs({
        offsetX: (interactiveAttributes.offsetX ?? 0) + deltaX,
        offsetY: (interactiveAttributes.offsetY ?? 0) + deltaY
      })
    }

    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [
    commitAttrs,
    editor,
    imageEditable,
    interactiveAttributes.offsetX,
    interactiveAttributes.offsetY,
    isFloatingImage,
    selected
  ])

  const handleImageLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      const img = event.currentTarget
      const naturalWidth = Math.round(img.naturalWidth)
      const naturalHeight = Math.round(img.naturalHeight)

      if (!editor || naturalWidth <= 0 || naturalHeight <= 0) return

      if (interactiveAttributes.wrapMode === 'tight' || interactiveAttributes.wrapMode === 'through') {
        const nextWrapContour = analyzeImageWrapContour(img, interactiveAttributes)
        setWrapContour(previousWrapContour =>
          areImageWrapContoursEqual(previousWrapContour, nextWrapContour) ? previousWrapContour : nextWrapContour
        )
      } else {
        setWrapContour(previousWrapContour => (previousWrapContour === null ? previousWrapContour : null))
      }

      const pos = getPos()
      if (pos === undefined) return

      const currentNode = editor.state.doc.nodeAt(pos)
      if (currentNode?.type.name !== 'image') return

      const prevOw = normalizeNullableNumber(currentNode.attrs.originalWidth)
      const prevOh = normalizeNullableNumber(currentNode.attrs.originalHeight)
      if (prevOw != null && prevOh != null) {
        return
      }

      const view = getEditorViewSafely(editor)
      if (!view) return

      const tr = editor.state.tr.setNodeMarkup(pos, undefined, {
        ...currentNode.attrs,
        originalWidth: naturalWidth,
        originalHeight: naturalHeight
      })
      view.dispatch(tr)
    },
    [editor, getPos, interactiveAttributes]
  )

  const refreshOverlayMount = useCallback(() => {
    const wrapper = wrapperRef.current
    const editorElement = getEditorDomSafely(editor)
    // Never use the flow shim rect for overlay placement. Move-with-text overlays resolve their
    // geometry from the containing paragraph, while fixed/page-anchored overlays fall back to the
    // node-view wrapper.
    const anchorElement = wrapper instanceof HTMLElement ? resolveImageAnchorGeometryElement(wrapper, layout) : null

    if (!usesPageOverlayVisual || !(anchorElement instanceof HTMLElement) || !(editorElement instanceof HTMLElement)) {
      setOverlayMount(null)
      return
    }

    const nextOverlayMount = resolveImageOverlayMount({
      editorElement,
      anchorElement,
      wrapperElement: wrapper,
      layout
    })
    setOverlayMount(previousOverlayMount =>
      areImageOverlayMountsEqual(previousOverlayMount, nextOverlayMount) ? previousOverlayMount : nextOverlayMount
    )
  }, [editor, layout, usesPageOverlayVisual])

  useEffect(() => {
    if (!usesPageOverlayVisual) {
      setOverlayMount(null)
      return
    }

    const frame = requestAnimationFrame(() => {
      refreshOverlayMount()
    })

    return () => {
      cancelAnimationFrame(frame)
    }
  }, [
    displayHeight,
    displayWidth,
    interactiveAttributes.align,
    interactiveAttributes.anchorMode,
    interactiveAttributes.offsetX,
    interactiveAttributes.offsetY,
    interactiveAttributes.wrapTextSide,
    layout.figureLeft,
    layout.figureTop,
    layout.overlayLayer,
    layout.floatingSide,
    usesPageOverlayVisual,
    refreshOverlayMount,
    selected
  ])

  useEffect(() => {
    if (!usesPageOverlayVisual) {
      return
    }

    const wrapper = wrapperRef.current
    const editorElement = getEditorDomSafely(editor)
    const geometryAnchor = wrapper instanceof HTMLElement ? resolveImageAnchorGeometryElement(wrapper, layout) : null
    if (
      !(geometryAnchor instanceof HTMLElement) ||
      !(editorElement instanceof HTMLElement) ||
      !(wrapper instanceof HTMLElement)
    ) {
      return
    }

    const scheduleRefresh = () => {
      requestAnimationFrame(() => {
        refreshOverlayMount()
      })
    }

    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleRefresh)
    resizeObserver?.observe(geometryAnchor)
    if (wrapper !== geometryAnchor) {
      resizeObserver?.observe(wrapper)
    }
    resizeObserver?.observe(editorElement)

    const mutationObserver = new MutationObserver(scheduleRefresh)
    mutationObserver.observe(editorElement, {
      attributes: true,
      attributeFilter: ['style', 'data-layout-window-key', 'data-layout-mounted-start', 'data-layout-mounted-end'],
      childList: true,
      subtree: true
    })

    return () => {
      resizeObserver?.disconnect()
      mutationObserver.disconnect()
    }
  }, [editor, layout, refreshOverlayMount, usesPageOverlayVisual])

  const renderImageFigure = useCallback(
    (figureStyleOverride?: React.CSSProperties, selectionAnchorAttributes?: Record<string, string>) => (
      <CustomImageFigure
        layout={layout}
        interactiveAttributes={interactiveAttributes}
        figureDataAttributes={figureDataAttributes}
        displaySrc={displaySrc}
        error={error}
        selected={selected}
        isCropMode={isCropMode}
        isFloatingImage={isFloatingImage}
        figureStyleOverride={figureStyleOverride}
        selectionAnchorAttributes={selectionAnchorAttributes}
        imageFrameRef={imageFrameRef}
        isEditable={imageEditable}
        onSelect={handleSelectNode}
        onStartMove={startMoveInteraction}
        onStartResize={startResizeInteraction}
        onStartRotate={startRotateInteraction}
        onImageLoad={handleImageLoad}
        getHandleCursor={getHandleCursor}
      />
    ),
    [
      displaySrc,
      error,
      figureDataAttributes,
      handleImageLoad,
      handleSelectNode,
      interactiveAttributes,
      isCropMode,
      isFloatingImage,
      layout,
      selected,
      startMoveInteraction,
      startResizeInteraction,
      startRotateInteraction
    ]
  )

  const shouldRenderLocalFigure = usesPageOverlayVisual ? overlayMount === null : !usesFlowShim

  return (
    <NodeViewWrapper
      as="span"
      className="gba:max-w-full"
      style={layout.wrapperStyle}
      draggable
      data-drag-handle
      onClick={handleSelectNode}
      data-testid="document-editor-image-anchor"
      ref={wrapperRef}
      {...anchorRuntimeAttributes}
    >
      {usesFlowShim && flowShimMount && flowShimStyle
        ? createPortal(
            <span
              ref={element => {
                flowShimElementRef.current = element
              }}
              data-testid="document-editor-image-flow-shim"
              contentEditable={false}
              style={
                usesLocalFlowShimFigure
                  ? {
                      ...flowShimStyle,
                      visibility: 'visible' as const,
                      position: 'relative' as const,
                      overflow: 'visible' as const,
                      pointerEvents: 'auto' as const,
                      userSelect: undefined
                    }
                  : flowShimStyle
              }
              {...getImageFlowShimAttributes(layout, wrapContour)}
              {...(usesLocalFlowShimFigure && imageNodePos !== undefined
                ? { 'data-image-node-pos': String(imageNodePos) }
                : {})}
            >
              {usesLocalFlowShimFigure ? (
                <span className="gba:max-w-full" data-testid="document-editor-image-anchor">
                  {renderImageFigure()}
                </span>
              ) : null}
            </span>,
            flowShimMount
          )
        : null}
      {shouldRenderLocalFigure ? <span className="gba:max-w-full">{renderImageFigure()}</span> : null}
      {shouldRenderOverlayPortal && overlayMount && overlayFigureStyle
        ? createPortal(
            renderImageFigure(overlayFigureStyle, {
              'data-image-overlay-anchor': 'true',
              ...(imageNodePos !== undefined ? { 'data-image-node-pos': String(imageNodePos) } : {})
            }),
            overlayMount.layer
          )
        : null}
    </NodeViewWrapper>
  )
}
