import type { ImageOptions as TiptapImageOptions } from '@tiptap/extension-image'

export const IMAGE_ALIGNMENTS = ['left', 'center', 'right'] as const
export const IMAGE_SIZE_UNITS = ['px', 'percent'] as const
export const IMAGE_SIZE_REFERENCES = ['page'] as const
export const IMAGE_WRAP_MODES = ['inline', 'square', 'tight', 'through', 'top-bottom', 'behind', 'front'] as const
export const IMAGE_WRAP_TEXT_SIDES = ['bothSides', 'left', 'right'] as const
export const IMAGE_ANCHOR_MODES = ['inline', 'move-with-text', 'fixed'] as const
export const IMAGE_DISPLAY_MODES = ['inline', 'block'] as const
export const IMAGE_BORDER_DASHES = ['solid', 'dash', 'dot', 'dash-dot', 'dash-dot-dot'] as const
export const IMAGE_BORDER_WEIGHT_PRESETS = [0.25, 0.5, 0.75, 1, 1.5, 2.25, 3, 4.5, 6] as const
export const DEFAULT_IMAGE_BORDER_COLOR = '#000000'
export const DEFAULT_IMAGE_BORDER_WIDTH_PT = 1
export const DEFAULT_IMAGE_BORDER_DASH = 'solid'
export const LEGACY_IMAGE_WRAP_MODE_TO_ALIGN = {
  'square-left': 'left',
  'square-right': 'right'
} as const
export const LEGACY_IMAGE_WRAP_MODE_TO_TEXT_SIDE = {
  'square-left': 'right',
  'square-right': 'left'
} as const

export type ImageAlignment = (typeof IMAGE_ALIGNMENTS)[number]
export type ImageSizeUnit = (typeof IMAGE_SIZE_UNITS)[number]
export type ImageSizeReference = (typeof IMAGE_SIZE_REFERENCES)[number]
export type ImageWrapMode = (typeof IMAGE_WRAP_MODES)[number]
export type ImageWrapTextSide = (typeof IMAGE_WRAP_TEXT_SIDES)[number]
export type ImageAnchorMode = (typeof IMAGE_ANCHOR_MODES)[number]
export type ImageDisplayMode = (typeof IMAGE_DISPLAY_MODES)[number]
export type ImageBorderDash = (typeof IMAGE_BORDER_DASHES)[number]
export type LegacyImageWrapMode = keyof typeof LEGACY_IMAGE_WRAP_MODE_TO_TEXT_SIDE

export const IMAGE_WRAP_UI_OPTIONS: ReadonlyArray<{ key: string; value: ImageWrapMode }> = [
  { key: 'image-wrap-inline', value: 'inline' },
  { key: 'image-wrap-square', value: 'square' },
  { key: 'image-wrap-tight', value: 'tight' },
  { key: 'image-wrap-through', value: 'through' },
  { key: 'image-wrap-center', value: 'top-bottom' },
  { key: 'image-wrap-behind', value: 'behind' },
  { key: 'image-wrap-in-front', value: 'front' }
]

export const IMAGE_WRAP_TEXT_SIDE_UI_OPTIONS: ReadonlyArray<{ key: string; value: ImageWrapTextSide }> = [
  { key: 'image-wrap-text-both-sides', value: 'bothSides' },
  { key: 'image-wrap-text-left-only', value: 'left' },
  { key: 'image-wrap-text-right-only', value: 'right' }
]

export interface CustomImageAttributes {
  src?: string | null
  alt?: string | null
  title?: string | null
  originalWidth?: number | null
  originalHeight?: number | null
  width?: number | null
  height?: number | null
  widthUnit?: ImageSizeUnit | null
  heightUnit?: ImageSizeUnit | null
  widthPercent?: number | null
  heightPercent?: number | null
  widthRelativeTo?: ImageSizeReference | null
  heightRelativeTo?: ImageSizeReference | null
  scaleWidthPercent?: number | null
  scaleHeightPercent?: number | null
  rotation?: number | null
  cropTop?: number | null
  cropRight?: number | null
  cropBottom?: number | null
  cropLeft?: number | null
  align?: ImageAlignment | null
  caption?: string | null
  display?: ImageDisplayMode | null
  wrapMode?: ImageWrapMode | null
  wrapTextSide?: ImageWrapTextSide | null
  anchorMode?: ImageAnchorMode | null
  lockAspectRatio?: boolean | null
  distanceTop?: number | null
  distanceRight?: number | null
  distanceBottom?: number | null
  distanceLeft?: number | null
  offsetX?: number | null
  offsetY?: number | null
  allowOverlap?: boolean | null
  zIndex?: number | null
  borderVisible?: boolean | null
  borderColor?: string | null
  borderWidthPt?: number | null
  borderDash?: ImageBorderDash | null
}

export type SetImageLayoutOptions = Partial<CustomImageAttributes>

export interface SetImageCropOptions {
  top?: number | null
  right?: number | null
  bottom?: number | null
  left?: number | null
}

export type ProtectedSrcResolution = string | Blob

export interface CustomImageOptions extends TiptapImageOptions {
  getAccessToken: () => string
  isProtectedSrc: (src: string) => boolean
  resolveProtectedSrc?: (src: string, token: string) => Promise<ProtectedSrcResolution>
  minSize: number
  defaultAlign: ImageAlignment
  defaultWrapMode: ImageWrapMode
  defaultAnchorMode: ImageAnchorMode
  defaultDisplay: ImageDisplayMode
  defaultDistance: number
}

export type ImageUploadContext = Record<string, unknown>
export type CustomImageUploadHandler = (file: File, context?: ImageUploadContext) => Promise<{ url: string }>
