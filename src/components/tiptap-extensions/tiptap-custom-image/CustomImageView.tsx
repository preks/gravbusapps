import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Editor } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'
import { NodeViewWrapper } from '@tiptap/react'
import { RotateCw } from 'lucide-react'
import { normalizeImageCrop } from './cropUtils'
import { DOCUMENT_IMAGE_UI_EVENT, type DocumentImageUiMode } from './pictureUiEvents'
import { DEFAULT_IMAGE_SIZE_REFERENCE } from './sizeUtils'
import { appendClassName, CUSTOM_IMAGE_FIGURE_CLASS, getFigureDataAttributes } from './styleUtils'
import type { CustomImageAttributes, CustomImageOptions } from './types'
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

type ResizeDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'
type InteractionState =
  | { kind: 'resize'; direction: ResizeDirection }
  | { kind: 'crop'; direction: ResizeDirection }
  | { kind: 'rotate' }
  | { kind: 'move' }
  | null

const HANDLE_DIRECTIONS: ReadonlyArray<ResizeDirection> = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
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
  const objectUrlRef = useRef<string | null>(null)
  const protectedSrcResolverRef = useRef(options.resolveProtectedSrc)
  const resolvedSrcRef = useRef<string | null>(options.isProtectedSrc(src) ? null : src)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const imageFrameRef = useRef<HTMLDivElement | null>(null)
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
      zIndex: node.attrs.zIndex ?? 1
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
        displaySrc: displaySrc || null
      }),
    [displaySrc, interactiveAttributes, measurementContext]
  )
  const figureDataAttributes = getFigureDataAttributes(interactiveAttributes)
  const isCropMode = selected && uiMode === 'crop'
  const lockAspectRatio = interactiveAttributes.lockAspectRatio ?? true
  const isFloatingImage = isFloatingWrapMode(interactiveAttributes.wrapMode)
  const displayWidth = layout.frameWidth
  const displayHeight = layout.frameHeight

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
      if (!editor) return false
      const pos = getPos()
      if (pos === undefined) return false

      const currentNode = editor.state.doc.nodeAt(pos)
      if (currentNode?.type.name !== 'image') return false

      const tr = editor.state.tr.setNodeMarkup(pos, undefined, {
        ...currentNode.attrs,
        ...nextAttrs
      })
      tr.setSelection(NodeSelection.create(tr.doc, pos))
      editor.view.dispatch(tr)
      editor.view.focus()
      refreshPagination()
      return true
    },
    [editor, getPos, refreshPagination]
  )

  const handleSelectNode = useCallback(
    (event: React.MouseEvent) => {
      if (!editor) return
      const pos = getPos()
      if (pos === undefined) return
      event.preventDefault()
      event.stopPropagation()

      const tr = editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, pos))
      editor.view.dispatch(tr)
      editor.view.focus()
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
      setMeasurementContext({
        containerWidth: target.clientWidth || wrapper.clientWidth || null,
        containerHeight: target.clientHeight || null
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
    },
    []
  )

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
    if (!selected || !editor || !isFloatingImage) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
      if (!editor.view.dom.contains(document.activeElement)) return

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
  }, [commitAttrs, editor, interactiveAttributes.offsetX, interactiveAttributes.offsetY, isFloatingImage, selected])

  const handleImageLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      const img = event.currentTarget
      const naturalWidth = Math.round(img.naturalWidth)
      const naturalHeight = Math.round(img.naturalHeight)

      if (!editor || naturalWidth <= 0 || naturalHeight <= 0) return

      const pos = getPos()
      if (pos === undefined) return

      const currentNode = editor.state.doc.nodeAt(pos)
      if (currentNode?.type.name !== 'image') return

      if (currentNode.attrs.originalWidth === naturalWidth && currentNode.attrs.originalHeight === naturalHeight) {
        return
      }

      const tr = editor.state.tr.setNodeMarkup(pos, undefined, {
        ...currentNode.attrs,
        originalWidth: naturalWidth,
        originalHeight: naturalHeight
      })
      editor.view.dispatch(tr)
    },
    [editor, getPos]
  )

  return (
    <NodeViewWrapper
      as="div"
      className="gba:max-w-full"
      style={layout.wrapperStyle}
      onClick={handleSelectNode}
      data-testid="document-editor-image-anchor"
      ref={wrapperRef}
      {...layout.runtimeAttributes}
    >
      <div className="gba:max-w-full">
        <figure
          className={appendClassName(CUSTOM_IMAGE_FIGURE_CLASS, 'editor-image-container')}
          style={layout.figureStyle}
          data-testid="document-editor-image-figure"
          {...figureDataAttributes}
        >
          <span className="gba:relative gba:inline-flex gba:max-w-full">
            {error || !displaySrc ? (
              <div
                ref={imageFrameRef}
                className="gba:relative gba:inline-flex gba:max-w-full"
                style={layout.imageFrameStyle}
                data-testid="document-editor-image-frame"
              >
                <div className="gba:relative" style={layout.cropViewportStyle}>
                  <span
                    className="gba:inline-flex gba:h-full gba:w-full gba:items-center gba:justify-center gba:rounded gba:bg-muted gba:text-muted-foreground gba:text-sm"
                    data-testid="document-editor-image-broken"
                  >
                    {error ? 'Image' : 'Loading image...'}
                  </span>
                </div>
              </div>
            ) : (
              <div
                ref={imageFrameRef}
                className={`gba:relative gba:inline-flex gba:max-w-full ${isFloatingImage && selected && !isCropMode ? 'gba:cursor-move' : ''}`}
                style={layout.imageFrameStyle}
                onMouseDown={startMoveInteraction}
                data-testid="document-editor-image-frame"
              >
                <div className="gba:relative" style={layout.cropViewportStyle}>
                  <img
                    src={displaySrc}
                    alt={interactiveAttributes.alt ?? ''}
                    title={interactiveAttributes.title ?? undefined}
                    className="editor-image gba:block"
                    style={layout.renderedImageStyle}
                    contentEditable={false}
                    draggable={false}
                    onLoad={handleImageLoad}
                    data-testid="document-editor-image"
                  />
                  {isCropMode ? (
                    <>
                      <div
                        className="gba:absolute gba:top-0 gba:left-0 gba:right-0 gba:bg-black/20 gba:pointer-events-none"
                        style={{ height: `${layout.crop.top * 100}%` }}
                      />
                      <div
                        className="gba:absolute gba:bottom-0 gba:left-0 gba:right-0 gba:bg-black/20 gba:pointer-events-none"
                        style={{ height: `${layout.crop.bottom * 100}%` }}
                      />
                      <div
                        className="gba:absolute gba:top-0 gba:bottom-0 gba:left-0 gba:bg-black/20 gba:pointer-events-none"
                        style={{ width: `${layout.crop.left * 100}%` }}
                      />
                      <div
                        className="gba:absolute gba:top-0 gba:bottom-0 gba:right-0 gba:bg-black/20 gba:pointer-events-none"
                        style={{ width: `${layout.crop.right * 100}%` }}
                      />
                    </>
                  ) : null}
                </div>
                {selected ? (
                  <div
                    className={`gba:absolute gba:-inset-1 gba:border-2 gba:border-primary/70 gba:pointer-events-none ${
                      isCropMode ? 'gba:border-dashed' : 'gba:border-solid'
                    }`}
                    data-testid="document-editor-image-selection-frame"
                  />
                ) : null}
                {selected && !error && displaySrc
                  ? HANDLE_DIRECTIONS.map(direction => {
                      const directionClasses: Record<ResizeDirection, string> = {
                        n: 'gba:top-0 gba:left-1/2 gba:-translate-x-1/2 gba:-translate-y-1/2',
                        ne: 'gba:top-0 gba:right-0 gba:translate-x-1/2 gba:-translate-y-1/2',
                        e: 'gba:top-1/2 gba:right-0 gba:translate-x-1/2 gba:-translate-y-1/2',
                        se: 'gba:bottom-0 gba:right-0 gba:translate-x-1/2 gba:translate-y-1/2',
                        s: 'gba:bottom-0 gba:left-1/2 gba:-translate-x-1/2 gba:translate-y-1/2',
                        sw: 'gba:bottom-0 gba:left-0 gba:-translate-x-1/2 gba:translate-y-1/2',
                        w: 'gba:top-1/2 gba:left-0 gba:-translate-x-1/2 gba:-translate-y-1/2',
                        nw: 'gba:top-0 gba:left-0 gba:-translate-x-1/2 gba:-translate-y-1/2'
                      }

                      return (
                        <button
                          key={direction}
                          type="button"
                          className={`gba:absolute gba:z-20 gba:h-3 gba:w-3 gba:rounded-full gba:border gba:border-primary gba:bg-background gba:p-0 ${directionClasses[direction]}`}
                          style={{ cursor: getHandleCursor(direction, isCropMode) }}
                          onMouseDown={event => startResizeInteraction(direction, event)}
                          data-image-handle="true"
                          data-testid={`document-editor-image-handle-${direction}`}
                        />
                      )
                    })
                  : null}
                {selected && !error && displaySrc ? (
                  <div
                    className="gba:absolute gba:bottom-full gba:left-1/2 gba:z-10 gba:flex gba:flex-col gba:items-center gba:-translate-x-1/2 gba:pb-2"
                    data-image-handle="true"
                  >
                    <button
                      type="button"
                      aria-label="Rotate image"
                      className="gba:flex gba:h-6 gba:w-6 gba:items-center gba:justify-center gba:rounded-full gba:border gba:border-primary gba:bg-background gba:p-0 gba:text-primary gba:shadow-sm gba:cursor-grab hover:gba:bg-accent"
                      onMouseDown={startRotateInteraction}
                      data-image-handle="true"
                      data-testid="document-editor-image-rotate-handle"
                    >
                      <RotateCw className="gba:h-3.5 gba:w-3.5" />
                    </button>
                    <span className="gba:h-4 gba:w-px gba:bg-primary/70 gba:pointer-events-none" />
                  </div>
                ) : null}
              </div>
            )}
          </span>
          {interactiveAttributes.caption ? (
            <figcaption
              className="editor-image-caption gba:mt-1 gba:text-xs gba:text-muted-foreground"
              data-testid="document-editor-image-caption"
            >
              {interactiveAttributes.caption}
            </figcaption>
          ) : null}
        </figure>
      </div>
    </NodeViewWrapper>
  )
}
