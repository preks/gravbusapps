import type {
  CustomImageAttributes,
  ImageAlignment,
  ImageAnchorMode,
  ImageDisplayMode,
  ImageSizeReference,
  ImageSizeUnit,
  ImageWrapMode
} from './types'

export const CUSTOM_IMAGE_FIGURE_CLASS = 'editor-image-figure'
export const CUSTOM_IMAGE_TAG = 'custom-image'

function normalizeEnumValue<T extends string>(allowed: readonly T[], value: unknown, fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback
}

export function normalizeImageAlign(value: unknown, fallback: ImageAlignment = 'left'): ImageAlignment {
  return normalizeEnumValue(['left', 'center', 'right'] as const, value, fallback)
}

export function normalizeImageWrapMode(value: unknown, fallback: ImageWrapMode = 'inline'): ImageWrapMode {
  return normalizeEnumValue(
    ['inline', 'square-left', 'square-right', 'tight', 'through', 'top-bottom', 'behind', 'front'] as const,
    value,
    fallback
  )
}

export function normalizeImageAnchorMode(value: unknown, fallback: ImageAnchorMode = 'inline'): ImageAnchorMode {
  return normalizeEnumValue(['inline', 'move-with-text', 'fixed'] as const, value, fallback)
}

export function normalizeImageDisplay(value: unknown, fallback: ImageDisplayMode = 'inline'): ImageDisplayMode {
  return normalizeEnumValue(['inline', 'block'] as const, value, fallback)
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
  const figure = element.tagName.toLowerCase() === 'figure' ? element : element.closest('figure')
  const image = element.tagName.toLowerCase() === 'img' ? element : figure?.querySelector('img')
  const caption = figure?.querySelector('figcaption')?.textContent?.trim() ?? null

  const readFigureAttr = (name: string) => figure?.getAttribute(name) ?? element.getAttribute(name)
  const readImageAttr = (name: string) => image?.getAttribute(name) ?? element.getAttribute(name)

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
    align: normalizeImageAlign(readFigureAttr('data-image-align'), defaults.align),
    caption: caption || readFigureAttr('data-image-caption'),
    display: normalizeImageDisplay(readFigureAttr('data-image-display'), defaults.display),
    wrapMode: normalizeImageWrapMode(readFigureAttr('data-image-wrap'), defaults.wrapMode),
    anchorMode: normalizeImageAnchorMode(readFigureAttr('data-image-anchor'), defaults.anchorMode),
    lockAspectRatio: normalizeNullableBoolean(readFigureAttr('data-image-lock-ratio'), true),
    distanceTop: normalizeNullableNumber(readFigureAttr('data-image-distance-top'), defaults.distance),
    distanceRight: normalizeNullableNumber(readFigureAttr('data-image-distance-right'), defaults.distance),
    distanceBottom: normalizeNullableNumber(readFigureAttr('data-image-distance-bottom'), defaults.distance),
    distanceLeft: normalizeNullableNumber(readFigureAttr('data-image-distance-left'), defaults.distance),
    offsetX: normalizeNullableNumber(readFigureAttr('data-image-offset-x'), 0),
    offsetY: normalizeNullableNumber(readFigureAttr('data-image-offset-y'), 0),
    allowOverlap: normalizeNullableBoolean(readFigureAttr('data-image-allow-overlap'), false),
    zIndex: normalizeNullableNumber(readFigureAttr('data-image-z-index'), 1)
  }
}

export function getFigureDataAttributes(attributes: CustomImageAttributes) {
  const align = normalizeImageAlign(attributes.align)
  const wrapMode = normalizeImageWrapMode(attributes.wrapMode)
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
  const distanceTop = normalizeNullableNumber(attributes.distanceTop, 0) ?? 0
  const distanceRight = normalizeNullableNumber(attributes.distanceRight, 0) ?? 0
  const distanceBottom = normalizeNullableNumber(attributes.distanceBottom, 0) ?? 0
  const distanceLeft = normalizeNullableNumber(attributes.distanceLeft, 0) ?? 0
  const offsetX = normalizeNullableNumber(attributes.offsetX, 0) ?? 0
  const offsetY = normalizeNullableNumber(attributes.offsetY, 0) ?? 0
  const allowOverlap = attributes.allowOverlap ?? false
  const zIndex = normalizeNullableNumber(attributes.zIndex, 1) ?? 1

  return {
    'data-node-type': CUSTOM_IMAGE_TAG,
    'data-image-align': align,
    'data-image-wrap': wrapMode,
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
    'data-image-distance-top': String(distanceTop),
    'data-image-distance-right': String(distanceRight),
    'data-image-distance-bottom': String(distanceBottom),
    'data-image-distance-left': String(distanceLeft),
    'data-image-offset-x': String(offsetX),
    'data-image-offset-y': String(offsetY),
    'data-image-allow-overlap': String(allowOverlap),
    'data-image-z-index': String(zIndex),
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
