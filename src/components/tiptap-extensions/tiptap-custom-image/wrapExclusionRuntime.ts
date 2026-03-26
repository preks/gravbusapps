import type { WordWrapTextSide } from './wrapUtils'
import { deserializeImageWrapContour, resolveContourSlicesForWrapMode } from './wrapContourUtils'

export interface PageWrapBand {
  pageNumber: number
  left: number
  right: number
  top: number
  bottom: number
}

export interface ImageWrapExclusionRect extends PageWrapBand {
  mode: 'square' | 'polygon' | 'top-bottom'
  wrapTextSide: WordWrapTextSide | null
}

export interface WrapExclusionRectLike {
  left: number
  right: number
  top: number
  bottom: number
  height?: number
}

interface ResolveImageWrapExclusionsOptions {
  resolveRect?: (element: HTMLElement) => WrapExclusionRectLike
}

function readExclusionMode(element: HTMLElement): ImageWrapExclusionRect['mode'] | null {
  const value = element.dataset.imageExclusionMode
  if (value === 'square' || value === 'polygon' || value === 'top-bottom') {
    return value
  }

  return null
}

function readWrapTextSide(element: HTMLElement): WordWrapTextSide | null {
  const value = element.dataset.imageWrapTextSide
  if (value === 'bothSides' || value === 'left' || value === 'right') {
    return value
  }

  return null
}

function readWrapMode(
  element: HTMLElement
): 'inline' | 'square-left' | 'square-right' | 'tight' | 'through' | 'top-bottom' | 'behind' | 'front' | null {
  const value = element.dataset.imageWrapMode
  switch (value) {
    case 'inline':
    case 'square-left':
    case 'square-right':
    case 'tight':
    case 'through':
    case 'top-bottom':
    case 'behind':
    case 'front':
      return value
    default:
      return null
  }
}

function resolveBestContainingBand(bodyBands: PageWrapBand[], rect: WrapExclusionRectLike): PageWrapBand | null {
  const probeY = rect.top + Math.max(0, rect.height ?? (rect.bottom - rect.top) / 2)
  let bestBand: { band: PageWrapBand; distance: number } | null = null

  for (const band of bodyBands) {
    const distance = probeY < band.top ? band.top - probeY : probeY > band.bottom ? probeY - band.bottom : 0
    if (bestBand == null || distance < bestBand.distance) {
      bestBand = { band, distance }
    }
  }

  if (!bestBand) {
    return null
  }

  return bestBand.band
}

function clipExclusionToBand(band: PageWrapBand, rect: WrapExclusionRectLike): PageWrapBand | null {
  const left = Math.max(band.left, rect.left)
  const right = Math.min(band.right, rect.right)
  const top = Math.max(band.top, rect.top)
  const bottom = Math.min(band.bottom, rect.bottom)

  if (right <= left || bottom <= top) {
    return null
  }

  return {
    pageNumber: band.pageNumber,
    left,
    right,
    top,
    bottom
  }
}

function createOverlapBands(band: PageWrapBand, exclusion: ImageWrapExclusionRect): PageWrapBand[] {
  if (exclusion.mode === 'top-bottom') {
    return []
  }

  const nextBands: PageWrapBand[] = []
  if (exclusion.wrapTextSide === 'right' || exclusion.wrapTextSide === 'bothSides') {
    if (exclusion.right < band.right) {
      nextBands.push({
        pageNumber: band.pageNumber,
        left: Math.max(exclusion.right, band.left),
        right: band.right,
        top: exclusion.top,
        bottom: exclusion.bottom
      })
    }
  }

  if (exclusion.wrapTextSide === 'left' || exclusion.wrapTextSide === 'bothSides') {
    if (exclusion.left > band.left) {
      nextBands.push({
        pageNumber: band.pageNumber,
        left: band.left,
        right: Math.min(exclusion.left, band.right),
        top: exclusion.top,
        bottom: exclusion.bottom
      })
    }
  }

  return nextBands
}

