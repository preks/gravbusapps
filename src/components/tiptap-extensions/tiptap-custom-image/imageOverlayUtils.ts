import type { CSSProperties } from 'react'
import { normalizeImageAlign, normalizeImageAnchorMode } from './styleUtils'
import type { CustomImageAttributes } from './types'
import type { WordLikeImageLayout } from './wrapLayoutEngine'

const IMAGE_BLOCK_ANCHOR_SELECTOR = 'p, li, blockquote, pre, h1, h2, h3, h4, h5, h6, td, th'

export type ImageOverlayLayerMode = 'behind' | 'floating' | 'front'

export interface ImageOverlayMount {
  layer: HTMLElement
  pageNumber: number
  anchorLeft: number
  anchorTop: number
  anchorWidth: number
  anchorHeight: number
  /** Wrapper left relative to the overlay layer — reflects CSS float position */
  anchorLeftInLayer: number
  /** Wrapper top relative to the overlay layer — reflects CSS float position */
  anchorTopInLayer: number
  /** Paragraph (or block) left relative to the overlay layer — for square pseudo-float positioning */
  blockLeftInLayer: number
  /** Paragraph (or block) top relative to the overlay layer — for square pseudo-float positioning */
  blockTopInLayer: number
  /** Paragraph (or block) top relative to the page body layer — used for Word-like move-with-text vertical placement */
  blockTop: number
  /** Paragraph (or block) origin relative to the page body layer — used for square wrap horizontal placement */
  blockLeft: number
  /** Paragraph (or block) width — used for square-right / square-left margin alignment */
  blockWidth: number
  /** Real node-view wrapper offset inside the containing paragraph/block */
  wrapperOffsetLeft: number
  /** Real node-view wrapper offset inside the containing paragraph/block */
  wrapperOffsetTop: number
}

interface ResolvedImagePageMountMetrics {
  pageBodyLayer: HTMLElement
  pageNumber: number
  anchorLeft: number
  anchorTop: number
  anchorWidth: number
  anchorHeight: number
  blockTop: number
  blockLeft: number
  blockWidth: number
  wrapperOffsetLeft: number
  wrapperOffsetTop: number
}

interface EditorRelativeRect {
  left: number
  right: number
  top: number
  bottom: number
  width: number
  height: number
}

function toEditorRelativeRect(editorElement: HTMLElement, rect: DOMRect | EditorRelativeRect): EditorRelativeRect {
  const editorRect = editorElement.getBoundingClientRect()
  const scrollLeft = editorElement.scrollLeft ?? 0
  return {
    left: rect.left - editorRect.left + scrollLeft,
    right: rect.right - editorRect.left + scrollLeft,
    top: rect.top - editorRect.top + editorElement.scrollTop,
    bottom: rect.bottom - editorRect.top + editorElement.scrollTop,
    width: rect.right - rect.left,
    height: rect.bottom - rect.top
  }
}

function resolvePageSegmentReferenceRect(editorElement: HTMLElement, pageNumber: number): EditorRelativeRect | null {
  const spacers = Array.from(
    editorElement.querySelectorAll<HTMLElement>('.rm-page-spacer[data-rm-page-range-start][data-rm-page-range-end]')
  )

  for (const spacer of spacers) {
    const startPage = Number(spacer.dataset.rmPageRangeStart ?? '')
    const endPage = Number(spacer.dataset.rmPageRangeEnd ?? '')
    if (!Number.isInteger(startPage) || !Number.isInteger(endPage) || startPage < 1 || endPage < startPage) {
      continue
    }
    if (pageNumber < startPage || pageNumber > endPage) {
      continue
    }

    const encodedHeights = spacer.dataset.rmPageSegmentHeights?.trim()
    if (!encodedHeights) {
      continue
    }

    const pageHeights = encodedHeights
      .split(',')
      .map(value => Number.parseFloat(value))
      .filter(height => Number.isFinite(height) && height > 0)
    const pageCount = endPage - startPage + 1
    if (pageHeights.length !== pageCount) {
      continue
    }

    const spacerRect = toEditorRelativeRect(editorElement, spacer.getBoundingClientRect())
    const pageIndex = pageNumber - startPage
    const top = spacerRect.top + pageHeights.slice(0, pageIndex).reduce((total, height) => total + height, 0)
    const height = pageHeights[pageIndex]
    return {
      left: spacerRect.left,
      right: spacerRect.right,
      top,
      bottom: top + height,
      width: spacerRect.width,
      height
    }
  }

  return null
}

