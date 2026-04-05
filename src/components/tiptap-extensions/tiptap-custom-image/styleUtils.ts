import type {
  CustomImageAttributes,
  ImageBorderDash,
  ImageAlignment,
  ImageAnchorMode,
  ImageDisplayMode,
  ImageSizeReference,
  ImageSizeUnit,
  ImageWrapTextSide,
  LegacyImageWrapMode,
  ImageWrapMode
} from './types'
import {
  DEFAULT_IMAGE_BORDER_COLOR,
  DEFAULT_IMAGE_BORDER_DASH,
  DEFAULT_IMAGE_BORDER_WIDTH_PT,
  IMAGE_BORDER_DASHES,
  IMAGE_WRAP_MODES,
  IMAGE_WRAP_TEXT_SIDES,
  LEGACY_IMAGE_WRAP_MODE_TO_ALIGN,
  LEGACY_IMAGE_WRAP_MODE_TO_TEXT_SIDE
} from './types'
import { normalizeImageCrop } from './cropUtils'

export const CUSTOM_IMAGE_FIGURE_CLASS = 'editor-image-figure'
export const CUSTOM_IMAGE_TAG = 'custom-image'

function normalizeEnumValue<T extends string>(allowed: readonly T[], value: unknown, fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback
}

export function normalizeImageAlign(value: unknown, fallback: ImageAlignment = 'left'): ImageAlignment {
  return normalizeEnumValue(['left', 'center', 'right'] as const, value, fallback)
}

function isLegacyImageWrapMode(value: unknown): value is LegacyImageWrapMode {
  return typeof value === 'string' && value in LEGACY_IMAGE_WRAP_MODE_TO_TEXT_SIDE
}

export function normalizeImageWrapMode(value: unknown, fallback: ImageWrapMode = 'inline'): ImageWrapMode {
  if (isLegacyImageWrapMode(value)) {
    return 'square'
  }

  return normalizeEnumValue(IMAGE_WRAP_MODES, value, fallback)
}

export function normalizeImageWrapTextSide(
  value: unknown,
  fallback: ImageWrapTextSide = 'bothSides'
): ImageWrapTextSide {
  return normalizeEnumValue(IMAGE_WRAP_TEXT_SIDES, value, fallback)
}

export function normalizeImageAnchorMode(value: unknown, fallback: ImageAnchorMode = 'inline'): ImageAnchorMode {
  return normalizeEnumValue(['inline', 'move-with-text', 'fixed'] as const, value, fallback)
}

export function normalizeImageDisplay(value: unknown, fallback: ImageDisplayMode = 'inline'): ImageDisplayMode {
  return normalizeEnumValue(['inline', 'block'] as const, value, fallback)
}

export function normalizeImageBorderDash(
  value: unknown,
  fallback: ImageBorderDash = DEFAULT_IMAGE_BORDER_DASH
): ImageBorderDash {
  return normalizeEnumValue(IMAGE_BORDER_DASHES, value, fallback)
}

export function normalizeImageSizeUnit(value: unknown, fallback: ImageSizeUnit = 'px'): ImageSizeUnit {
  return normalizeEnumValue(['px', 'percent'] as const, value, fallback)
}

export function normalizeImageSizeReference(value: unknown, fallback: ImageSizeReference = 'page'): ImageSizeReference {
  return normalizeEnumValue(['page'] as const, value, fallback)
}

export function normalizeNullableNumber(value: unknown, fallback: number | null = null): number | null {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return fallback
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function normalizeNullableBoolean(value: unknown, fallback: boolean | null = null): boolean | null {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (value === 1) return true
    if (value === 0) return false
    return fallback
  }
  if (typeof value !== 'string') return fallback
  const lower = value.trim().toLowerCase()
  if (['true', '1', 'yes', 'on'].includes(lower)) return true
  if (['false', '0', 'no', 'off'].includes(lower)) return false
  return fallback
}

