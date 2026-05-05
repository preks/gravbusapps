import { getSlideCanvasSize, type AnySlideElement, type SlideData } from '../components/slideElements'
import type { SlideCommentAnchor } from '../../shared/types/versioning'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function parseSlideCommentAnchor(anchorPath: string | undefined): SlideCommentAnchor | undefined {
  if (!anchorPath) {
    return undefined
  }

  try {
    const parsed = JSON.parse(anchorPath) as unknown
    if (!isRecord(parsed) || typeof parsed.kind !== 'string' || typeof parsed.slideId !== 'string') {
      return undefined
    }

    if (parsed.kind === 'slide') {
      return {
        kind: 'slide',
        slideId: parsed.slideId
      }
    }

    if (parsed.kind === 'element' && isStringArray(parsed.elementIds) && parsed.elementIds.length > 0) {
      return {
        kind: 'element',
        slideId: parsed.slideId,
        elementIds: parsed.elementIds
      }
    }

    if (
      parsed.kind === 'text-range' &&
      typeof parsed.elementId === 'string' &&
      isFiniteNumber(parsed.start) &&
      isFiniteNumber(parsed.end)
    ) {
      return {
        kind: 'text-range',
        slideId: parsed.slideId,
        elementId: parsed.elementId,
        start: parsed.start,
        end: parsed.end,
        selectedText: typeof parsed.selectedText === 'string' ? parsed.selectedText : undefined,
        contextBefore: typeof parsed.contextBefore === 'string' ? parsed.contextBefore : undefined,
        contextAfter: typeof parsed.contextAfter === 'string' ? parsed.contextAfter : undefined
      }
    }
  } catch {
    return undefined
  }

  return undefined
}

export function serializeSlideCommentAnchor(anchor: SlideCommentAnchor | undefined): string | undefined {
  if (!anchor) {
    return undefined
  }

  return JSON.stringify(anchor)
}

export interface SlideCommentAnchorBounds {
  left: number
  top: number
  width: number
  height: number
}

const COMMENT_CONTEXT_WINDOW = 24

function getSlideElementById(slide: SlideData, elementId: string): AnySlideElement | undefined {
  return slide.elements.find(element => element.id === elementId)
}

function getSlideElementTextContent(element: AnySlideElement): string | undefined {
  if (element.type === 'text') {
    return element.content
  }

  if (element.type === 'shape') {
    return element.shapeText?.content
  }

  return undefined
}

function clampTextRange(start: number, end: number, contentLength: number): { start: number; end: number } {
  const safeStart = Math.max(0, Math.min(start, contentLength))
  const safeEnd = Math.max(safeStart, Math.min(end, contentLength))

  return { start: safeStart, end: safeEnd }
}

function getSuffixOverlapScore(actual: string, expected: string): number {
  const maxLength = Math.min(actual.length, expected.length)
  let score = 0

  for (let index = 1; index <= maxLength; index += 1) {
    if (actual.charAt(actual.length - index) !== expected.charAt(expected.length - index)) {
      break
    }

    score += 1
  }

  return score
}

function getPrefixOverlapScore(actual: string, expected: string): number {
  const maxLength = Math.min(actual.length, expected.length)
  let score = 0

  for (let index = 0; index < maxLength; index += 1) {
    if (actual[index] !== expected[index]) {
      break
    }

    score += 1
  }

  return score
}

function findTextRangeBySelectedText(
  content: string,
  anchor: Extract<SlideCommentAnchor, { kind: 'text-range' }>
): { start: number; end: number } | undefined {
  const selectedText = anchor.selectedText?.trim()
  if (!selectedText) {
    return undefined
  }

  const candidates: Array<{ start: number; end: number; score: number }> = []
  let searchIndex = 0

  while (searchIndex < content.length) {
    const nextIndex = content.indexOf(selectedText, searchIndex)
    if (nextIndex === -1) {
      break
    }

    const candidateStart = nextIndex
    const candidateEnd = nextIndex + selectedText.length
    const actualBefore = content.slice(Math.max(0, candidateStart - COMMENT_CONTEXT_WINDOW), candidateStart)
    const actualAfter = content.slice(candidateEnd, Math.min(content.length, candidateEnd + COMMENT_CONTEXT_WINDOW))
    const beforeScore = anchor.contextBefore ? getSuffixOverlapScore(actualBefore, anchor.contextBefore) : 0
    const afterScore = anchor.contextAfter ? getPrefixOverlapScore(actualAfter, anchor.contextAfter) : 0
    const distanceScore = -Math.abs(candidateStart - anchor.start)

    candidates.push({
      start: candidateStart,
      end: candidateEnd,
      score: beforeScore * 100 + afterScore * 100 + distanceScore
    })

    searchIndex = nextIndex + Math.max(selectedText.length, 1)
  }

  const sortedCandidates = [...candidates].sort((left, right) => right.score - left.score)
  return sortedCandidates[0]
}