function resolveOverlayLayerMode(
  layout: Pick<WordLikeImageLayout, 'renderMode' | 'overlayLayer'>
): ImageOverlayLayerMode | null {
  if (layout.renderMode !== 'overlay') {
    return null
  }

  return layout.overlayLayer
}

function resolveHorizontalAnchorStyle(
  align: NonNullable<CustomImageAttributes['align']>,
  offsetX: number,
  distanceLeft: number,
  distanceRight: number
): CSSProperties {
  if (align === 'center') {
    return {
      left: `calc(50% + ${offsetX}px)`,
      transform: 'translateX(-50%)'
    }
  }

  if (align === 'right') {
    return {
      right: `${distanceRight - offsetX}px`
    }
  }

  return {
    left: `${distanceLeft + offsetX}px`
  }
}

function resolveParagraphAnchoredOverlayStyle(params: {
  align: NonNullable<CustomImageAttributes['align']>
  frameWidth: number
  offsetX: number
  offsetY: number
  distanceLeft: number
  distanceRight: number
  mount: Pick<ImageOverlayMount, 'blockLeftInLayer' | 'blockTopInLayer' | 'blockWidth'>
}): CSSProperties {
  const { align, frameWidth, offsetX, offsetY, distanceLeft, distanceRight, mount } = params

  if (align === 'center') {
    return {
      left: mount.blockLeftInLayer + mount.blockWidth / 2 + offsetX,
      top: mount.blockTopInLayer + offsetY,
      transform: 'translateX(-50%)'
    }
  }

  if (align === 'right') {
    return {
      left: mount.blockLeftInLayer + mount.blockWidth - frameWidth - distanceRight + offsetX,
      top: mount.blockTopInLayer + offsetY
    }
  }

  return {
    left: mount.blockLeftInLayer + distanceLeft + offsetX,
    top: mount.blockTopInLayer + offsetY
  }
}

export function resolveImageOverlayMount(params: {
  editorElement: HTMLElement
  anchorElement: HTMLElement
  wrapperElement?: HTMLElement | null
  layout: Pick<WordLikeImageLayout, 'renderMode' | 'overlayLayer'>
}): ImageOverlayMount | null {
  const layerMode = resolveOverlayLayerMode(params.layout)
  if (!layerMode) {
    return null
  }

  const mountMetrics = resolveImagePageMountMetrics({
    editorElement: params.editorElement,
    anchorElement: params.anchorElement
  })
  if (!mountMetrics) {
    return null
  }

  const layer = params.editorElement.querySelector<HTMLElement>(
    `.rm-page-image-overlay-layer[data-rm-page-number="${mountMetrics.pageNumber}"][data-rm-image-layer="${layerMode}"]`
  )

  if (!(layer instanceof HTMLElement)) {
    return null
  }

  const wrapperForLayerPosition = params.wrapperElement ?? params.anchorElement
  const wrapperRect = wrapperForLayerPosition.getBoundingClientRect()
  const anchorRect = params.anchorElement.getBoundingClientRect()
  const layerRect = layer.getBoundingClientRect()

  return {
    layer,
    pageNumber: mountMetrics.pageNumber,
    anchorLeft: mountMetrics.anchorLeft,
    anchorTop: mountMetrics.anchorTop,
    anchorWidth: mountMetrics.anchorWidth,
    anchorHeight: mountMetrics.anchorHeight,
    anchorLeftInLayer: wrapperRect.left - layerRect.left,
    anchorTopInLayer: wrapperRect.top - layerRect.top,
    blockLeftInLayer: anchorRect.left - layerRect.left,
    blockTopInLayer: anchorRect.top - layerRect.top,
    blockTop: mountMetrics.blockTop,
    blockLeft: mountMetrics.blockLeft,
    blockWidth: mountMetrics.blockWidth,
    wrapperOffsetLeft: mountMetrics.wrapperOffsetLeft,
    wrapperOffsetTop: mountMetrics.wrapperOffsetTop
  }
}

