import {
  normalizeImageAlign,
  normalizeImageAnchorMode,
  normalizeImageWrapMode,
  normalizeImageWrapTextSide
} from './styleUtils'
import { LEGACY_IMAGE_WRAP_MODE_TO_TEXT_SIDE } from './types'
import type {
  CustomImageAttributes,
  ImageAlignment,
  ImageAnchorMode,
  ImageWrapMode,
  ImageWrapTextSide,
  LegacyImageWrapMode
} from './types'

export type ImageFloatingSide = 'left' | 'right'
export type WordWrapTextSide = ImageWrapTextSide
export type LegacyImageWrapPreset = 'inline' | 'floating-left' | 'floating-right' | 'behind-text' | 'in-front-of-text'
export type WordStyleWrapPreset = 'inline' | 'square-left' | 'square-right' | 'behind-text' | 'in-front-of-text'

function isLegacyImageWrapMode(value: unknown): value is LegacyImageWrapMode {
  return typeof value === 'string' && value in LEGACY_IMAGE_WRAP_MODE_TO_TEXT_SIDE
}

function resolveLegacyWrapTextSide(value: unknown): ImageWrapTextSide | null {
  return isLegacyImageWrapMode(value) ? LEGACY_IMAGE_WRAP_MODE_TO_TEXT_SIDE[value] : null
}

function resolveFloatingAlign(
  wrapMode: ImageWrapMode,
  currentAlign: ImageAlignment,
  wrapTextSide: ImageWrapTextSide | null
): ImageAlignment {
  if (wrapMode === 'square' && wrapTextSide === 'right') {
    return 'left'
  }

  if (wrapMode === 'square' && wrapTextSide === 'left') {
    return 'right'
  }

  return currentAlign
}

export function isFloatingWrapMode(wrapMode: CustomImageAttributes['wrapMode']) {
  return (
    wrapMode === 'square' ||
    wrapMode === 'tight' ||
    wrapMode === 'through' ||
    wrapMode === 'top-bottom' ||
    wrapMode === 'behind' ||
    wrapMode === 'front'
  )
}

export function isOverlayWrapMode(wrapMode: CustomImageAttributes['wrapMode']) {
  return wrapMode === 'behind' || wrapMode === 'front'
}

export function resolveFloatingSide(
  attributes: Pick<CustomImageAttributes, 'wrapMode' | 'align' | 'wrapTextSide'>
): ImageFloatingSide {
  const wrapMode = normalizeImageWrapMode(attributes.wrapMode, 'inline')
  if (wrapMode === 'square') {
    const wrapTextSide = resolveWordWrapTextSide(attributes)
    if (wrapTextSide === 'left') {
      return 'right'
    }

    if (wrapTextSide === 'right') {
      return 'left'
    }
  }

  if (normalizeImageAlign(attributes.align, 'left') === 'right') {
    return 'right'
  }

  return 'left'
}

export function resolveWordWrapTextSide(
  attributes: Pick<CustomImageAttributes, 'wrapMode' | 'align' | 'wrapTextSide'>
): WordWrapTextSide {
  const wrapMode = normalizeImageWrapMode(attributes.wrapMode, 'inline')
  if (wrapMode === 'square') {
    return normalizeImageWrapTextSide(
      attributes.wrapTextSide,
      resolveLegacyWrapTextSide(attributes.wrapMode) ??
        (normalizeImageAlign(attributes.align, 'left') === 'right' ? 'left' : 'right')
    )
  }

  if (wrapMode === 'tight' || wrapMode === 'through') {
    return 'bothSides'
  }

  return normalizeImageAlign(attributes.align, 'left') === 'right' ? 'left' : 'right'
}

