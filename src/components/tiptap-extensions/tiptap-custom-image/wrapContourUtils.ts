import type { CustomImageAttributes } from './types'

export interface WrapContourPoint {
  x: number
  y: number
}

export interface WrapContourSpan {
  start: number
  end: number
}

export interface WrapContourSlice {
  top: number
  bottom: number
  spans: WrapContourSpan[]
}

export interface ImageWrapContour {
  polygon: {
    points: WrapContourPoint[]
    source: 'alpha-mask-outer'
    supportsInnerContours: boolean
  }
  slices: WrapContourSlice[]
  hasInteriorOpenings: boolean
}

const MAX_CONTOUR_SAMPLE_DIMENSION = 96
const ALPHA_THRESHOLD = 16

function clampUnit(value: number) {
  return Math.min(1, Math.max(0, value))
}

function normalizeSliceSpan(start: number, end: number, width: number): WrapContourSpan | null {
  if (width <= 0 || end <= start) {
    return null
  }

  const normalizedStart = clampUnit(start / width)
  const normalizedEnd = clampUnit(end / width)
  return normalizedEnd > normalizedStart
    ? {
        start: normalizedStart,
        end: normalizedEnd
      }
    : null
}

function mergeAdjacentSlices(slices: WrapContourSlice[]): WrapContourSlice[] {
  const merged: WrapContourSlice[] = []

  slices.forEach(slice => {
    const previous = merged[merged.length - 1]
    if (!previous || previous.spans.length !== slice.spans.length) {
      merged.push(slice)
      return
    }

    const spansMatch = previous.spans.every((span, index) => {
      const nextSpan = slice.spans[index]
      return (
        nextSpan !== undefined &&
        Math.abs(span.start - nextSpan.start) < 0.0001 &&
        Math.abs(span.end - nextSpan.end) < 0.0001
      )
    })

    if (!spansMatch) {
      merged.push(slice)
      return
    }

    previous.bottom = slice.bottom
  })

  return merged
}

function buildOuterPolygonFromSlices(slices: WrapContourSlice[]): WrapContourPoint[] {
  const leftBoundary = slices.map(slice => ({
    x: slice.spans[0]?.start ?? 0,
    y: clampUnit((slice.top + slice.bottom) / 2)
  }))
  const rightBoundary = [...slices].reverse().map(slice => ({
    x: slice.spans[slice.spans.length - 1]?.end ?? 1,
    y: clampUnit((slice.top + slice.bottom) / 2)
  }))

  const topLeft = {
    x: slices[0]?.spans[0]?.start ?? 0,
    y: slices[0]?.top ?? 0
  }
  const topRight = {
    x: slices[0]?.spans[slices[0].spans.length - 1]?.end ?? 1,
    y: slices[0]?.top ?? 0
  }
  const bottomRight = {
    x: slices[slices.length - 1]?.spans[slices[slices.length - 1].spans.length - 1]?.end ?? 1,
    y: slices[slices.length - 1]?.bottom ?? 1
  }
  const bottomLeft = {
    x: slices[slices.length - 1]?.spans[0]?.start ?? 0,
    y: slices[slices.length - 1]?.bottom ?? 1
  }

  return [topLeft, ...leftBoundary, bottomLeft, bottomRight, ...rightBoundary, topRight, topLeft].map(point => ({
    x: clampUnit(point.x),
    y: clampUnit(point.y)
  }))
}

function getContourCanvasDimensions(width: number, height: number) {
  if (width <= 0 || height <= 0) {
    return null
  }

  if (width >= height) {
    const sampleWidth = Math.min(MAX_CONTOUR_SAMPLE_DIMENSION, Math.max(8, Math.round(width)))
    const sampleHeight = Math.max(8, Math.round((height / width) * sampleWidth))
    return { width: sampleWidth, height: sampleHeight }
  }

  const sampleHeight = Math.min(MAX_CONTOUR_SAMPLE_DIMENSION, Math.max(8, Math.round(height)))
  const sampleWidth = Math.max(8, Math.round((width / height) * sampleHeight))
  return { width: sampleWidth, height: sampleHeight }
}