function resolveImagePageMountMetrics(params: {
  editorElement: HTMLElement
  anchorElement: HTMLElement
  wrapperElement?: HTMLElement | null
}): ResolvedImagePageMountMetrics | null {
  const anchorRect = params.anchorElement.getBoundingClientRect()
  const anchorRectInEditor = toEditorRelativeRect(params.editorElement, anchorRect)
  const anchorTopInEditor = anchorRectInEditor.top
  const pageBodyLayers = Array.from(
    params.editorElement.querySelectorAll<HTMLElement>('.rm-page-body-layer[data-rm-page-number]')
  )

  if (pageBodyLayers.length === 0) {
    return null
  }

  // Use the anchor origin rather than the midpoint so paragraph-anchored overlays stay on the
  // paragraph's page even when the paragraph spans a large vertical range.
  const anchorProbeY = anchorTopInEditor
  let bestLayer: { element: HTMLElement; pageNumber: number; distance: number } | null = null

  for (const element of pageBodyLayers) {
    const pageNumber = Number(element.dataset.rmPageNumber ?? '')
    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
      continue
    }

    const rectInEditor = toEditorRelativeRect(params.editorElement, element.getBoundingClientRect())
    const top = rectInEditor.top
    const bottom = rectInEditor.bottom
    const distance = anchorProbeY < top ? top - anchorProbeY : anchorProbeY > bottom ? anchorProbeY - bottom : 0

    if (
      bestLayer == null ||
      distance < bestLayer.distance ||
      (distance === bestLayer.distance && pageNumber < bestLayer.pageNumber)
    ) {
      bestLayer = { element, pageNumber, distance }
    }
  }

  if (!bestLayer) {
    return null
  }

  const bodyRectInEditor = toEditorRelativeRect(params.editorElement, bestLayer.element.getBoundingClientRect())
  const pageReferenceRectInEditor =
    resolvePageSegmentReferenceRect(params.editorElement, bestLayer.pageNumber) ?? bodyRectInEditor
  const blockEl = params.anchorElement.closest(IMAGE_BLOCK_ANCHOR_SELECTOR)
  const blockRect = blockEl?.getBoundingClientRect()
  const wrapperRect = params.wrapperElement?.getBoundingClientRect()
  const wrapperOffsetLeft = blockRect && wrapperRect ? wrapperRect.left - blockRect.left : 0
  const wrapperOffsetTop = blockRect && wrapperRect ? wrapperRect.top - blockRect.top : 0
  const blockRectInEditor = blockRect ? toEditorRelativeRect(params.editorElement, blockRect) : anchorRectInEditor

  return {
    pageBodyLayer: bestLayer.element,
    pageNumber: bestLayer.pageNumber,
    anchorLeft: anchorRectInEditor.left - pageReferenceRectInEditor.left,
    anchorTop: anchorRectInEditor.top - pageReferenceRectInEditor.top,
    anchorWidth: anchorRect.width,
    anchorHeight: anchorRect.height,
    blockTop: blockRectInEditor.top - pageReferenceRectInEditor.top,
    blockLeft: blockRectInEditor.left - pageReferenceRectInEditor.left,
    blockWidth: blockRectInEditor.width,
    wrapperOffsetLeft,
    wrapperOffsetTop
  }
}

function resolveOverlayFigurePointerEvents(
  wrapMode: NonNullable<WordLikeImageLayout['wrapMode']>
): CSSProperties['pointerEvents'] {
  return wrapMode === 'behind' ? 'none' : 'auto'
}