function expandHexColor(hex: string): string | null {
  const normalized = hex.trim().replace(/^#/, '')

  if (/^[0-9a-f]{3}$/i.test(normalized)) {
    return normalized
      .split('')
      .map(char => char.repeat(2))
      .join('')
      .toUpperCase()
  }

  if (/^[0-9a-f]{6}$/i.test(normalized)) {
    return normalized.toUpperCase()
  }

  return null
}

export function normalizeImageBorderColor(
  value: unknown,
  fallback: string | null = DEFAULT_IMAGE_BORDER_COLOR
): string | null {
  if (value == null || value === '') {
    return fallback
  }

  if (typeof value !== 'string') {
    return fallback
  }

  const expandedHex = expandHexColor(value)
  return expandedHex ? `#${expandedHex}` : fallback
}

export function normalizeImageBorderWidthPt(
  value: unknown,
  fallback: number | null = DEFAULT_IMAGE_BORDER_WIDTH_PT
): number | null {
  const normalized = normalizeNullableNumber(value, fallback)
  if (normalized == null) {
    return fallback
  }

  if (normalized <= 0) {
    return fallback
  }

  return Math.min(96, Math.round(normalized * 100) / 100)
}

export function getImageFigureAttributesFromElement(
  element: Element,
  defaults: {
    align: ImageAlignment
    wrapMode: ImageWrapMode
    anchorMode: ImageAnchorMode
    display: ImageDisplayMode
    distance: number
  }
): CustomImageAttributes {
  const container =
    element.getAttribute('data-node-type') === CUSTOM_IMAGE_TAG
      ? element
      : (element.closest(`[data-node-type="${CUSTOM_IMAGE_TAG}"]`) ??
        (element.tagName.toLowerCase() === 'figure' ? element : element.closest('figure')))
  const image = element.tagName.toLowerCase() === 'img' ? element : container?.querySelector('img')
  const caption = container?.querySelector('figcaption, [data-image-caption-text="true"]')?.textContent?.trim() ?? null

  const readFigureAttr = (name: string) => container?.getAttribute(name) ?? element.getAttribute(name)
  const readImageAttr = (name: string) => image?.getAttribute(name) ?? element.getAttribute(name)
  const rawWrapMode = readFigureAttr('data-image-wrap')
  const align = normalizeImageAlign(
    readFigureAttr('data-image-align'),
    (isLegacyImageWrapMode(rawWrapMode) ? LEGACY_IMAGE_WRAP_MODE_TO_ALIGN[rawWrapMode] : null) ?? defaults.align
  )
  const wrapMode = normalizeImageWrapMode(rawWrapMode, defaults.wrapMode)
  const wrapTextSide =
    wrapMode === 'square'
      ? normalizeImageWrapTextSide(
          readFigureAttr('data-image-wrap-text-side'),
          (isLegacyImageWrapMode(rawWrapMode) ? LEGACY_IMAGE_WRAP_MODE_TO_TEXT_SIDE[rawWrapMode] : null) ??
            (align === 'right' ? 'left' : 'right')
        )
      : wrapMode === 'tight' || wrapMode === 'through'
        ? normalizeImageWrapTextSide(readFigureAttr('data-image-wrap-text-side'), 'bothSides')
        : null

  return {
    src: readImageAttr('src'),
    alt: readImageAttr('alt'),
    title: readImageAttr('title'),
    originalWidth: normalizeNullableNumber(readFigureAttr('data-image-original-width')),
    originalHeight: normalizeNullableNumber(readFigureAttr('data-image-original-height')),
    width: normalizeNullableNumber(readImageAttr('width')),
    height: normalizeNullableNumber(readImageAttr('height')),
    widthUnit: normalizeImageSizeUnit(readFigureAttr('data-image-width-unit'), 'px'),
    heightUnit: normalizeImageSizeUnit(readFigureAttr('data-image-height-unit'), 'px'),
    widthPercent: normalizeNullableNumber(readFigureAttr('data-image-width-percent')),
    heightPercent: normalizeNullableNumber(readFigureAttr('data-image-height-percent')),
    widthRelativeTo: normalizeImageSizeReference(readFigureAttr('data-image-width-relative-to'), 'page'),
    heightRelativeTo: normalizeImageSizeReference(readFigureAttr('data-image-height-relative-to'), 'page'),
    scaleWidthPercent: normalizeNullableNumber(readFigureAttr('data-image-scale-width-percent'), 100),
    scaleHeightPercent: normalizeNullableNumber(readFigureAttr('data-image-scale-height-percent'), 100),
    rotation: normalizeNullableNumber(readFigureAttr('data-image-rotation'), 0),
    cropTop: normalizeNullableNumber(readFigureAttr('data-image-crop-top'), 0),
    cropRight: normalizeNullableNumber(readFigureAttr('data-image-crop-right'), 0),
    cropBottom: normalizeNullableNumber(readFigureAttr('data-image-crop-bottom'), 0),
    cropLeft: normalizeNullableNumber(readFigureAttr('data-image-crop-left'), 0),
    align,
    caption: caption || readFigureAttr('data-image-caption'),
    display: normalizeImageDisplay(readFigureAttr('data-image-display'), defaults.display),
    wrapMode,
    wrapTextSide,
    anchorMode: normalizeImageAnchorMode(readFigureAttr('data-image-anchor'), defaults.anchorMode),
    lockAspectRatio: normalizeNullableBoolean(readFigureAttr('data-image-lock-ratio'), true),
    distanceTop: normalizeNullableNumber(readFigureAttr('data-image-distance-top'), defaults.distance),
    distanceRight: normalizeNullableNumber(readFigureAttr('data-image-distance-right'), defaults.distance),
    distanceBottom: normalizeNullableNumber(readFigureAttr('data-image-distance-bottom'), defaults.distance),
    distanceLeft: normalizeNullableNumber(readFigureAttr('data-image-distance-left'), defaults.distance),
    offsetX: normalizeNullableNumber(readFigureAttr('data-image-offset-x'), 0),
    offsetY: normalizeNullableNumber(readFigureAttr('data-image-offset-y'), 0),
    allowOverlap: normalizeNullableBoolean(readFigureAttr('data-image-allow-overlap'), false),
    zIndex: normalizeNullableNumber(readFigureAttr('data-image-z-index'), 1),
    borderVisible: normalizeNullableBoolean(readFigureAttr('data-image-border-visible'), false),
    borderColor: normalizeImageBorderColor(readFigureAttr('data-image-border-color'), DEFAULT_IMAGE_BORDER_COLOR),
    borderWidthPt: normalizeImageBorderWidthPt(
      readFigureAttr('data-image-border-width-pt'),
      DEFAULT_IMAGE_BORDER_WIDTH_PT
    ),
    borderDash: normalizeImageBorderDash(readFigureAttr('data-image-border-dash'), DEFAULT_IMAGE_BORDER_DASH)
  }
}

export function getFigureDataAttributes(attributes: CustomImageAttributes) {
  const align = normalizeImageAlign(attributes.align)
  const wrapMode = normalizeImageWrapMode(attributes.wrapMode)
  const wrapTextSide =
    wrapMode === 'square'
      ? normalizeImageWrapTextSide(attributes.wrapTextSide, align === 'right' ? 'left' : 'bothSides')
      : wrapMode === 'tight' || wrapMode === 'through'
        ? normalizeImageWrapTextSide(attributes.wrapTextSide, 'bothSides')
        : null
  const anchorMode = normalizeImageAnchorMode(attributes.anchorMode)
  const display = normalizeImageDisplay(attributes.display, wrapMode === 'inline' ? 'inline' : 'block')
  const widthUnit = normalizeImageSizeUnit(attributes.widthUnit, 'px')
  const heightUnit = normalizeImageSizeUnit(attributes.heightUnit, 'px')
  const widthRelativeTo = normalizeImageSizeReference(attributes.widthRelativeTo, 'page')
  const heightRelativeTo = normalizeImageSizeReference(attributes.heightRelativeTo, 'page')
  const lockAspectRatio = attributes.lockAspectRatio ?? true
  const originalWidth = normalizeNullableNumber(attributes.originalWidth)
  const originalHeight = normalizeNullableNumber(attributes.originalHeight)
  const widthPercent = normalizeNullableNumber(attributes.widthPercent)
  const heightPercent = normalizeNullableNumber(attributes.heightPercent)
  const scaleWidthPercent = normalizeNullableNumber(attributes.scaleWidthPercent, 100) ?? 100
  const scaleHeightPercent = normalizeNullableNumber(attributes.scaleHeightPercent, 100) ?? 100
  const rotation = normalizeNullableNumber(attributes.rotation, 0) ?? 0
  const crop = normalizeImageCrop(attributes)
  const distanceTop = normalizeNullableNumber(attributes.distanceTop, 0) ?? 0
  const distanceRight = normalizeNullableNumber(attributes.distanceRight, 0) ?? 0
  const distanceBottom = normalizeNullableNumber(attributes.distanceBottom, 0) ?? 0
  const distanceLeft = normalizeNullableNumber(attributes.distanceLeft, 0) ?? 0
  const offsetX = normalizeNullableNumber(attributes.offsetX, 0) ?? 0
  const offsetY = normalizeNullableNumber(attributes.offsetY, 0) ?? 0
  const allowOverlap = attributes.allowOverlap ?? false
  const zIndex = normalizeNullableNumber(attributes.zIndex, 1) ?? 1
  const borderVisible = attributes.borderVisible ?? false
  const borderColor = normalizeImageBorderColor(attributes.borderColor, DEFAULT_IMAGE_BORDER_COLOR)
  const borderWidthPt = normalizeImageBorderWidthPt(attributes.borderWidthPt, DEFAULT_IMAGE_BORDER_WIDTH_PT)
  const borderDash = normalizeImageBorderDash(attributes.borderDash, DEFAULT_IMAGE_BORDER_DASH)

  return {
    'data-node-type': CUSTOM_IMAGE_TAG,
    'data-image-align': align,
    'data-image-wrap': wrapMode,
    ...(wrapTextSide ? { 'data-image-wrap-text-side': wrapTextSide } : {}),
    'data-image-anchor': anchorMode,
    'data-image-display': display,
    'data-image-width-unit': widthUnit,
    'data-image-height-unit': heightUnit,
    'data-image-width-relative-to': widthRelativeTo,
    'data-image-height-relative-to': heightRelativeTo,
    'data-image-lock-ratio': String(lockAspectRatio),
    'data-image-scale-width-percent': String(scaleWidthPercent),
    'data-image-scale-height-percent': String(scaleHeightPercent),
    'data-image-rotation': String(rotation),
    'data-image-crop-top': String(crop.top),
    'data-image-crop-right': String(crop.right),
    'data-image-crop-bottom': String(crop.bottom),
    'data-image-crop-left': String(crop.left),
    'data-image-distance-top': String(distanceTop),
    'data-image-distance-right': String(distanceRight),
    'data-image-distance-bottom': String(distanceBottom),
    'data-image-distance-left': String(distanceLeft),
    'data-image-offset-x': String(offsetX),
    'data-image-offset-y': String(offsetY),
    'data-image-allow-overlap': String(allowOverlap),
    'data-image-z-index': String(zIndex),
    'data-image-border-visible': String(borderVisible),
    ...(borderColor == null ? {} : { 'data-image-border-color': borderColor }),
    ...(borderWidthPt == null ? {} : { 'data-image-border-width-pt': String(borderWidthPt) }),
    'data-image-border-dash': borderDash,
    ...(originalWidth == null ? {} : { 'data-image-original-width': String(Math.round(originalWidth)) }),
    ...(originalHeight == null ? {} : { 'data-image-original-height': String(Math.round(originalHeight)) }),
    ...(widthPercent == null ? {} : { 'data-image-width-percent': String(widthPercent) }),
    ...(heightPercent == null ? {} : { 'data-image-height-percent': String(heightPercent) }),
    ...(attributes.caption ? { 'data-image-caption': attributes.caption } : {})
  }
}

export function appendClassName(base: string, extra: unknown): string {
  const extraClass = typeof extra === 'string' ? extra.trim() : ''
  return extraClass ? `${base} ${extraClass}` : base
}
