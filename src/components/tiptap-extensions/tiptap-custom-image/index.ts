export { CustomImage, CustomImage as Image } from './CustomImage'
export {
  IMAGE_ALIGNMENTS,
  IMAGE_ANCHOR_MODES,
  IMAGE_DISPLAY_MODES,
  IMAGE_SIZE_REFERENCES,
  IMAGE_SIZE_UNITS,
  IMAGE_WRAP_MODES,
  type CustomImageAttributes,
  type CustomImageOptions,
  type CustomImageUploadHandler,
  type SetImageCropOptions,
  type ImageAlignment,
  type ImageAnchorMode,
  type ImageDisplayMode,
  type ImageSizeReference,
  type ImageSizeUnit,
  type ImageUploadContext,
  type ImageWrapMode,
  type ProtectedSrcResolution,
  type SetImageLayoutOptions
} from './types'
export { convertCropRatioToWordValue, hasImageCrop, normalizeImageCrop, resolveImageCropDimensions } from './cropUtils'
export { DOCUMENT_IMAGE_UI_EVENT, dispatchDocumentImageUiMode, type DocumentImageUiMode } from './pictureUiEvents'
export {
  isFloatingWrapMode,
  isOverlayWrapMode,
  resolveFloatingSide,
  resolveImageWrapPreset,
  resolveWordWrapTextSide,
  type ImageFloatingSide,
  type WordWrapTextSide
} from './wrapUtils'
export {
  convertWrapPolygonToWordCoordinates,
  resolveWordLikeImageLayout,
  type WordLikeImageLayout,
  type WordLikeImageLayoutContext,
  type WordWrapPolygon,
  type WordWrapPolygonPoint
} from './wrapLayoutEngine'
export {
  analyzeImageWrapContour,
  buildShapeOutsidePolygon,
  deserializeImageWrapContour,
  resolveContourSlicesForWrapMode,
  serializeImageWrapContour,
  type ImageWrapContour,
  type WrapContourPoint,
  type WrapContourSlice,
  type WrapContourSpan
} from './wrapContourUtils'