export function resolveImageWrapPreset(
  wrapMode: ImageWrapMode,
  currentAttributes: Pick<CustomImageAttributes, 'align' | 'anchorMode' | 'wrapMode' | 'wrapTextSide'> = {}
): Partial<CustomImageAttributes> {
  const normalizedWrapMode = normalizeImageWrapMode(wrapMode, 'inline')
  const currentAlign = normalizeImageAlign(currentAttributes.align, 'left')
  const currentAnchorMode = normalizeImageAnchorMode(currentAttributes.anchorMode, 'inline')
  const currentWrapTextSide =
    normalizedWrapMode === 'square'
      ? normalizeImageWrapTextSide(
          currentAttributes.wrapTextSide,
          resolveLegacyWrapTextSide(currentAttributes.wrapMode) ?? 'bothSides'
        )
      : normalizedWrapMode === 'tight' || normalizedWrapMode === 'through'
        ? 'bothSides'
        : null
  const nextAnchorMode: ImageAnchorMode =
    normalizedWrapMode === 'inline' ? 'inline' : currentAnchorMode === 'inline' ? 'move-with-text' : currentAnchorMode

  return {
    wrapMode: normalizedWrapMode,
    wrapTextSide: currentWrapTextSide,
    display: normalizedWrapMode === 'inline' ? 'inline' : 'block',
    anchorMode: nextAnchorMode,
    allowOverlap: normalizedWrapMode === 'behind' || normalizedWrapMode === 'front',
    align: resolveFloatingAlign(normalizedWrapMode, currentAlign, currentWrapTextSide),
    ...(normalizedWrapMode === 'inline'
      ? {
          wrapTextSide: null,
          offsetX: 0,
          offsetY: 0
        }
      : {})
  }
}

export function resolveLegacyImagePreset(
  preset: LegacyImageWrapPreset,
  currentAttributes: Pick<CustomImageAttributes, 'align' | 'anchorMode' | 'wrapMode' | 'wrapTextSide'> = {}
): Partial<CustomImageAttributes> {
  switch (preset) {
    case 'floating-left':
      return resolveImageWrapPreset('square', {
        ...currentAttributes,
        align: 'left',
        wrapTextSide: 'right'
      })
    case 'floating-right':
      return resolveImageWrapPreset('square', {
        ...currentAttributes,
        align: 'right',
        wrapTextSide: 'left'
      })
    case 'behind-text':
      return resolveImageWrapPreset('behind', currentAttributes)
    case 'in-front-of-text':
      return resolveImageWrapPreset('front', currentAttributes)
    case 'inline':
    default:
      return resolveImageWrapPreset('inline', currentAttributes)
  }
}

export function resolveWordStyleWrapPreset(
  attributes: Pick<CustomImageAttributes, 'wrapMode' | 'align' | 'wrapTextSide'>
): WordStyleWrapPreset {
  const wrapMode = normalizeImageWrapMode(attributes.wrapMode, 'inline')

  switch (wrapMode) {
    case 'inline':
      return 'inline'
    case 'behind':
      return 'behind-text'
    case 'front':
      return 'in-front-of-text'
    default:
      return resolveFloatingSide(attributes) === 'right' ? 'square-right' : 'square-left'
  }
}

export function resolveWordStyleWrapPresetUpdate(
  preset: WordStyleWrapPreset,
  currentAttributes: Pick<CustomImageAttributes, 'align' | 'anchorMode' | 'wrapMode' | 'wrapTextSide'> = {}
): Partial<CustomImageAttributes> {
  switch (preset) {
    case 'square-left':
      return resolveLegacyImagePreset('floating-left', currentAttributes)
    case 'square-right':
      return resolveLegacyImagePreset('floating-right', currentAttributes)
    case 'behind-text':
      return resolveLegacyImagePreset('behind-text', currentAttributes)
    case 'in-front-of-text':
      return resolveLegacyImagePreset('in-front-of-text', currentAttributes)
    case 'inline':
    default:
      return resolveLegacyImagePreset('inline', currentAttributes)
  }
}

export function resolveSquareWrapTextSideSelection(
  wrapTextSide: ImageWrapTextSide,
  currentAttributes: Pick<CustomImageAttributes, 'align' | 'anchorMode' | 'wrapMode' | 'wrapTextSide'> = {}
): Partial<CustomImageAttributes> {
  const nextWrapTextSide = normalizeImageWrapTextSide(wrapTextSide, 'bothSides')
  const nextAlign =
    nextWrapTextSide === 'left'
      ? 'right'
      : nextWrapTextSide === 'right'
        ? 'left'
        : normalizeImageAlign(currentAttributes.align, 'left')

  return resolveImageWrapPreset('square', {
    ...currentAttributes,
    align: nextAlign,
    wrapTextSide: nextWrapTextSide
  })
}
