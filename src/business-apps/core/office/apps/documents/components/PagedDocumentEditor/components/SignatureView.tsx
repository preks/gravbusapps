/**
 * Renders a signature node with resize handles, rotate control, and optional crop mode.
 * Supports floating mode (pageNumber, x, y) using the page body layer as the coordinate system.
 */

import React, { useRef, useCallback, useMemo, useLayoutEffect, useEffect, useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { NodeViewWrapper, useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
import {
  hasImageCrop,
  normalizeImageCrop,
  resolveImageCropDimensions
} from '@/components/tiptap-extensions/tiptap-custom-image'
import {
  computeSignatureUniformContainLayout,
  parseSvgIntrinsicSizeFromMarkup
} from '../../../utils/signatureSvgIntrinsic'
import type { NormalizedImageCrop } from '@/components/tiptap-extensions/tiptap-custom-image/cropUtils'
import { DOCUMENT_SIGNATURE_UI_EVENT, type DocumentSignatureUiEventDetail } from '../signatureUiEvents'
import { SignatureCropOverlay, type SignatureResizeDirection } from './SignatureCropOverlay'
import { SignatureSelectionChrome } from './SignatureSelectionChrome'
import { clampSignatureRotation, getPointerAngleFromRect } from './signatureInteractionUtils'
import { buildBakedSignatureAttrsAfterCrop } from './signatureSnapshotCropBake'
import translations from '../../../_i18n'

const MIN_SIZE = 40
/** Inset from page body edges when clamping drag/resize; keep 0 for flush alignment. */
const POSITION_MARGIN = 0
/** Set to true to draw a dashed outline around the signature image (layout/debug). */
const SHOW_SIGNATURE_DEBUG_BORDER = false

/**
 * Vertical span where a floating signature may sit: full page break (white sheet), not only the
 * body text band.
 * - Top: page break + body layer + page 1 first header (margin / header strip above the body band).
 * - Bottom: page break + body layer + `.breaker` + this page’s footer region — the body layer alone
 *   often ends above the printable bottom (footer / bottom margin live in the breaker).
 */
function resolveSignatureVerticalExtent(
  editor: Editor | null,
  pageLayer: HTMLElement,
  pageNumber: number
): { top: number; bottom: number } {
  const lr = pageLayer.getBoundingClientRect()
  const pageBreak = pageLayer.closest('.rm-page-break') as HTMLElement | null
  if (!pageBreak) {
    return { top: lr.top, bottom: lr.bottom }
  }
  const pr = pageBreak.getBoundingClientRect()
  let top = Math.min(pr.top, lr.top)
  let bottom = Math.max(pr.bottom, lr.bottom)

  const breaker = pageBreak.querySelector('.breaker') as HTMLElement | null
  if (breaker) {
    const br = breaker.getBoundingClientRect()
    bottom = Math.max(bottom, br.bottom)
  }

  const footer =
    (pageBreak.querySelector(`.rm-page-footer-region[data-rm-page-number="${pageNumber}"]`) as HTMLElement | null) ??
    (pageBreak.querySelector('.rm-page-footer-region') as HTMLElement | null)
  if (footer) {
    bottom = Math.max(bottom, footer.getBoundingClientRect().bottom)
  }

  const nextHeader = pageBreak.querySelector(
    `.rm-page-header-region[data-rm-page-number="${pageNumber + 1}"]`
  ) as HTMLElement | null
  if (nextHeader) {
    bottom = Math.max(bottom, nextHeader.getBoundingClientRect().bottom)
  }

  if (pageNumber === 1 && editor?.view?.dom) {
    const fp = editor.view.dom.querySelector('.rm-first-page-header[data-rm-page-number="1"]') as HTMLElement | null
    if (fp) {
      const fr = fp.getBoundingClientRect()
      top = Math.min(top, fr.top)
      bottom = Math.max(bottom, fr.bottom)
    }
  }
  return { top, bottom }
}

/** x/y are in page-body-layer coordinates (origin = top-left of body layer). */
function clampSignaturePosition(
  x: number,
  y: number,
  lr: DOMRect,
  boxWidth: number,
  boxHeight: number,
  margin: number,
  editor: Editor | null,
  pageLayer: HTMLElement,
  pageNumber: number
): { x: number; y: number } {
  const maxX = lr.width - boxWidth - margin
  const { top: extentTop, bottom: extentBottom } = resolveSignatureVerticalExtent(editor, pageLayer, pageNumber)
  const minY = extentTop - lr.top + margin
  const maxY = extentBottom - lr.top - boxHeight - margin
  const safeMinY = Math.min(minY, maxY)
  const safeMaxY = Math.max(minY, maxY)
  return {
    x: Math.round(Math.max(margin, Math.min(maxX, x))),
    y: Math.round(Math.max(safeMinY, Math.min(safeMaxY, y)))
  }
}

function getPageBodyLayer(editor: Editor | null, pageNumber: number): HTMLElement | null {
  if (!editor?.view?.dom || !pageNumber) return null
  return editor.view.dom.querySelector(`.rm-page-body-layer[data-rm-page-number="${pageNumber}"]`) as HTMLElement | null
}

/**
 * Prefer the body layer whose vertical band overlaps the node wrapper. Stored `pageNumber` is often
 * wrong (e.g. active page state null → defaults to 1) while the node actually lives on another page;
 * using the wrong layer pushes the signature off-screen.
 */
function resolvePageBodyLayerForWrapper(
  editor: Editor | null,
  wrapper: HTMLElement | null,
  fallbackPageNumber: number
): HTMLElement | null {
  if (!editor?.view?.dom) return null
  const root = editor.view.dom
  const layers = root.querySelectorAll('.rm-page-body-layer[data-rm-page-number]')
  if (!wrapper || layers.length === 0) {
    return getPageBodyLayer(editor, fallbackPageNumber)
  }
  const wRect = wrapper.getBoundingClientRect()
  const anchorY = wRect.top + wRect.height / 2
  let best: HTMLElement | null = null
  let bestOverlap = -Infinity
  layers.forEach(el => {
    const lr = (el as HTMLElement).getBoundingClientRect()
    const overlap = Math.min(lr.bottom, wRect.bottom) - Math.max(lr.top, wRect.top)
    const containsAnchor = anchorY >= lr.top && anchorY <= lr.bottom
    const score = containsAnchor ? overlap + 1e6 : overlap
    if (score > bestOverlap) {
      bestOverlap = score
      best = el as HTMLElement
    }
  })
  if (best && bestOverlap > -Infinity) return best
  return getPageBodyLayer(editor, fallbackPageNumber)
}

function svgToDataUri(svg: string): string {
  if (!svg) return ''
  try {
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
  } catch {
    return ''
  }
}

export interface SignatureViewProps {
  node: {
    attrs: {
      signatureId?: string | null
      kind: string
      snapshotSvg: string
      name?: string | null
      width?: number
      height?: number
      lockAspectRatio?: boolean
      pageNumber?: number | null
      x?: number | null
      y?: number | null
      cropTop?: number
      cropRight?: number
      cropBottom?: number
      cropLeft?: number
      rotation?: number
    }
  }
  editor: Editor | null
  getPos: () => number | undefined
  selected: boolean
}

export function areSignatureRenderPositionsEqual(
  left: { left: number; top: number } | null,
  right: { left: number; top: number } | null
): boolean {
  if (left === right) {
    return true
  }

  if (!left || !right) {
    return false
  }

  return left.left === right.left && left.top === right.top
}

export function SignatureView({ node, editor, getPos, selected }: SignatureViewProps) {
  const { t } = useTranslation(translations)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const frameRef = useRef<HTMLDivElement | null>(null)
  const dragRotationRef = useRef<number | null>(null)
  const [dragSize, setDragSize] = React.useState<{ width: number; height: number } | null>(null)
  const [dragRotation, setDragRotation] = useState<number | null>(null)
  const [dragPosition, setDragPosition] = React.useState<{ x: number; y: number } | null>(null)
  const dragSizeRef = useRef<{ width: number; height: number } | null>(null)
  const dragPositionRef = useRef<{ x: number; y: number } | null>(null)
  const [signatureUiMode, setSignatureUiMode] = useState<'default' | 'crop'>('default')
  const [cropPreview, setCropPreview] = useState<NormalizedImageCrop | null>(null)
  const cropPreviewRef = useRef<NormalizedImageCrop | null>(null)

  const nodePos = getPos()
  const liveDocAttrs = useEditorState({
    editor,
    selector: ({ editor: ed }) => {
      if (!ed || nodePos == null) return null
      const n = ed.state.doc.nodeAt(nodePos)
      if (n?.type.name !== 'signature') return null
      return n.attrs
    }
  })
  const attrs = liveDocAttrs ?? node.attrs

  const attrsWidth = attrs.width ?? 200
  const attrsHeight = attrs.height ?? 80
  const attrsRotation = attrs.rotation ?? 0
  const displayWidth = dragSize?.width ?? attrsWidth
  const displayHeight = dragSize?.height ?? attrsHeight
  const effectiveRotation = dragRotation ?? attrsRotation
  const attrsX = attrs.x
  const attrsY = attrs.y
  const pageNumber = Math.max(1, attrs.pageNumber ?? 1)
  const isFloating = typeof attrsX === 'number' && typeof attrsY === 'number'
  const src = useMemo(() => svgToDataUri(attrs.snapshotSvg ?? ''), [attrs.snapshotSvg])

  const isCropMode = selected && signatureUiMode === 'crop'

  const effectiveCrop = useMemo(() => {
    if (cropPreview) return cropPreview
    return normalizeImageCrop({
      cropTop: attrs.cropTop ?? 0,
      cropRight: attrs.cropRight ?? 0,
      cropBottom: attrs.cropBottom ?? 0,
      cropLeft: attrs.cropLeft ?? 0
    })
  }, [cropPreview, attrs.cropTop, attrs.cropRight, attrs.cropBottom, attrs.cropLeft])

  const cropLayout = useMemo(() => {
    const hasCropPreviewOrCommitted =
      effectiveCrop.top > 0 || effectiveCrop.right > 0 || effectiveCrop.bottom > 0 || effectiveCrop.left > 0
    if (!hasCropPreviewOrCommitted) {
      const intrinsic = parseSvgIntrinsicSizeFromMarkup(attrs.snapshotSvg ?? '')
      if (intrinsic) {
        const fit = computeSignatureUniformContainLayout(displayWidth, displayHeight, intrinsic.width, intrinsic.height)
        return {
          visibleWidthRatio: 1,
          visibleHeightRatio: 1,
          renderedWidth: fit.renderedWidth,
          renderedHeight: fit.renderedHeight,
          offsetX: fit.offsetX,
          offsetY: fit.offsetY
        }
      }
    }
    return resolveImageCropDimensions({
      width: displayWidth,
      height: displayHeight,
      crop: effectiveCrop
    })
  }, [attrs.snapshotSvg, displayHeight, displayWidth, effectiveCrop])

  useEffect(() => {
    cropPreviewRef.current = cropPreview
  }, [cropPreview])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<DocumentSignatureUiEventDetail>).detail
      const nodePos = getPos()
      if (detail.pos == null || nodePos === undefined || detail.pos !== nodePos) return
      setSignatureUiMode(detail.mode)
      if (detail.mode === 'default') {
        const pending = cropPreviewRef.current
        if (pending != null && editor) {
          editor
            .chain()
            .focus()
            .setNodeSelection(nodePos)
            .updateAttributes('signature', {
              cropTop: pending.top,
              cropRight: pending.right,
              cropBottom: pending.bottom,
              cropLeft: pending.left
            })
            .run()
          editor.commands.refreshPagesAndStabilize?.()
        }
        setCropPreview(null)
        cropPreviewRef.current = null

        if (editor) {
          const n = editor.state.doc.nodeAt(nodePos)
          if (n?.type.name === 'signature') {
            const a = n.attrs
            const crop = normalizeImageCrop({
              cropTop: a.cropTop,
              cropRight: a.cropRight,
              cropBottom: a.cropBottom,
              cropLeft: a.cropLeft
            })
            if (hasImageCrop(a)) {
              const baked = buildBakedSignatureAttrsAfterCrop(a.width ?? 200, a.height ?? 80, a.snapshotSvg ?? '', crop)
              if (baked != null) {
                editor.chain().focus().setNodeSelection(nodePos).updateAttributes('signature', baked).run()
                editor.commands.refreshPagesAndStabilize?.()
              }
            }
          }
        }
      }
    }
    globalThis.addEventListener(DOCUMENT_SIGNATURE_UI_EVENT, handler)
    return () => globalThis.removeEventListener(DOCUMENT_SIGNATURE_UI_EVENT, handler)
  }, [editor, getPos])

  useEffect(() => {
    if (!selected) {
      setSignatureUiMode('default')
      setCropPreview(null)
    }
  }, [selected])

  const onPositionDragMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isCropMode) return
      if ((e.target as HTMLElement).closest('[data-signature-handle="true"]')) return
      if (e.button !== 0 || !editor || getPos() === undefined) return
      const img = imgRef.current
      if (!img) return
      e.preventDefault()
      const imgRect = img.getBoundingClientRect()
      const grabOffsetX = e.clientX - imgRect.left
      const grabOffsetY = e.clientY - imgRect.top
      const wrapperEl = contentRef.current?.parentElement ?? null
      const pageLayer = resolvePageBodyLayerForWrapper(editor, wrapperEl, pageNumber)
      const layerRect = pageLayer?.getBoundingClientRect()
      let startX = layerRect ? e.clientX - grabOffsetX - layerRect.left : typeof attrsX === 'number' ? attrsX : 0
      let startY = layerRect ? e.clientY - grabOffsetY - layerRect.top : typeof attrsY === 'number' ? attrsY : 0
      if (layerRect && pageLayer) {
        const c = clampSignaturePosition(
          startX,
          startY,
          layerRect,
          displayWidth,
          displayHeight,
          POSITION_MARGIN,
          editor,
          pageLayer,
          pageNumber
        )
        startX = c.x
        startY = c.y
      }
      setDragPosition({ x: startX, y: startY })
      dragPositionRef.current = { x: startX, y: startY }

      const onMove = (e: MouseEvent) => {
        const layer = resolvePageBodyLayerForWrapper(editor, contentRef.current?.parentElement ?? null, pageNumber)
        const lr = layer?.getBoundingClientRect()
        if (!lr || !layer) return
        const newX = e.clientX - grabOffsetX - lr.left
        const newY = e.clientY - grabOffsetY - lr.top
        const next = clampSignaturePosition(
          newX,
          newY,
          lr,
          displayWidth,
          displayHeight,
          POSITION_MARGIN,
          editor,
          layer,
          pageNumber
        )
        dragPositionRef.current = next
        setDragPosition(next)
      }
      const onUp = () => {
        globalThis.removeEventListener('mousemove', onMove)
        globalThis.removeEventListener('mouseup', onUp)
        const final = dragPositionRef.current
        setDragPosition(null)
        dragPositionRef.current = null
        if (final != null && getPos() !== undefined) {
          const layerAfter = resolvePageBodyLayerForWrapper(
            editor,
            contentRef.current?.parentElement ?? null,
            pageNumber
          )
          const resolvedPage = layerAfter?.dataset.rmPageNumber ? parseInt(layerAfter.dataset.rmPageNumber, 10) : null
          const attrs: Record<string, number> = { x: final.x, y: final.y }
          if (resolvedPage != null && !Number.isNaN(resolvedPage)) {
            attrs.pageNumber = resolvedPage
          }
          editor.chain().setNodeSelection(getPos()!).updateAttributes('signature', attrs).run()
        }
      }
      globalThis.addEventListener('mousemove', onMove)
      globalThis.addEventListener('mouseup', onUp)
    },
    [editor, getPos, pageNumber, attrsX, attrsY, displayWidth, displayHeight, isCropMode]
  )

  const startResizeInteraction = useCallback(
    (direction: SignatureResizeDirection, e: React.MouseEvent) => {
      if (isCropMode) return
      e.preventDefault()
      e.stopPropagation()
      if (!editor || getPos() === undefined) return
      const startX = e.clientX
      const startY = e.clientY
      const startW = displayWidth
      const startH = displayHeight
      const lock = attrs.lockAspectRatio !== false
      const aspectRatio = startH > 0 ? startW / startH : null
      const includesWest = direction.includes('w')
      const includesEast = direction.includes('e')
      const includesNorth = direction.includes('n')
      const includesSouth = direction.includes('s')
      const curX = typeof attrsX === 'number' ? attrsX : 0
      const curY = typeof attrsY === 'number' ? attrsY : 0

      setDragSize({ width: startW, height: startH })
      dragSizeRef.current = { width: startW, height: startH }

      const onMove = (moveEvent: MouseEvent) => {
        const dx = moveEvent.clientX - startX
        const dy = moveEvent.clientY - startY
        let width = startW + (includesEast ? dx : 0) - (includesWest ? dx : 0)
        let height = startH + (includesSouth ? dy : 0) - (includesNorth ? dy : 0)
        width = Math.max(MIN_SIZE, Math.round(width))
        height = Math.max(MIN_SIZE, Math.round(height))

        if (lock && aspectRatio) {
          if ((includesEast || includesWest) && (includesNorth || includesSouth)) {
            const widthScale = width / startW
            const heightScale = height / startH
            const scale = Math.max(widthScale, heightScale)
            width = Math.max(MIN_SIZE, Math.round(startW * scale))
            height = Math.max(MIN_SIZE, Math.round(startH * scale))
          } else if (includesEast || includesWest) {
            height = Math.max(MIN_SIZE, Math.round(width / aspectRatio))
          } else if (includesNorth || includesSouth) {
            width = Math.max(MIN_SIZE, Math.round(height * aspectRatio))
          }
        }

        const pageLayer = resolvePageBodyLayerForWrapper(editor, contentRef.current?.parentElement ?? null, pageNumber)
        const lr = pageLayer?.getBoundingClientRect()
        const maxW = lr ? Math.max(MIN_SIZE, lr.width - curX - POSITION_MARGIN) : undefined
        const maxH =
          lr && pageLayer
            ? Math.max(
                MIN_SIZE,
                resolveSignatureVerticalExtent(editor, pageLayer, pageNumber).bottom - lr.top - curY - POSITION_MARGIN
              )
            : undefined
        if (maxW != null) width = Math.min(width, maxW)
        if (maxH != null) height = Math.min(height, maxH)

        const next = { width, height }
        setDragSize(next)
        dragSizeRef.current = next
      }

      const onUp = () => {
        globalThis.removeEventListener('mousemove', onMove)
        globalThis.removeEventListener('mouseup', onUp)
        const final = dragSizeRef.current ?? { width: startW, height: startH }
        setDragSize(null)
        dragSizeRef.current = null
        if (getPos() === undefined) return
        editor
          .chain()
          .setNodeSelection(getPos()!)
          .updateAttributes('signature', {
            width: Math.max(MIN_SIZE, Math.round(final.width)),
            height: Math.max(MIN_SIZE, Math.round(final.height))
          })
          .run()
      }

      globalThis.addEventListener('mousemove', onMove)
      globalThis.addEventListener('mouseup', onUp)
    },
    [displayHeight, displayWidth, editor, getPos, attrsX, attrsY, isCropMode, attrs.lockAspectRatio, pageNumber]
  )

  const startRotateInteraction = useCallback(
    (e: React.MouseEvent) => {
      if (isCropMode) return
      e.preventDefault()
      e.stopPropagation()
      const frame = frameRef.current
      if (!frame || !editor || getPos() === undefined) return
      const rect = frame.getBoundingClientRect()
      const startAngle = getPointerAngleFromRect(e.clientX, e.clientY, rect)
      const startRotation = attrsRotation

      const onMove = (moveEvent: MouseEvent) => {
        const r = frame.getBoundingClientRect()
        const currentAngle = getPointerAngleFromRect(moveEvent.clientX, moveEvent.clientY, r)
        const next = clampSignatureRotation(startRotation + currentAngle - startAngle)
        dragRotationRef.current = next
        setDragRotation(next)
      }

      const onUp = () => {
        globalThis.removeEventListener('mousemove', onMove)
        globalThis.removeEventListener('mouseup', onUp)
        const final = dragRotationRef.current
        dragRotationRef.current = null
        setDragRotation(null)
        if (final == null || getPos() === undefined) return
        editor.chain().setNodeSelection(getPos()!).updateAttributes('signature', { rotation: final }).run()
      }

      globalThis.addEventListener('mousemove', onMove)
      globalThis.addEventListener('mouseup', onUp)
    },
    [attrsRotation, editor, getPos, isCropMode]
  )

  const handleCropPreview = useCallback((next: NormalizedImageCrop) => {
    setCropPreview(next)
  }, [])

  const handleCropCommit = useCallback(
    (c: NormalizedImageCrop) => {
      setCropPreview(null)
      cropPreviewRef.current = null
      const nodePos = getPos()
      if (nodePos === undefined || !editor) return
      editor
        .chain()
        .focus()
        .setNodeSelection(nodePos)
        .updateAttributes('signature', {
          cropTop: c.top,
          cropRight: c.right,
          cropBottom: c.bottom,
          cropLeft: c.left
        })
        .run()
      editor.commands.refreshPagesAndStabilize?.()
    },
    [editor, getPos]
  )

  const posPageLocal = dragPosition ?? (isFloating ? { x: attrsX as number, y: attrsY as number } : null)
  const [renderPos, setRenderPos] = useState<{ left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    if (!posPageLocal) {
      setRenderPos(previousRenderPos => (previousRenderPos === null ? previousRenderPos : null))
      return
    }
    const wrapper = contentRef.current?.parentElement ?? null
    const pageLayer = resolvePageBodyLayerForWrapper(editor, wrapper, pageNumber)
    if (!wrapper || !pageLayer) {
      setRenderPos(previousRenderPos => (previousRenderPos === null ? previousRenderPos : null))
      return
    }
    const wr = wrapper.getBoundingClientRect()
    const lr = pageLayer.getBoundingClientRect()
    const clamped = clampSignaturePosition(
      posPageLocal.x,
      posPageLocal.y,
      lr,
      displayWidth,
      displayHeight,
      POSITION_MARGIN,
      editor,
      pageLayer,
      pageNumber
    )
    const nextRenderPos = {
      left: lr.left + clamped.x - wr.left,
      top: lr.top + clamped.y - wr.top
    }
    setRenderPos(previousRenderPos =>
      areSignatureRenderPositionsEqual(previousRenderPos, nextRenderPos) ? previousRenderPos : nextRenderPos
    )
  }, [editor, pageNumber, posPageLocal?.x, posPageLocal?.y, isFloating, dragPosition, displayWidth, displayHeight])

  useEffect(() => {
    if (!posPageLocal || dragPosition !== null || !isFloating || !editor) return
    const pos = getPos()
    if (pos === undefined) return
    const wrapper = contentRef.current?.parentElement ?? null
    const pageLayer =
      resolvePageBodyLayerForWrapper(editor, wrapper, pageNumber) ?? getPageBodyLayer(editor, pageNumber)
    if (!pageLayer) return
    const lr = pageLayer.getBoundingClientRect()
    const clamped = clampSignaturePosition(
      posPageLocal.x,
      posPageLocal.y,
      lr,
      displayWidth,
      displayHeight,
      POSITION_MARGIN,
      editor,
      pageLayer,
      pageNumber
    )
    if (clamped.x === posPageLocal.x && clamped.y === posPageLocal.y) return
    editor.chain().setNodeSelection(pos).updateAttributes('signature', clamped).run()
  }, [
    editor,
    getPos,
    isFloating,
    dragPosition,
    attrsX,
    attrsY,
    pageNumber,
    displayWidth,
    displayHeight,
    posPageLocal?.x,
    posPageLocal?.y
  ])

  const pos = posPageLocal

  if (!src) {
    return (
      <NodeViewWrapper as="span" className="gba:inline-block gba:align-middle">
        <span
          className="gba:inline-flex gba:items-center gba:justify-center gba:min-h-[60px] gba:min-w-[120px] gba:rounded gba:bg-muted gba:text-muted-foreground gba:text-sm"
          data-testid="document-editor-signature-broken"
        >
          Signature
        </span>
      </NodeViewWrapper>
    )
  }

  const isDragging = dragPosition !== null
  // Keep wrapper zero-size whenever floating so selecting/dragging doesn't push content down
  const useFloatingLayout = isFloating
  const wrapperClass = useFloatingLayout
    ? 'gba:relative gba:inline-block gba:overflow-visible'
    : isDragging
      ? 'gba:relative gba:inline-block gba:overflow-visible'
      : 'gba:inline-block gba:align-middle gba:relative gba:inline-flex gba:my-3'
  const wrapperStyle = useFloatingLayout
    ? {
        width: 0,
        height: 0,
        minWidth: 0,
        minHeight: 0,
        padding: 0,
        border: 0,
        overflow: 'visible' as const
      }
    : isDragging
      ? { width: displayWidth, height: displayHeight, minWidth: displayWidth, minHeight: displayHeight }
      : undefined
  const innerStyle =
    pos && renderPos != null
      ? {
          position: 'absolute' as const,
          left: renderPos.left,
          top: renderPos.top,
          width: displayWidth,
          height: displayHeight,
          minWidth: displayWidth,
          minHeight: displayHeight,
          // Above .breaker (z-index 2) so the float is not covered by page chrome / gaps
          zIndex: isCropMode ? 40 : 12
        }
      : undefined

  return (
    <NodeViewWrapper
      as="div"
      className={`${wrapperClass}${useFloatingLayout ? ' signature-float-anchor' : ''}`}
      style={wrapperStyle}
      data-floating={useFloatingLayout ? 'true' : undefined}
    >
      <div ref={contentRef} className="gba:inline-flex gba:relative" style={innerStyle}>
        <div
          ref={frameRef}
          className={`gba:relative gba:inline-flex gba:max-w-full ${isCropMode ? 'gba:z-30' : ''}`}
          style={{
            width: displayWidth,
            height: displayHeight,
            transform: effectiveRotation !== 0 ? `rotate(${effectiveRotation}deg)` : undefined,
            transformOrigin: 'center center'
          }}
        >
          <div
            className={
              isCropMode
                ? 'gba:relative gba:overflow-hidden gba:rounded-md gba:box-border gba:border gba:border-border gba:shadow-sm gba:bg-background'
                : 'gba:relative gba:overflow-hidden gba:box-border gba:bg-transparent'
            }
            style={{ width: '100%', height: '100%' }}
          >
            <img
              ref={imgRef}
              src={src}
              alt={attrs.name || 'Signature'}
              className={`gba:block gba:max-w-none gba:box-border ${
                isCropMode ? 'gba:cursor-default' : 'gba:cursor-move'
              } ${SHOW_SIGNATURE_DEBUG_BORDER ? 'gba:border gba:border-dashed gba:border-primary/50' : ''}`}
              style={{
                position: 'absolute',
                left: cropLayout.offsetX,
                top: cropLayout.offsetY,
                width: cropLayout.renderedWidth,
                height: cropLayout.renderedHeight
              }}
              contentEditable={false}
              draggable={false}
              onMouseDown={onPositionDragMouseDown}
              data-testid="document-editor-signature"
            />
            {isCropMode ? (
              <SignatureCropOverlay
                frameWidth={displayWidth}
                frameHeight={displayHeight}
                crop={effectiveCrop}
                onCropPreview={handleCropPreview}
                onCropCommit={handleCropCommit}
                hintText={t('signature-crop-overlay-hint')}
              />
            ) : null}
          </div>
          {selected && !isCropMode ? (
            <SignatureSelectionChrome
              rotateAriaLabel={t('signature-rotate-handle-aria')}
              onResizeMouseDown={startResizeInteraction}
              onRotateMouseDown={startRotateInteraction}
              data-testid="document-editor-signature-chrome"
            />
          ) : null}
        </div>
      </div>
    </NodeViewWrapper>
  )
}