function createRectContour(): ImageWrapContour {
  const slices = [
    {
      top: 0,
      bottom: 1,
      spans: [{ start: 0, end: 1 }]
    }
  ]

  return {
    polygon: {
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: 0 },
        { x: 0, y: 0 }
      ],
      source: 'alpha-mask-outer',
      supportsInnerContours: false
    },
    slices,
    hasInteriorOpenings: false
  }
}

export function analyzeImageWrapContour(
  image: HTMLImageElement,
  attributes: Pick<CustomImageAttributes, 'rotation' | 'cropTop' | 'cropRight' | 'cropBottom' | 'cropLeft'>
): ImageWrapContour | null {
  if ((attributes.rotation ?? 0) !== 0) {
    return createRectContour()
  }

  const naturalWidth = Math.round(image.naturalWidth)
  const naturalHeight = Math.round(image.naturalHeight)
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return null
  }

  const cropLeft = clampUnit(attributes.cropLeft ?? 0)
  const cropRight = clampUnit(attributes.cropRight ?? 0)
  const cropTop = clampUnit(attributes.cropTop ?? 0)
  const cropBottom = clampUnit(attributes.cropBottom ?? 0)
  const sourceWidth = naturalWidth * Math.max(0.01, 1 - cropLeft - cropRight)
  const sourceHeight = naturalHeight * Math.max(0.01, 1 - cropTop - cropBottom)
  const canvasDimensions = getContourCanvasDimensions(sourceWidth, sourceHeight)
  if (!canvasDimensions) {
    return null
  }

  const canvas = document.createElement('canvas')
  canvas.width = canvasDimensions.width
  canvas.height = canvasDimensions.height

  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    return null
  }

  try {
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.drawImage(
      image,
      cropLeft * naturalWidth,
      cropTop * naturalHeight,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height
    )
  } catch {
    return createRectContour()
  }

  let imageData: ImageData
  try {
    imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  } catch {
    return createRectContour()
  }

  const slices: WrapContourSlice[] = []
  let hasInteriorOpenings = false

  for (let y = 0; y < canvas.height; y += 1) {
    const spans: WrapContourSpan[] = []
    let startX: number | null = null

    for (let x = 0; x < canvas.width; x += 1) {
      const alpha = imageData.data[(y * canvas.width + x) * 4 + 3]
      const opaque = alpha >= ALPHA_THRESHOLD

      if (opaque && startX == null) {
        startX = x
      }

      if (!opaque && startX != null) {
        const span = normalizeSliceSpan(startX, x, canvas.width)
        if (span) {
          spans.push(span)
        }
        startX = null
      }
    }

    if (startX != null) {
      const span = normalizeSliceSpan(startX, canvas.width, canvas.width)
      if (span) {
        spans.push(span)
      }
    }

    if (spans.length === 0) {
      continue
    }

    if (spans.length > 1) {
      hasInteriorOpenings = true
    }

    slices.push({
      top: y / canvas.height,
      bottom: (y + 1) / canvas.height,
      spans
    })
  }

  if (slices.length === 0) {
    return createRectContour()
  }

  const mergedSlices = mergeAdjacentSlices(slices)

  return {
    polygon: {
      points: buildOuterPolygonFromSlices(mergedSlices),
      source: 'alpha-mask-outer',
      supportsInnerContours: hasInteriorOpenings
    },
    slices: mergedSlices,
    hasInteriorOpenings
  }
}

