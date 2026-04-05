import type { ImageOptions as TiptapImageOptions } from '@tiptap/extension-image'

export const IMAGE_ALIGNMENTS = ['left', 'center', 'right'] as const
export const IMAGE_SIZE_UNITS = ['px', 'percent'] as const
export const IMAGE_SIZE_REFERENCES = ['page'] as const
export const IMAGE_WRAP_MODES = [
  'inline',
  'square-left',
  'square-right',
  'tight',
  'through',
  'top-bottom',
  'behind',
  'front'
] as const
export const IMAGE_ANCHOR_MODES = ['inline', 'move-with-text', 'fixed'] as const
export const IMAGE_DISPLAY_MODES = ['inline', 'block'] as const

export type ImageAlignment = (typeof IMAGE_ALIGNMENTS)[number]
export type ImageSizeUnit = (typeof IMAGE_SIZE_UNITS)[number]
export type ImageSizeReference = (typeof IMAGE_SIZE_REFERENCES)[number]
export type ImageWrapMode = (typeof IMAGE_WRAP_MODES)[number]
export type ImageAnchorMode = (typeof IMAGE_ANCHOR_MODES)[number]
export type ImageDisplayMode = (typeof IMAGE_DISPLAY_MODES)[number]

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
