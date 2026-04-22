import type { CustomImageAttributes } from './types'

export interface NormalizedImageCrop {
  top: number
  right: number
  bottom: number
  left: number
}

export interface ResolvedImageCropDimensions {
  visibleWidthRatio: number
  visibleHeightRatio: number
  renderedWidth: number
  renderedHeight: number
  offsetX: number
  offsetY: number
}

const MAX_TOTAL_CROP = 0.95

function clampCropValue(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return 0
  return Math.min(Math.max(value, 0), MAX_TOTAL_CROP)
}

function normalizeCropPair(first: number, second: number): [number, number] {
  const total = first + second
  if (total <= MAX_TOTAL_CROP) {
    return [first, second]
  }

  const scale = MAX_TOTAL_CROP / total
  return [first * scale, second * scale]
}

export function normalizeImageCrop(
  attributes: Pick<CustomImageAttributes, 'cropTop' | 'cropRight' | 'cropBottom' | 'cropLeft'>
): NormalizedImageCrop {
  const top = clampCropValue(attributes.cropTop)
  const right = clampCropValue(attributes.cropRight)
  const bottom = clampCropValue(attributes.cropBottom)
  const left = clampCropValue(attributes.cropLeft)
  const [normalizedLeft, normalizedRight] = normalizeCropPair(left, right)
  const [normalizedTop, normalizedBottom] = normalizeCropPair(top, bottom)

  return {
    top: normalizedTop,
    right: normalizedRight,
    bottom: normalizedBottom,
    left: normalizedLeft
  }
}

export function hasImageCrop(
  attributes: Pick<CustomImageAttributes, 'cropTop' | 'cropRight' | 'cropBottom' | 'cropLeft'>
): boolean {
  const crop = normalizeImageCrop(attributes)
  return crop.top > 0 || crop.right > 0 || crop.bottom > 0 || crop.left > 0
}

export function resolveImageCropDimensions(options: {
  width: number | null
  height: number | null
  crop: NormalizedImageCrop
}): ResolvedImageCropDimensions {
  const safeWidth = Math.max(1, Math.round(options.width ?? 1))
  const safeHeight = Math.max(1, Math.round(options.height ?? 1))
  const visibleWidthRatio = Math.max(0.05, 1 - options.crop.left - options.crop.right)
  const visibleHeightRatio = Math.max(0.05, 1 - options.crop.top - options.crop.bottom)
  const renderedWidth = Math.max(1, Math.round(safeWidth / visibleWidthRatio))
  const renderedHeight = Math.max(1, Math.round(safeHeight / visibleHeightRatio))

  return {
    visibleWidthRatio,
    visibleHeightRatio,
    renderedWidth,
    renderedHeight,
    offsetX: Math.round(-options.crop.left * renderedWidth),
    offsetY: Math.round(-options.crop.top * renderedHeight)
  }
}

export function convertCropRatioToWordValue(value: number): string {
  return String(Math.round(clampCropValue(value) * 100000))
}
