import type { CSSProperties } from 'react'
import { hasImageCrop, normalizeImageCrop, resolveImageCropDimensions } from './cropUtils'
import type { ImageMeasurementContext } from './sizeUtils'
import { resolveImageDimensions } from './sizeUtils'
import { normalizeImageAlign, normalizeImageAnchorMode, normalizeImageWrapMode } from './styleUtils'
import type { CustomImageAttributes } from './types'
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
  source: 'frame-rect' | 'cropped-frame-rect' | 'rotated-frame-fallback' | 'tight-fallback' | 'through-fallback'
  supportsInnerContours: boolean
}

export interface WordLikeImageLayoutContext extends ImageMeasurementContext {
  displaySrc?: string | null
}

export interface WordLikeImageLayout {
  wrapMode: NonNullable<CustomImageAttributes['wrapMode']>
  align: NonNullable<CustomImageAttributes['align']>
  anchorMode: NonNullable<CustomImageAttributes['anchorMode']>
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

function resolveWrapPolygon(attributes: CustomImageAttributes): WordWrapPolygon | null {
  const wrapMode = normalizeImageWrapMode(attributes.wrapMode, 'inline')
  if (wrapMode !== 'tight' && wrapMode !== 'through') {
    return null
  }

  if ((attributes.rotation ?? 0) !== 0) {
    return createRectPolygon('rotated-frame-fallback')
  }

  if (hasImageCrop(attributes)) {
    return createRectPolygon('cropped-frame-rect')
  }

  return createRectPolygon(wrapMode === 'through' ? 'through-fallback' : 'tight-fallback')
}

function convertPolygonToCssValue(
  polygon: WordWrapPolygon | null,
  bounds: {
    figureLeft: number
    figureTop: number
    figureWidth: number
    figureHeight: number
    layoutWidth: number
    layoutHeight: number
  }
) {
  if (!polygon || bounds.layoutWidth <= 0 || bounds.layoutHeight <= 0) {
    return undefined
  }

  const points = polygon.points.map(point => {
    const x = ((bounds.figureLeft + point.x * bounds.figureWidth) / bounds.layoutWidth) * 100
    const y = ((bounds.figureTop + point.y * bounds.figureHeight) / bounds.layoutHeight) * 100
    return `${x.toFixed(3)}% ${y.toFixed(3)}%`
  })

  return `polygon(${points.join(', ')})`
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
    wrapMode === 'square-left' || wrapMode === 'square-right' || wrapMode === 'tight' || wrapMode === 'through'
      ? resolveFloatingSide({ wrapMode, align })
      : null
  const wrapTextSide =
    wrapMode === 'square-left' || wrapMode === 'square-right' || wrapMode === 'tight' || wrapMode === 'through'
      ? resolveWordWrapTextSide({ wrapMode, align })
      : null
  const anchorReference = wrapMode === 'inline' ? 'inline' : anchorMode === 'fixed' ? 'page' : 'paragraph'
  const crop = normalizeImageCrop(attributes)
  const cropDimensions = resolveImageCropDimensions({
    width: frameWidth,
    height: frameHeight,
    crop
  })
  const wrapPolygon = resolveWrapPolygon(attributes)
  const shapeOutside = convertPolygonToCssValue(wrapPolygon, {
    figureLeft,
    figureTop,
    figureWidth: frameWidth,
    figureHeight: frameHeight,
    layoutWidth,
    layoutHeight
  })
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
  } else if (wrapMode === 'top-bottom') {
    exclusionMode = 'top-bottom'
    wrapperStyle = {
      display: 'block',
      position: 'relative',
      width: '100%',
      minHeight: layoutHeight,
      clear: 'both',
      overflow: 'visible'
    }
    figureStyle = {
      ...baseFigureStyle,
      position: 'absolute',
      top: figureTop,
      zIndex: Math.max(1, attributes.zIndex ?? 1),
      ...resolveHorizontalAnchorStyle(align, offsetX, distanceLeft, distanceRight)
    }
  } else if (wrapMode === 'behind' || wrapMode === 'front') {
    exclusionMode = 'none'
    wrapperStyle = {
      display: 'inline-block',
      position: 'relative',
      width: 0,
      height: 0,
      overflow: 'visible',
      verticalAlign: 'baseline'
    }
    figureStyle = {
      ...baseFigureStyle,
      position: 'absolute',
      top: offsetY,
      zIndex: wrapMode === 'behind' ? -1 : Math.max(1, attributes.zIndex ?? 1),
      ...resolveHorizontalAnchorStyle(align, offsetX, distanceLeft, distanceRight)
    }
    fallbackStrategy = anchorMode === 'fixed' ? 'page-anchor-approximation' : 'overlay-anchor'
  } else {
    exclusionMode = wrapMode === 'tight' || wrapMode === 'through' ? 'polygon' : 'square'
    wrapperStyle = {
      display: 'block',
      position: 'relative',
      float: floatingSide ?? 'left',
      width: layoutWidth,
      minHeight: layoutHeight,
      maxWidth: '100%',
      ...(shapeOutside ? { shapeOutside } : {}),
      ...(wrapMode === 'tight' || wrapMode === 'through' ? { shapeMargin: '0px' } : {})
    }
    figureStyle = {
      ...baseFigureStyle,
      position: 'absolute',
      left: figureLeft,
      top: figureTop
    }
    if (wrapMode === 'through') {
      fallbackStrategy = wrapPolygon?.supportsInnerContours
        ? 'through-inner-contours'
        : 'through-outer-contour-fallback'
    } else if (wrapMode === 'tight') {
      fallbackStrategy = 'tight-outer-contour'
    }
  }

  return {
    wrapMode,
    align,
    anchorMode,
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
    renderedImageStyle,
    cropViewportStyle,
    imageFrameStyle,
    wrapperStyle,
    figureStyle,
    runtimeAttributes: {
      'data-image-layout-height': String(layoutHeight),
      'data-image-layout-width': String(layoutWidth),
      'data-image-visual-bottom': String(Math.max(1, figureTop + frameHeight)),
      'data-image-anchor-reference': anchorReference,
      'data-image-exclusion-mode': exclusionMode,
      'data-image-wrap-polygon-source': wrapPolygon?.source ?? 'none',
      'data-image-wrap-fallback': fallbackStrategy
    }
  }
}
