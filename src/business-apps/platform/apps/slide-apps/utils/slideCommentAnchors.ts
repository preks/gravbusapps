import type { AnySlideElement, SlideData } from '../components/slideElements'
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
        selectedText: typeof parsed.selectedText === 'string' ? parsed.selectedText : undefined
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
