import type { CSSProperties } from 'react'
import { hasImageCrop, normalizeImageCrop, resolveImageCropDimensions } from './cropUtils'
import type { ImageMeasurementContext } from './sizeUtils'
import { resolveImageDimensions } from './sizeUtils'
import {
  normalizeImageAlign,
  normalizeImageAnchorMode,
  normalizeImageBorderColor,
  normalizeImageBorderDash,
  normalizeImageBorderWidthPt,
  normalizeImageWrapMode
} from './styleUtils'
import {
  DEFAULT_IMAGE_BORDER_COLOR,
  DEFAULT_IMAGE_BORDER_DASH,
  DEFAULT_IMAGE_BORDER_WIDTH_PT,
  type CustomImageAttributes,
  type ImageBorderDash
} from './types'
import type { ImageWrapContour } from './wrapContourUtils'
import {
  resolveFloatingSide,
  resolveWordWrapTextSide,
  type ImageFloatingSide,
  type WordWrapTextSide
} from './wrapUtils'

export interface WordWrapPolygonPoint {
  x: number
  y: number
}

export interface WordWrapPolygon {
  points: WordWrapPolygonPoint[]
  source:
    | 'frame-rect'
    | 'cropped-frame-rect'
    | 'rotated-frame-fallback'
    | 'tight-fallback'
    | 'through-fallback'
    | 'alpha-mask-outer'
  supportsInnerContours: boolean
}

export interface WordLikeImageLayoutContext extends ImageMeasurementContext {
  displaySrc?: string | null
  wrapContour?: ImageWrapContour | null
}

export interface WordLikeImageBorderStyle {
  visible: boolean
  color: string
  widthPt: number
  widthPx: number
  dash: ImageBorderDash
  dashArray: string | null
  inset: number
  radius: number
}

export interface WordLikeImageLayout {
  wrapMode: NonNullable<CustomImageAttributes['wrapMode']>
  align: NonNullable<CustomImageAttributes['align']>
  anchorMode: NonNullable<CustomImageAttributes['anchorMode']>
  renderMode: 'local' | 'overlay'
  flowMode: 'inline' | 'float' | 'block' | 'overlay-anchor'
  measurementMode: 'flow' | 'overlay'
  overlayLayer: 'behind' | 'floating' | 'front' | null
  overlayZIndex: number | null
  floatingSide: ImageFloatingSide | null
  wrapTextSide: WordWrapTextSide | null
  anchorReference: 'inline' | 'paragraph' | 'page'
  frameWidth: number
  frameHeight: number
  layoutWidth: number
  layoutHeight: number
  figureLeft: number
  figureTop: number
  visualBottom: number
  exclusionMode: 'none' | 'square' | 'polygon' | 'top-bottom'
  wrapPolygon: WordWrapPolygon | null
  fallbackStrategy: string
  crop: ReturnType<typeof normalizeImageCrop>
  cropDimensions: ReturnType<typeof resolveImageCropDimensions>
  imageBorder: WordLikeImageBorderStyle
  renderedImageStyle: CSSProperties
  cropViewportStyle: CSSProperties
  imageFrameStyle: CSSProperties
  wrapperStyle: CSSProperties
  figureStyle: CSSProperties
  runtimeAttributes: Record<string, string>
}

function toPixelValue(value: number | null | undefined) {
  return Math.max(1, Math.round(value ?? 1))
}

function clampNonNegative(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function clampPolygonPoint(value: number) {
  return Math.min(1, Math.max(0, value))
}

function roundToHundredths(value: number) {
  return Math.round(value * 100) / 100
}

function pointsToPixels(points: number) {
  return roundToHundredths((points * 96) / 72)
}

function resolveBorderDashArray(dash: ImageBorderDash, widthPx: number): string | null {
  const unit = Math.max(1, widthPx)

  switch (dash) {
    case 'dot':
      return `${roundToHundredths(unit)} ${roundToHundredths(unit * 1.5)}`
    case 'dash':
      return `${roundToHundredths(unit * 3)} ${roundToHundredths(unit * 2)}`
    case 'dash-dot':
      return `${roundToHundredths(unit * 3)} ${roundToHundredths(unit * 1.75)} ${roundToHundredths(unit)} ${roundToHundredths(unit * 1.75)}`
    case 'dash-dot-dot':
      return `${roundToHundredths(unit * 3)} ${roundToHundredths(unit * 1.5)} ${roundToHundredths(unit)} ${roundToHundredths(unit * 1.5)} ${roundToHundredths(unit)} ${roundToHundredths(unit * 1.5)}`
    case 'solid':
    default:
      return null
  }
}

function createRectPolygon(source: WordWrapPolygon['source']): WordWrapPolygon {
  return {
    points: [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 0 },
      { x: 0, y: 0 }
    ],
    source,
    supportsInnerContours: false
  }
}