function resolveTextRangeAnchor(
  anchor: Extract<SlideCommentAnchor, { kind: 'text-range' }>,
  content: string
): Extract<SlideCommentAnchor, { kind: 'text-range' }> | undefined {
  const normalizedRange = clampTextRange(anchor.start, anchor.end, content.length)
  const currentSelection = content.slice(normalizedRange.start, normalizedRange.end)
  const selectedText = anchor.selectedText?.trim()

  if (normalizedRange.start < normalizedRange.end && (!selectedText || currentSelection === selectedText)) {
    return {
      ...anchor,
      ...normalizedRange
    }
  }

  const matchedRange = findTextRangeBySelectedText(content, anchor)
  if (!matchedRange) {
    if (normalizedRange.start === normalizedRange.end) {
      return undefined
    }

    return {
      ...anchor,
      ...normalizedRange
    }
  }

  return {
    ...anchor,
    start: matchedRange.start,
    end: matchedRange.end
  }
}

function getElementBounds(elements: AnySlideElement[]): SlideCommentAnchorBounds | undefined {
  if (elements.length === 0) {
    return undefined
  }

  const left = Math.min(...elements.map(element => element.position.x))
  const top = Math.min(...elements.map(element => element.position.y))
  const right = Math.max(...elements.map(element => element.position.x + element.size.width))
  const bottom = Math.max(...elements.map(element => element.position.y + element.size.height))

  return {
    left,
    top,
    width: right - left,
    height: bottom - top
  }
}

export function createSlideCommentTextContext(
  text: string,
  range: { start: number; end: number }
): { contextBefore?: string; contextAfter?: string } {
  const normalizedRange = clampTextRange(range.start, range.end, text.length)
  const contextBefore = text.slice(Math.max(0, normalizedRange.start - COMMENT_CONTEXT_WINDOW), normalizedRange.start)
  const contextAfter = text.slice(
    normalizedRange.end,
    Math.min(text.length, normalizedRange.end + COMMENT_CONTEXT_WINDOW)
  )

  return {
    contextBefore: contextBefore || undefined,
    contextAfter: contextAfter || undefined
  }
}

export function resolveSlideCommentAnchor(
  anchor: SlideCommentAnchor,
  slide: SlideData
): SlideCommentAnchor | undefined {
  if (anchor.slideId !== slide.id) {
    return undefined
  }

  if (anchor.kind === 'slide') {
    return anchor
  }

  if (anchor.kind === 'element') {
    const elementIds = anchor.elementIds.filter(elementId => Boolean(getSlideElementById(slide, elementId)))

    return elementIds.length > 0 ? { ...anchor, elementIds } : undefined
  }

  const targetElement = getSlideElementById(slide, anchor.elementId)
  if (!targetElement) {
    return undefined
  }

  const content = getSlideElementTextContent(targetElement)
  if (!content) {
    return undefined
  }

  return resolveTextRangeAnchor(anchor, content)
}

export function getSlideCommentAnchorBounds(
  anchor: SlideCommentAnchor,
  slide: SlideData
): SlideCommentAnchorBounds | undefined {
  const resolvedAnchor = resolveSlideCommentAnchor(anchor, slide)
  if (!resolvedAnchor) {
    return undefined
  }

  if (resolvedAnchor.kind === 'slide') {
    const canvasSize = getSlideCanvasSize(slide)

    return {
      left: 0,
      top: 0,
      width: canvasSize.width,
      height: canvasSize.height
    }
  }

  const targetIds = resolvedAnchor.kind === 'element' ? resolvedAnchor.elementIds : [resolvedAnchor.elementId]
  const targetElements = targetIds
    .map(elementId => getSlideElementById(slide, elementId))
    .filter((element): element is AnySlideElement => Boolean(element))

  return getElementBounds(targetElements)
}

function trimAndClamp(text: string | undefined, fallback: string): string {
  const source = (text || fallback).trim()
  if (!source) {
    return fallback
  }

  return source.length > 48 ? `${source.slice(0, 45).trimEnd()}...` : source
}

function describeSlideElement(element: AnySlideElement): string {
  switch (element.type) {
    case 'text':
      return trimAndClamp(element.content, 'Text box')
    case 'shape':
      return trimAndClamp(element.shapeText?.content, 'Shape')
    case 'image':
      return 'Image'
    case 'video':
      return 'Video'
    case 'chart':
      return 'Chart'
    case 'table':
      return 'Table'
    case 'code':
      return 'Code block'
    case 'icon':
      return 'Icon'
    case 'logo':
      return 'Logo'
    case 'footer':
      return 'Footer'
    case 'badge':
      return 'Badge'
    case 'connector':
      return 'Connector'
    case 'layer':
      return 'Layer'
    case 'metric-card':
      return 'Metric card'
    case 'group':
      return 'Grouped elements'
    default:
      return 'Slide element'
  }
}

export function describeSlideCommentTarget(slide: SlideData, elementIds: string[]): string | undefined {
  const elements = elementIds
    .map(elementId => slide.elements.find(element => element.id === elementId))
    .filter((element): element is AnySlideElement => Boolean(element))

  if (elements.length === 0) {
    return undefined
  }

  if (elements.length === 1) {
    return describeSlideElement(elements[0])
  }

  return `${elements.length} selected elements`
}
