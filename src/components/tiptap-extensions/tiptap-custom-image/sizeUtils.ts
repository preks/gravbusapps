import {
  normalizeImageSizeReference,
  normalizeImageSizeUnit,
  normalizeNullableBoolean,
  normalizeNullableNumber
} from './styleUtils'
import type { CustomImageAttributes, ImageSizeReference, ImageSizeUnit } from './types'

export const DEFAULT_IMAGE_ROTATION = 0
export const DEFAULT_IMAGE_SCALE_PERCENT = 100
export const DEFAULT_IMAGE_SIZE_REFERENCE: ImageSizeReference = 'page'

export interface ImageMeasurementContext {
  containerWidth?: number | null
  containerHeight?: number | null
}

export interface ResolvedImageDimensions {
  width: number | null
  height: number | null
  baseWidth: number | null
  baseHeight: number | null
  originalWidth: number | null
  originalHeight: number | null
  widthUnit: ImageSizeUnit
  heightUnit: ImageSizeUnit
  widthPercent: number | null
  heightPercent: number | null
  widthRelativeTo: ImageSizeReference
  heightRelativeTo: ImageSizeReference
  scaleWidthPercent: number
  scaleHeightPercent: number
  rotation: number
  lockAspectRatio: boolean
}

function clampPositiveNumber(value: number | null, fallback: number | null = null): number | null {
  if (value == null) return fallback
  return value > 0 ? value : fallback
}

function roundNullable(value: number | null): number | null {
  return value == null ? null : Math.max(1, Math.round(value))
}

function getReferenceLength(length: number | null | undefined): number | null {
  const normalized = normalizeNullableNumber(length)
  return normalized != null && normalized > 0 ? normalized : null
}

export function getImageAspectRatio(attributes: CustomImageAttributes): number | null {
  const originalWidth = clampPositiveNumber(normalizeNullableNumber(attributes.originalWidth))
  const originalHeight = clampPositiveNumber(normalizeNullableNumber(attributes.originalHeight))
  if (originalWidth != null && originalHeight != null) {
    return originalWidth / originalHeight
  }

  const width = clampPositiveNumber(normalizeNullableNumber(attributes.width))
  const height = clampPositiveNumber(normalizeNullableNumber(attributes.height))
  if (width != null && height != null) {
    return width / height
  }

  return null
}

function resolveDimension({
  absoluteValue,
  unit,
  percentValue,
  referenceLength,
  fallbackValue
}: {
  absoluteValue: number | null
  unit: ImageSizeUnit
  percentValue: number | null
  referenceLength: number | null
  fallbackValue: number | null
}): number | null {
  if (unit === 'percent' && percentValue != null && referenceLength != null) {
    return (referenceLength * percentValue) / 100
  }

  return absoluteValue ?? fallbackValue
}

export function convertPxToPercent(px: number | null, referenceLength: number | null): number | null {
  if (px == null || referenceLength == null || referenceLength <= 0) return null
  return Number(((px / referenceLength) * 100).toFixed(2))
}

export function resolveImageDimensions(
  attributes: CustomImageAttributes,
  context: ImageMeasurementContext = {}
): ResolvedImageDimensions {
  const originalWidth = clampPositiveNumber(normalizeNullableNumber(attributes.originalWidth))
  const originalHeight = clampPositiveNumber(normalizeNullableNumber(attributes.originalHeight))
  const widthUnit = normalizeImageSizeUnit(attributes.widthUnit, 'px')
  const heightUnit = normalizeImageSizeUnit(attributes.heightUnit, 'px')
  const widthRelativeTo = normalizeImageSizeReference(attributes.widthRelativeTo, DEFAULT_IMAGE_SIZE_REFERENCE)
  const heightRelativeTo = normalizeImageSizeReference(attributes.heightRelativeTo, DEFAULT_IMAGE_SIZE_REFERENCE)
  const widthPercent = clampPositiveNumber(normalizeNullableNumber(attributes.widthPercent))
  const heightPercent = clampPositiveNumber(normalizeNullableNumber(attributes.heightPercent))
  const absoluteWidth = clampPositiveNumber(normalizeNullableNumber(attributes.width))
  const absoluteHeight = clampPositiveNumber(normalizeNullableNumber(attributes.height))
  const containerWidth = getReferenceLength(context.containerWidth)
  const containerHeight = getReferenceLength(context.containerHeight)
  const lockAspectRatio = normalizeNullableBoolean(attributes.lockAspectRatio, true) ?? true
  const scaleWidthPercent = Math.max(
    1,
    normalizeNullableNumber(attributes.scaleWidthPercent, DEFAULT_IMAGE_SCALE_PERCENT) ?? DEFAULT_IMAGE_SCALE_PERCENT
  )
  const scaleHeightPercent = Math.max(
    1,
    normalizeNullableNumber(attributes.scaleHeightPercent, DEFAULT_IMAGE_SCALE_PERCENT) ?? DEFAULT_IMAGE_SCALE_PERCENT
  )
  const rotation = normalizeNullableNumber(attributes.rotation, DEFAULT_IMAGE_ROTATION) ?? DEFAULT_IMAGE_ROTATION
  const aspectRatio = getImageAspectRatio(attributes)

  let baseWidth = resolveDimension({
    absoluteValue: absoluteWidth,
    unit: widthUnit,
    percentValue: widthPercent,
    referenceLength: containerWidth,
    fallbackValue: originalWidth
  })
  let baseHeight = resolveDimension({
    absoluteValue: absoluteHeight,
    unit: heightUnit,
    percentValue: heightPercent,
    referenceLength: containerHeight,
    fallbackValue: originalHeight
  })

  if (lockAspectRatio && aspectRatio) {
    if (baseWidth != null && baseHeight == null) {
      baseHeight = baseWidth / aspectRatio
    } else if (baseHeight != null && baseWidth == null) {
      baseWidth = baseHeight * aspectRatio
    }
  }

  let width = baseWidth == null ? null : (baseWidth * scaleWidthPercent) / 100
  let height = baseHeight == null ? null : (baseHeight * scaleHeightPercent) / 100

  if (lockAspectRatio && aspectRatio) {
    if (width != null && height == null) {
      height = width / aspectRatio
    } else if (height != null && width == null) {
      width = height * aspectRatio
    }
  }

  return {
    width: roundNullable(width),
    height: roundNullable(height),
    baseWidth: roundNullable(baseWidth),
    baseHeight: roundNullable(baseHeight),
    originalWidth,
    originalHeight,
    widthUnit,
    heightUnit,
    widthPercent,
    heightPercent,
    widthRelativeTo,
    heightRelativeTo,
    scaleWidthPercent,
    scaleHeightPercent,
    rotation,
    lockAspectRatio
  }
}
