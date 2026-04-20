import type { CSSProperties } from 'react'
import { buildShapeOutsidePolygon, serializeImageWrapContour, type ImageWrapContour } from './wrapContourUtils'
import type { WordLikeImageLayout } from './wrapLayoutEngine'

const PARAGRAPH_ANCHOR_SELECTOR = 'p, li, blockquote, pre, h1, h2, h3, h4, h5, h6, td, th'

function getFlowOrder(host: HTMLElement) {
  const value = Number(host.dataset.imageFlowOrder ?? '')
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER
}

function findParagraphAnchorElement(anchorElement: HTMLElement) {
  return anchorElement.closest(PARAGRAPH_ANCHOR_SELECTOR) as HTMLElement | null
}

/**
 * Element whose `getBoundingClientRect()` drives page-overlay positioning.
 * Word-like move-with-text wrapping keeps the image semantically anchored inside the paragraph,
 * so paragraph geometry is the primary source-of-truth whenever paragraph anchoring applies.
 */
export function resolveImageAnchorGeometryElement(
  anchorElement: HTMLElement,
  layout: Pick<WordLikeImageLayout, 'anchorReference' | 'flowMode'>
): HTMLElement {
  if (layout.anchorReference !== 'paragraph') {
    return anchorElement
  }

  return findParagraphAnchorElement(anchorElement) ?? anchorElement
}

export function resolveImageFlowShimTarget(
  anchorElement: HTMLElement,
  layout: Pick<WordLikeImageLayout, 'renderMode' | 'exclusionMode' | 'anchorReference' | 'wrapMode'>
): HTMLElement | null {
  if (layout.exclusionMode === 'none') {
    return null
  }

  if (layout.renderMode !== 'overlay') {
    return null
  }

  if (layout.anchorReference !== 'paragraph') {
    return anchorElement.parentElement
  }

  return findParagraphAnchorElement(anchorElement) ?? anchorElement.parentElement
}

export function syncImageFlowShimHost(target: HTMLElement, host: HTMLElement, order: number) {
  host.dataset.imageFlowShimHost = 'true'
  host.dataset.imageFlowOrder = String(order)
  host.setAttribute('contenteditable', 'false')
  host.style.display = 'contents'
  host.style.pointerEvents = 'none'

  const nextHost =
    Array.from(target.children).find(
      (child): child is HTMLElement =>
        child instanceof HTMLElement &&
        child !== host &&
        child.dataset.imageFlowShimHost === 'true' &&
        getFlowOrder(child) > order
    ) ?? null

  if (host.parentElement !== target) {
    target.insertBefore(host, nextHost ?? target.firstChild)
    return
  }

  if (nextHost) {
    target.insertBefore(host, nextHost)
    return
  }

  if (target.firstChild !== host) {
    target.insertBefore(host, target.firstChild)
  }
}

export function resolveImageFlowShimStyle(
  layout: Pick<WordLikeImageLayout, 'exclusionMode' | 'floatingSide' | 'layoutWidth' | 'layoutHeight'>,
  contour?: ImageWrapContour | null
): CSSProperties | null {
  if (layout.exclusionMode === 'none') {
    return null
  }

  if (layout.exclusionMode === 'top-bottom') {
    return {
      display: 'block',
      width: '100%',
      height: layout.layoutHeight,
      clear: 'both',
      pointerEvents: 'none',
      userSelect: 'none',
      visibility: 'hidden'
    }
  }

  const polygon = layout.exclusionMode === 'polygon' ? buildShapeOutsidePolygon(contour ?? null) : undefined

  return {
    display: 'block',
    float: layout.floatingSide ?? 'left',
    width: layout.layoutWidth,
    height: layout.layoutHeight,
    shapeOutside: polygon,
    pointerEvents: 'none',
    userSelect: 'none',
    visibility: 'hidden'
  }
}

export function getImageFlowShimAttributes(
  layout: Pick<WordLikeImageLayout, 'runtimeAttributes'>,
  contour?: ImageWrapContour | null
) {
  const serializedContour = serializeImageWrapContour(contour ?? null)
  return {
    ...layout.runtimeAttributes,
    ...(serializedContour ? { 'data-image-wrap-contour': serializedContour } : {}),
    'data-image-flow-shim': 'true'
  }
}
