export { CustomImage, CustomImage as Image } from './CustomImage'
export {
  IMAGE_ALIGNMENTS,
  IMAGE_ANCHOR_MODES,
  IMAGE_BORDER_DASHES,
  IMAGE_BORDER_WEIGHT_PRESETS,
  IMAGE_DISPLAY_MODES,
  IMAGE_SIZE_REFERENCES,
  IMAGE_SIZE_UNITS,
  IMAGE_WRAP_MODES,
  IMAGE_WRAP_TEXT_SIDES,
  IMAGE_WRAP_UI_OPTIONS,
  IMAGE_WRAP_TEXT_SIDE_UI_OPTIONS,
  DEFAULT_IMAGE_BORDER_COLOR,
  DEFAULT_IMAGE_BORDER_DASH,
  DEFAULT_IMAGE_BORDER_WIDTH_PT,
  LEGACY_IMAGE_WRAP_MODE_TO_ALIGN,
  LEGACY_IMAGE_WRAP_MODE_TO_TEXT_SIDE,
  type CustomImageAttributes,
  type CustomImageOptions,
  type CustomImageUploadHandler,
  type SetImageCropOptions,
  type ImageAlignment,
  type ImageAnchorMode,
  type ImageBorderDash,
  type ImageDisplayMode,
  type ImageWrapTextSide,
  type LegacyImageWrapMode,
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
  resolveLegacyImagePreset,
  resolveImageWrapPreset,
  resolveSquareWrapTextSideSelection,
  resolveWordWrapTextSide,
  type LegacyImageWrapPreset,
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