function subtractExclusionFromBand(band: PageWrapBand, exclusion: ImageWrapExclusionRect): PageWrapBand[] {
  if (band.pageNumber !== exclusion.pageNumber) {
    return [band]
  }

  const overlapLeft = Math.max(band.left, exclusion.left)
  const overlapRight = Math.min(band.right, exclusion.right)
  const overlapTop = Math.max(band.top, exclusion.top)
  const overlapBottom = Math.min(band.bottom, exclusion.bottom)

  if (overlapRight <= overlapLeft || overlapBottom <= overlapTop) {
    return [band]
  }

  const nextBands: PageWrapBand[] = []
  if (band.top < overlapTop) {
    nextBands.push({
      ...band,
      bottom: overlapTop
    })
  }

  nextBands.push(
    ...createOverlapBands(band, {
      ...exclusion,
      top: overlapTop,
      bottom: overlapBottom,
      left: overlapLeft,
      right: overlapRight
    })
  )

  if (overlapBottom < band.bottom) {
    nextBands.push({
      ...band,
      top: overlapBottom
    })
  }

  return nextBands.filter(candidate => candidate.right > candidate.left && candidate.bottom > candidate.top)
}

function sortBands(bands: PageWrapBand[]): PageWrapBand[] {
  return [...bands].sort((left, right) => {
    if (left.pageNumber !== right.pageNumber) {
      return left.pageNumber - right.pageNumber
    }
    if (left.top !== right.top) {
      return left.top - right.top
    }
    if (left.left !== right.left) {
      return left.left - right.left
    }

    return left.right - right.right
  })
}

export function resolveImageWrapExclusions(
  editorElement: HTMLElement,
  bodyBands: PageWrapBand[],
  options: ResolveImageWrapExclusionsOptions = {}
): ImageWrapExclusionRect[] {
  if (bodyBands.length === 0) {
    return []
  }

  const imageAnchors = Array.from(editorElement.querySelectorAll<HTMLElement>('[data-image-exclusion-mode]'))
  const resolveRect = options.resolveRect ?? ((element: HTMLElement) => element.getBoundingClientRect())

  return imageAnchors.flatMap(element => {
    const mode = readExclusionMode(element)
    if (!mode) {
      return []
    }

    const elementRect = resolveRect(element)
    const bodyBand = resolveBestContainingBand(bodyBands, elementRect)
    if (!bodyBand) {
      return []
    }

    const clippedRect = clipExclusionToBand(bodyBand, elementRect)
    if (!clippedRect) {
      return []
    }

    const wrapMode = readWrapMode(element)
    const contour = deserializeImageWrapContour(element.dataset.imageWrapContour)
    const contourSlices = mode === 'polygon' && wrapMode ? resolveContourSlicesForWrapMode(contour, wrapMode) : []
    if (contourSlices.length > 0) {
      const width = clippedRect.right - clippedRect.left
      const height = clippedRect.bottom - clippedRect.top

      return contourSlices.flatMap(slice => {
        const top = clippedRect.top + height * slice.top
        const bottom = clippedRect.top + height * slice.bottom
        if (bottom <= top) {
          return []
        }

        return slice.spans
          .map(span => ({
            pageNumber: clippedRect.pageNumber,
            left: clippedRect.left + width * span.start,
            right: clippedRect.left + width * span.end,
            top,
            bottom,
            mode,
            wrapTextSide: readWrapTextSide(element)
          }))
          .filter(candidate => candidate.right > candidate.left && candidate.bottom > candidate.top)
      })
    }

    return [
      {
        ...clippedRect,
        mode,
        wrapTextSide: readWrapTextSide(element)
      }
    ]
  })
}

export function applyImageWrapExclusions(
  bodyBands: PageWrapBand[],
  exclusions: ImageWrapExclusionRect[]
): PageWrapBand[] {
  if (bodyBands.length === 0 || exclusions.length === 0) {
    return sortBands(bodyBands)
  }

  const resolvedBands = exclusions.reduce<PageWrapBand[]>((currentBands, exclusion) => {
    return currentBands.flatMap(band => subtractExclusionFromBand(band, exclusion))
  }, bodyBands)

  return sortBands(resolvedBands)
}
