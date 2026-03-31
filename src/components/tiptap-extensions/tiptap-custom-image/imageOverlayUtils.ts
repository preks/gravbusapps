import type { CSSProperties } from 'react'
import { normalizeImageAlign, normalizeImageAnchorMode } from './styleUtils'
import type { CustomImageAttributes } from './types'
import type { WordLikeImageLayout } from './wrapLayoutEngine'

export type ImageOverlayLayerMode = 'behind' | 'floating' | 'front'

export interface ImageOverlayMount {
  layer: HTMLElement
  pageNumber: number
  anchorLeft: number
  anchorTop: number
  anchorWidth: number
  anchorHeight: number
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

export function resolveImageOverlayMount(params: {
  editorElement: HTMLElement
  anchorElement: HTMLElement
  layout: Pick<WordLikeImageLayout, 'renderMode' | 'overlayLayer'>
}): ImageOverlayMount | null {
  const layerMode = resolveOverlayLayerMode(params.layout)
  if (!layerMode) {
    return null
  }

  const editorRect = params.editorElement.getBoundingClientRect()
  const anchorRect = params.anchorElement.getBoundingClientRect()
  const anchorTopInEditor = anchorRect.top - editorRect.top + params.editorElement.scrollTop
  const pageBodyLayers = Array.from(
    params.editorElement.querySelectorAll<HTMLElement>('.rm-page-body-layer[data-rm-page-number]')
  )

  if (pageBodyLayers.length === 0) {
    return null
  }

  const anchorProbeY = anchorTopInEditor + Math.max(0, anchorRect.height / 2)
  let bestLayer: { element: HTMLElement; pageNumber: number; distance: number; top: number; bottom: number } | null =
    null

  pageBodyLayers.forEach(element => {
    const pageNumber = Number(element.dataset.rmPageNumber ?? '')
    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
      return
    }

    const rect = element.getBoundingClientRect()
    const top = rect.top - editorRect.top + params.editorElement.scrollTop
    const bottom = rect.bottom - editorRect.top + params.editorElement.scrollTop
    const distance = anchorProbeY < top ? top - anchorProbeY : anchorProbeY > bottom ? anchorProbeY - bottom : 0

    if (
      bestLayer == null ||
      distance < bestLayer.distance ||
      (distance === bestLayer.distance && pageNumber < bestLayer.pageNumber)
    ) {
      bestLayer = { element, pageNumber, distance, top, bottom }
    }
  })

  if (!bestLayer) {
    return null
  }

  const layer = params.editorElement.querySelector<HTMLElement>(
    `.rm-page-image-overlay-layer[data-rm-page-number="${bestLayer.pageNumber}"][data-rm-image-layer="${layerMode}"]`
  )

  if (!(layer instanceof HTMLElement)) {
    return null
  }

  return {
    layer,
    pageNumber: bestLayer.pageNumber,
    anchorLeft: anchorRect.left - bestLayer.element.getBoundingClientRect().left,
    anchorTop: anchorRect.top - bestLayer.element.getBoundingClientRect().top,
    anchorWidth: anchorRect.width,
    anchorHeight: anchorRect.height
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

function resolveFlowOverlayFigureStyle(params: {
  layout: Pick<WordLikeImageLayout, 'align' | 'figureLeft' | 'figureTop' | 'frameWidth' | 'wrapMode'>
  attributes: CustomImageAttributes
  mount: ImageOverlayMount
}): CSSProperties {
  const wrapMode = params.layout.wrapMode
  return {
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    width: params.layout.frameWidth,
    maxWidth: '100%',
    textAlign: params.layout.align,
    position: 'absolute',
    left: params.mount.anchorLeft + params.layout.figureLeft,
    top: params.mount.anchorTop + params.layout.figureTop,
    zIndex: resolveOverlayFigureZIndex(wrapMode, params.attributes.zIndex),
    pointerEvents: resolveOverlayFigurePointerEvents(wrapMode)
  }
}

export function resolveImageOverlayFigureStyle(params: {
  layout: Pick<
    WordLikeImageLayout,
    'wrapMode' | 'align' | 'anchorMode' | 'frameWidth' | 'figureLeft' | 'figureTop' | 'flowMode'
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

  return {
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    width: params.layout.frameWidth,
    maxWidth: '100%',
    textAlign: align,
    position: 'absolute',
    top: anchorMode === 'fixed' ? offsetY : params.mount.anchorTop + offsetY,
    zIndex: resolveOverlayFigureZIndex(wrapMode, params.attributes.zIndex),
    pointerEvents: resolveOverlayFigurePointerEvents(wrapMode),
    ...resolveHorizontalAnchorStyle(align, offsetX, distanceLeft, distanceRight)
  }
}
