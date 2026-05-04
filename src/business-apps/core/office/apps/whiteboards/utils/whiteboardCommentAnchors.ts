import type { WhiteboardCommentAnchor } from '@/business-apps/platform/apps/shared/types/versioning'

interface BoundedSceneElement {
  id?: string
  x: number
  y: number
  width: number
  height: number
  isDeleted?: boolean
}

interface ViewportState {
  scrollX: number
  scrollY: number
  zoom: number
}

export interface ViewportRect {
  left: number
  top: number
  width: number
  height: number
}

export const DEFAULT_WHITEBOARD_COMMENT_WIDTH = 240
export const DEFAULT_WHITEBOARD_COMMENT_HEIGHT = 140

function normalizeDimension(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback
  }

  const normalized = Math.abs(value)
  return normalized > 0 ? normalized : fallback
}

export function normalizeWhiteboardCommentAnchor(anchor: WhiteboardCommentAnchor): WhiteboardCommentAnchor {
  const width = normalizeDimension(anchor.width, DEFAULT_WHITEBOARD_COMMENT_WIDTH)
  const height = normalizeDimension(anchor.height, DEFAULT_WHITEBOARD_COMMENT_HEIGHT)
  const normalizedX = anchor.width >= 0 ? anchor.x : anchor.x - width
  const normalizedY = anchor.height >= 0 ? anchor.y : anchor.y - height

  return {
    x: normalizedX,
    y: normalizedY,
    width,
    height,
    ...(anchor.elementIds?.length ? { elementIds: anchor.elementIds } : {})
  }
}

export function createWhiteboardCommentAnchorFromViewportPoint(
  viewportX: number,
  viewportY: number,
  viewport: ViewportState
): WhiteboardCommentAnchor {
  const width = DEFAULT_WHITEBOARD_COMMENT_WIDTH
  const height = DEFAULT_WHITEBOARD_COMMENT_HEIGHT

  return {
    x: viewportX / viewport.zoom - viewport.scrollX - width / 2,
    y: viewportY / viewport.zoom - viewport.scrollY - height / 2,
    width,
    height
  }
}

export function createWhiteboardCommentAnchorFromElements(
  elements: readonly BoundedSceneElement[]
): WhiteboardCommentAnchor | null {
  const visibleElements = elements.filter(element => !element.isDeleted)
  if (visibleElements.length === 0) {
    return null
  }

  const left = Math.min(...visibleElements.map(element => Math.min(element.x, element.x + element.width)))
  const top = Math.min(...visibleElements.map(element => Math.min(element.y, element.y + element.height)))
  const right = Math.max(...visibleElements.map(element => Math.max(element.x, element.x + element.width)))
  const bottom = Math.max(...visibleElements.map(element => Math.max(element.y, element.y + element.height)))

  const elementIds = visibleElements.map(element => element.id).filter((id): id is string => Boolean(id))

  return normalizeWhiteboardCommentAnchor({
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
    ...(elementIds.length ? { elementIds } : {})
  })
}

export function resolveWhiteboardCommentAnchor(
  anchor: WhiteboardCommentAnchor,
  elements: readonly BoundedSceneElement[] = []
): WhiteboardCommentAnchor {
  const elementIds = anchor.elementIds ?? []
  if (elementIds.length === 0) {
    return normalizeWhiteboardCommentAnchor(anchor)
  }

  const selectedElements = elements.filter(
    element => element.id && elementIds.includes(element.id) && !element.isDeleted
  )
  if (selectedElements.length === 0) {
    return normalizeWhiteboardCommentAnchor(anchor)
  }

  const left = Math.min(...selectedElements.map(element => Math.min(element.x, element.x + element.width)))
  const top = Math.min(...selectedElements.map(element => Math.min(element.y, element.y + element.height)))
  const right = Math.max(...selectedElements.map(element => Math.max(element.x, element.x + element.width)))
  const bottom = Math.max(...selectedElements.map(element => Math.max(element.y, element.y + element.height)))

  return normalizeWhiteboardCommentAnchor({
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
    elementIds
  })
}

export function getWhiteboardCommentAnchorCenter(anchor: WhiteboardCommentAnchor): { x: number; y: number } {
  const normalized = normalizeWhiteboardCommentAnchor(anchor)

  return {
    x: normalized.x + normalized.width / 2,
    y: normalized.y + normalized.height / 2
  }
}

export function getWhiteboardCommentViewportRect(
  anchor: WhiteboardCommentAnchor,
  viewport: ViewportState
): ViewportRect {
  const normalized = normalizeWhiteboardCommentAnchor(anchor)

  return {
    left: (normalized.x + viewport.scrollX) * viewport.zoom,
    top: (normalized.y + viewport.scrollY) * viewport.zoom,
    width: normalized.width * viewport.zoom,
    height: normalized.height * viewport.zoom
  }
}