function resolveOverlayFigureZIndex(
  wrapMode: NonNullable<WordLikeImageLayout['wrapMode']>,
  attributeZIndex: number | null | undefined
): number {
  if (wrapMode === 'behind') {
    return 0
  }

  return Math.max(1, attributeZIndex ?? 1)
}

function resolveSquareFlowShimLeft(params: {
  layout: Pick<WordLikeImageLayout, 'floatingSide' | 'figureLeft' | 'layoutWidth'>
  mount: Pick<ImageOverlayMount, 'blockLeftInLayer' | 'blockWidth'>
}): number {
  const { floatingSide, figureLeft, layoutWidth } = params.layout
  const { blockLeftInLayer, blockWidth } = params.mount

  if (floatingSide === 'right') {
    return blockLeftInLayer + blockWidth - layoutWidth + figureLeft
  }

  return blockLeftInLayer + figureLeft
}

function resolveFlowOverlayFigureStyle(params: {
  layout: Pick<
    WordLikeImageLayout,
    'align' | 'figureLeft' | 'figureTop' | 'frameWidth' | 'wrapMode' | 'layoutWidth' | 'floatingSide'
  >
  attributes: CustomImageAttributes
  mount: ImageOverlayMount
}): CSSProperties {
  const wrapMode = params.layout.wrapMode

  const left =
    wrapMode === 'square'
      ? resolveSquareFlowShimLeft({ layout: params.layout, mount: params.mount })
      : params.mount.anchorLeft + params.layout.figureLeft
  const top =
    wrapMode === 'square'
      ? params.mount.blockTopInLayer + params.layout.figureTop
      : params.mount.blockTop + params.layout.figureTop

  return {
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    width: params.layout.frameWidth,
    maxWidth: '100%',
    textAlign: params.layout.align,
    position: 'absolute',
    left,
    top,
    zIndex: resolveOverlayFigureZIndex(wrapMode, params.attributes.zIndex),
    pointerEvents: resolveOverlayFigurePointerEvents(wrapMode)
  }
}

export function resolveImageOverlayFigureStyle(params: {
  layout: Pick<
    WordLikeImageLayout,
    | 'wrapMode'
    | 'align'
    | 'anchorMode'
    | 'frameWidth'
    | 'figureLeft'
    | 'figureTop'
    | 'flowMode'
    | 'layoutWidth'
    | 'floatingSide'
  >
  attributes: CustomImageAttributes
  mount: ImageOverlayMount
}): CSSProperties {
  const wrapMode = params.layout.wrapMode

  if (params.layout.flowMode === 'float' && params.layout.anchorMode !== 'fixed') {
    return resolveFlowOverlayFigureStyle({
      layout: params.layout,
      attributes: params.attributes,
      mount: params.mount
    })
  }

  const align = normalizeImageAlign(params.attributes.align, params.layout.align)
  const anchorMode = normalizeImageAnchorMode(params.attributes.anchorMode, params.layout.anchorMode)
  const offsetX = params.attributes.offsetX ?? 0
  const offsetY = params.attributes.offsetY ?? 0
  const distanceLeft = params.attributes.distanceLeft ?? 0
  const distanceRight = params.attributes.distanceRight ?? 0
  const isParagraphAnchoredOverlay = params.layout.flowMode === 'overlay-anchor' && anchorMode !== 'fixed'

  return {
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    width: params.layout.frameWidth,
    maxWidth: '100%',
    textAlign: align,
    position: 'absolute',
    zIndex: resolveOverlayFigureZIndex(wrapMode, params.attributes.zIndex),
    pointerEvents: resolveOverlayFigurePointerEvents(wrapMode),
    ...(isParagraphAnchoredOverlay
      ? resolveParagraphAnchoredOverlayStyle({
          align,
          frameWidth: params.layout.frameWidth,
          offsetX,
          offsetY,
          distanceLeft,
          distanceRight,
          mount: params.mount
        })
      : {
          top: anchorMode === 'fixed' ? offsetY : params.mount.anchorTop + offsetY,
          ...resolveHorizontalAnchorStyle(align, offsetX, distanceLeft, distanceRight)
        })
  }
}