function resolveWrapPolygon(
  attributes: CustomImageAttributes,
  contour?: ImageWrapContour | null
): WordWrapPolygon | null {
  const wrapMode = normalizeImageWrapMode(attributes.wrapMode, 'inline')
  if (wrapMode !== 'tight' && wrapMode !== 'through') {
    return null
  }

  if (contour?.polygon.points.length) {
    return contour.polygon
  }

  if ((attributes.rotation ?? 0) !== 0) {
    return createRectPolygon('rotated-frame-fallback')
  }

  if (hasImageCrop(attributes)) {
    return createRectPolygon('cropped-frame-rect')
  }

  return createRectPolygon(wrapMode === 'through' ? 'through-fallback' : 'tight-fallback')
}

export function convertWrapPolygonToWordCoordinates(
  polygon: WordWrapPolygon | null,
  coordinateSpace = 21600
): WordWrapPolygonPoint[] {
  if (!polygon) {
    return []
  }

  return polygon.points.map(point => ({
    x: Math.round(clampPolygonPoint(point.x) * coordinateSpace),
    y: Math.round(clampPolygonPoint(point.y) * coordinateSpace)
  }))
}

function resolveHorizontalAnchorStyle(
  align: NonNullable<CustomImageAttributes['align']>,
  offsetX: number,
  distanceLeft: number,
  distanceRight: number
): CSSProperties {
  if (align === 'center') {
    return {
      left: `calc(50% + ${offsetX}px)`,
      transform: 'translateX(-50%)'
    }
  }

  if (align === 'right') {
    return {
      right: `${distanceRight - offsetX}px`
    }
  }

  return {
    left: `${distanceLeft + offsetX}px`
  }
}