export function areImageWrapContoursEqual(left: ImageWrapContour | null, right: ImageWrapContour | null): boolean {
  if (left === right) {
    return true
  }

  if (!left || !right) {
    return false
  }

  if (
    left.hasInteriorOpenings !== right.hasInteriorOpenings ||
    left.polygon.source !== right.polygon.source ||
    left.polygon.supportsInnerContours !== right.polygon.supportsInnerContours ||
    left.polygon.points.length !== right.polygon.points.length ||
    left.slices.length !== right.slices.length
  ) {
    return false
  }

  for (let pointIndex = 0; pointIndex < left.polygon.points.length; pointIndex += 1) {
    const leftPoint = left.polygon.points[pointIndex]
    const rightPoint = right.polygon.points[pointIndex]

    if (!rightPoint || leftPoint.x !== rightPoint.x || leftPoint.y !== rightPoint.y) {
      return false
    }
  }

  for (let sliceIndex = 0; sliceIndex < left.slices.length; sliceIndex += 1) {
    const leftSlice = left.slices[sliceIndex]
    const rightSlice = right.slices[sliceIndex]

    if (
      !rightSlice ||
      leftSlice.top !== rightSlice.top ||
      leftSlice.bottom !== rightSlice.bottom ||
      leftSlice.spans.length !== rightSlice.spans.length
    ) {
      return false
    }

    for (let spanIndex = 0; spanIndex < leftSlice.spans.length; spanIndex += 1) {
      const leftSpan = leftSlice.spans[spanIndex]
      const rightSpan = rightSlice.spans[spanIndex]

      if (!rightSpan || leftSpan.start !== rightSpan.start || leftSpan.end !== rightSpan.end) {
        return false
      }
    }
  }

  return true
}

export function serializeImageWrapContour(contour: ImageWrapContour | null): string | null {
  if (!contour) {
    return null
  }

  return JSON.stringify(contour)
}

export function deserializeImageWrapContour(value: string | null | undefined): ImageWrapContour | null {
  if (!value) {
    return null
  }

  try {
    const parsed = JSON.parse(value) as Partial<ImageWrapContour>
    if (!Array.isArray(parsed.slices) || !parsed.polygon || !Array.isArray(parsed.polygon.points)) {
      return null
    }

    const slices = parsed.slices
      .map(slice => ({
        top: clampUnit(Number(slice.top ?? 0)),
        bottom: clampUnit(Number(slice.bottom ?? 0)),
        spans: Array.isArray(slice.spans)
          ? slice.spans
              .map(span => ({
                start: clampUnit(Number(span.start ?? 0)),
                end: clampUnit(Number(span.end ?? 0))
              }))
              .filter(span => span.end > span.start)
          : []
      }))
      .filter(slice => slice.bottom > slice.top && slice.spans.length > 0)

    if (slices.length === 0) {
      return null
    }

    const polygonPoints = parsed.polygon.points
      .map(point => ({
        x: clampUnit(Number(point.x ?? 0)),
        y: clampUnit(Number(point.y ?? 0))
      }))
      .filter(point => Number.isFinite(point.x) && Number.isFinite(point.y))

    if (polygonPoints.length < 3) {
      return null
    }

    return {
      polygon: {
        points: polygonPoints,
        source: 'alpha-mask-outer',
        supportsInnerContours: parsed.polygon.supportsInnerContours === true
      },
      slices,
      hasInteriorOpenings: parsed.hasInteriorOpenings === true
    }
  } catch {
    return null
  }
}

export function resolveContourSlicesForWrapMode(
  contour: ImageWrapContour | null,
  wrapMode: CustomImageAttributes['wrapMode']
): WrapContourSlice[] {
  if (!contour) {
    return []
  }

  if (wrapMode === 'through') {
    return contour.slices
  }

  return contour.slices.map(slice => ({
    top: slice.top,
    bottom: slice.bottom,
    spans: [
      {
        start: slice.spans[0]?.start ?? 0,
        end: slice.spans[slice.spans.length - 1]?.end ?? 1
      }
    ]
  }))
}

export function buildShapeOutsidePolygon(contour: ImageWrapContour | null): string | undefined {
  if (!contour || contour.polygon.points.length < 3) {
    return undefined
  }

  return `polygon(${contour.polygon.points.map(point => `${(point.x * 100).toFixed(2)}% ${(point.y * 100).toFixed(2)}%`).join(', ')})`
}
