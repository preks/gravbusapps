import { normalizeImageAlign, normalizeImageAnchorMode, normalizeImageWrapMode } from './styleUtils'
import type { CustomImageAttributes, ImageAlignment, ImageAnchorMode, ImageWrapMode } from './types'

export type ImageFloatingSide = 'left' | 'right'
export type WordWrapTextSide = 'bothSides' | 'left' | 'right'

function resolveFloatingAlign(wrapMode: ImageWrapMode, currentAlign: ImageAlignment): ImageAlignment {
  if (wrapMode === 'square-left') {
    return 'left'
  }

  if (wrapMode === 'square-right') {
    return 'right'
  }

  return currentAlign
}

export function isFloatingWrapMode(wrapMode: CustomImageAttributes['wrapMode']) {
  return (
    wrapMode === 'square-left' ||
    wrapMode === 'square-right' ||
    wrapMode === 'tight' ||
    wrapMode === 'through' ||
    wrapMode === 'top-bottom' ||
    wrapMode === 'behind' ||
    wrapMode === 'front'
  )
}

export function resolveFloatingSide(attributes: Pick<CustomImageAttributes, 'wrapMode' | 'align'>): ImageFloatingSide {
  const wrapMode = normalizeImageWrapMode(attributes.wrapMode, 'inline')
  if (wrapMode === 'square-right') {
    return 'right'
  }

  if (wrapMode === 'square-left') {
    return 'left'
  }

  return normalizeImageAlign(attributes.align, 'left') === 'right' ? 'right' : 'left'
}

export function resolveWordWrapTextSide(
  attributes: Pick<CustomImageAttributes, 'wrapMode' | 'align'>
): WordWrapTextSide {
  const wrapMode = normalizeImageWrapMode(attributes.wrapMode, 'inline')
  if (wrapMode === 'square-right') {
    return 'left'
  }

  if (wrapMode === 'square-left') {
    return 'right'
  }

  if (wrapMode === 'tight' || wrapMode === 'through') {
    return 'bothSides'
  }

  return normalizeImageAlign(attributes.align, 'left') === 'right' ? 'left' : 'right'
}

export function resolveImageWrapPreset(
  wrapMode: ImageWrapMode,
  currentAttributes: Pick<CustomImageAttributes, 'align' | 'anchorMode'> = {}
): Partial<CustomImageAttributes> {
  const normalizedWrapMode = normalizeImageWrapMode(wrapMode, 'inline')
  const currentAlign = normalizeImageAlign(currentAttributes.align, 'left')
  const currentAnchorMode = normalizeImageAnchorMode(currentAttributes.anchorMode, 'inline')
  const nextAnchorMode: ImageAnchorMode =
    normalizedWrapMode === 'inline' ? 'inline' : currentAnchorMode === 'inline' ? 'move-with-text' : currentAnchorMode

  return {
    wrapMode: normalizedWrapMode,
    display: normalizedWrapMode === 'inline' ? 'inline' : 'block',
    anchorMode: nextAnchorMode,
    allowOverlap: normalizedWrapMode === 'behind' || normalizedWrapMode === 'front',
    align: resolveFloatingAlign(normalizedWrapMode, currentAlign),
    ...(normalizedWrapMode === 'inline'
      ? {
          offsetX: 0,
          offsetY: 0
        }
      : {})
  }
}