export function resolveWordLikeImageLayout(
  attributes: CustomImageAttributes,
  context: WordLikeImageLayoutContext = {}
): WordLikeImageLayout {
  const wrapMode = normalizeImageWrapMode(attributes.wrapMode, 'inline')
  const align = normalizeImageAlign(attributes.align, 'left')
  const anchorMode = normalizeImageAnchorMode(
    attributes.anchorMode,
    wrapMode === 'inline' ? 'inline' : 'move-with-text'
  )
  const resolvedDimensions = resolveImageDimensions(attributes, context)
  const frameWidth = toPixelValue(resolvedDimensions.width)
  const frameHeight = toPixelValue(resolvedDimensions.height)
  const offsetX = attributes.offsetX ?? 0
  const offsetY = attributes.offsetY ?? 0
  const distanceTop = attributes.distanceTop ?? 0
  const distanceRight = attributes.distanceRight ?? 0
  const distanceBottom = attributes.distanceBottom ?? 0
  const distanceLeft = attributes.distanceLeft ?? 0
  const overhangLeft = Math.max(0, -offsetX)
  const overhangRight = Math.max(0, offsetX)
  const overhangTop = Math.max(0, -offsetY)
  const overhangBottom = Math.max(0, offsetY)
  const marginTop = clampNonNegative(distanceTop + overhangTop)
  const marginRight = clampNonNegative(distanceRight + overhangRight)
  const marginBottom = clampNonNegative(distanceBottom + overhangBottom)
  const marginLeft = clampNonNegative(distanceLeft + overhangLeft)
  const figureLeft = marginLeft + offsetX
  const figureTop = marginTop + offsetY
  const layoutWidth = Math.max(1, Math.round(frameWidth + marginLeft + marginRight))
  const layoutHeight = Math.max(1, Math.round(frameHeight + marginTop + marginBottom))
  const floatingSide =
    wrapMode === 'square' || wrapMode === 'tight' || wrapMode === 'through'
      ? resolveFloatingSide({ wrapMode, align, wrapTextSide: attributes.wrapTextSide })
      : null
  const wrapTextSide =
    wrapMode === 'square' || wrapMode === 'tight' || wrapMode === 'through'
      ? resolveWordWrapTextSide({ wrapMode, align, wrapTextSide: attributes.wrapTextSide })
      : null
  const anchorReference = wrapMode === 'inline' ? 'inline' : anchorMode === 'fixed' ? 'page' : 'paragraph'
  const crop = normalizeImageCrop(attributes)
  const cropDimensions = resolveImageCropDimensions({
    width: frameWidth,
    height: frameHeight,
    crop
  })
  const borderVisible = attributes.borderVisible ?? false
  const borderColor =
    normalizeImageBorderColor(attributes.borderColor, DEFAULT_IMAGE_BORDER_COLOR) ?? DEFAULT_IMAGE_BORDER_COLOR
  const borderWidthPt =
    normalizeImageBorderWidthPt(attributes.borderWidthPt, DEFAULT_IMAGE_BORDER_WIDTH_PT) ??
    DEFAULT_IMAGE_BORDER_WIDTH_PT
  const borderDash = normalizeImageBorderDash(attributes.borderDash, DEFAULT_IMAGE_BORDER_DASH)
  const borderWidthPx = pointsToPixels(borderWidthPt)
  const imageBorder: WordLikeImageBorderStyle = {
    visible: borderVisible,
    color: borderColor,
    widthPt: borderWidthPt,
    widthPx: borderWidthPx,
    dash: borderDash,
    dashArray: borderVisible ? resolveBorderDashArray(borderDash, borderWidthPx) : null,
    inset: borderWidthPx / 2,
    radius: 8
  }
  const wrapPolygon = resolveWrapPolygon(attributes, context.wrapContour)
  const renderedImageStyle: CSSProperties = {
    width: cropDimensions.renderedWidth,
    height: cropDimensions.renderedHeight,
    maxWidth: 'none',
    position: 'absolute',
    left: cropDimensions.offsetX,
    top: cropDimensions.offsetY,
    userSelect: 'none'
  }
  const cropViewportStyle: CSSProperties = {
    width: frameWidth,
    height: frameHeight,
    overflow: 'hidden',
    position: 'relative',
    borderRadius: 8
  }
  const imageFrameStyle: CSSProperties = {
    width: frameWidth,
    height: frameHeight,
    transform: resolvedDimensions.rotation ? `rotate(${resolvedDimensions.rotation}deg)` : undefined,
    transformOrigin: 'center center'
  }
  const baseFigureStyle: CSSProperties = {
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    width: frameWidth,
    maxWidth: '100%',
    textAlign: align
  }

  let wrapperStyle: CSSProperties
  let figureStyle: CSSProperties
  let exclusionMode: WordLikeImageLayout['exclusionMode']
  let fallbackStrategy = 'word-layout-frame'
  let renderMode: WordLikeImageLayout['renderMode'] = 'local'
  let flowMode: WordLikeImageLayout['flowMode'] = 'inline'
  let measurementMode: WordLikeImageLayout['measurementMode'] = 'flow'
  let overlayLayer: WordLikeImageLayout['overlayLayer'] = null
  let overlayZIndex: WordLikeImageLayout['overlayZIndex'] = null

  if (wrapMode === 'inline') {
    exclusionMode = 'none'
    wrapperStyle = {
      display: 'inline-block',
      position: 'relative',
      width: layoutWidth,
      minHeight: layoutHeight,
      maxWidth: '100%',
      verticalAlign: 'baseline'
    }
    figureStyle = {
      ...baseFigureStyle,
      position: 'absolute',
      left: figureLeft,
      top: figureTop
    }
  } else if (wrapMode === 'square' && anchorMode !== 'fixed') {
    exclusionMode = 'square'
    renderMode = 'overlay'
    flowMode = 'float'
    measurementMode = 'overlay'
    overlayLayer = 'floating'
    overlayZIndex = Math.max(1, attributes.zIndex ?? 1)
    wrapperStyle = {
      display: 'inline-block',
      position: 'relative',
      width: 0,
      height: 0,
      overflow: 'visible',
      minHeight: 0,
      verticalAlign: 'baseline',
      pointerEvents: 'none'
    }
    figureStyle = {
      ...baseFigureStyle,
      position: 'absolute',
      left: figureLeft,
      top: figureTop
    }
    fallbackStrategy = 'square-decoration-exclusion'
  } else if (wrapMode === 'top-bottom') {
    exclusionMode = 'top-bottom'
    renderMode = 'overlay'
    flowMode = 'block'
    measurementMode = 'overlay'
    overlayLayer = 'floating'
    overlayZIndex = Math.max(1, attributes.zIndex ?? 1)
    wrapperStyle = {
      display: 'inline-block',
      position: 'relative',
      width: 0,
      height: 0,
      overflow: 'visible',
      minHeight: 0,
      verticalAlign: 'baseline'
    }
    figureStyle = {
      ...baseFigureStyle,
      position: 'absolute',
      top: figureTop,
      zIndex: overlayZIndex,
      ...resolveHorizontalAnchorStyle(align, offsetX, distanceLeft, distanceRight)
    }
  } else if (wrapMode === 'behind' || wrapMode === 'front') {
    exclusionMode = 'none'
    renderMode = 'overlay'
    flowMode = 'overlay-anchor'
    measurementMode = 'overlay'
    overlayLayer = wrapMode
    overlayZIndex = Math.max(1, attributes.zIndex ?? 1)
    wrapperStyle = {
      display: 'inline-block',
      position: 'relative',
      width: 0,
      height: 0,
      overflow: 'visible',
      minHeight: 0,
      verticalAlign: 'baseline'
    }
    figureStyle = {
      ...baseFigureStyle,
      position: 'absolute',
      top: offsetY,
      zIndex: wrapMode === 'behind' ? 0 : overlayZIndex,
      ...resolveHorizontalAnchorStyle(align, offsetX, distanceLeft, distanceRight)
    }
    fallbackStrategy = anchorMode === 'fixed' ? 'page-anchor-approximation' : 'overlay-anchor'
  } else {
    exclusionMode = wrapMode === 'tight' || wrapMode === 'through' ? 'polygon' : 'square'
    renderMode = 'overlay'
    flowMode = 'float'
    measurementMode = 'overlay'
    overlayLayer = 'floating'
    overlayZIndex = Math.max(1, attributes.zIndex ?? 1)
    wrapperStyle = {
      display: 'inline-block',
      position: 'relative',
      width: 0,
      height: 0,
      overflow: 'visible',
      minHeight: 0,
      verticalAlign: 'baseline'
    }
    figureStyle = {
      ...baseFigureStyle,
      position: 'absolute',
      left: figureLeft,
      top: figureTop
    }
    if (wrapMode === 'through') {
      fallbackStrategy =
        wrapPolygon?.source === 'alpha-mask-outer'
          ? wrapPolygon.supportsInnerContours
            ? 'through-alpha-mask'
            : 'through-alpha-mask-outer-fallback'
          : wrapPolygon?.supportsInnerContours
            ? 'through-inner-contours'
            : 'through-outer-contour-fallback'
    } else if (wrapMode === 'tight') {
      fallbackStrategy = wrapPolygon?.source === 'alpha-mask-outer' ? 'tight-alpha-mask' : 'tight-outer-contour'
    }
  }

  return {
    wrapMode,
    align,
    anchorMode,
    renderMode,
    flowMode,
    measurementMode,
    overlayLayer,
    overlayZIndex,
    floatingSide,
    wrapTextSide,
    anchorReference,
    frameWidth,
    frameHeight,
    layoutWidth,
    layoutHeight,
    figureLeft,
    figureTop,
    visualBottom: Math.max(1, figureTop + frameHeight),
    exclusionMode,
    wrapPolygon,
    fallbackStrategy,
    crop,
    cropDimensions,
    imageBorder,
    renderedImageStyle,
    cropViewportStyle,
    imageFrameStyle,
    wrapperStyle,
    figureStyle,
    runtimeAttributes: {
      'data-image-layout-height': String(measurementMode === 'overlay' ? 0 : layoutHeight),
      'data-image-layout-width': String(measurementMode === 'overlay' ? 0 : layoutWidth),
      'data-image-visual-bottom': String(measurementMode === 'overlay' ? 0 : Math.max(1, figureTop + frameHeight)),
      'data-image-anchor-reference': anchorReference,
      'data-image-exclusion-mode': exclusionMode,
      'data-image-wrap-text-side': wrapTextSide ?? 'none',
      'data-image-flow-mode': flowMode,
      'data-image-measurement-mode': measurementMode,
      'data-image-render-mode': renderMode,
      'data-image-wrap-mode': wrapMode,
      'data-image-wrap-polygon-source': wrapPolygon?.source ?? 'none',
      'data-image-wrap-fallback': fallbackStrategy
    }
  }
}
