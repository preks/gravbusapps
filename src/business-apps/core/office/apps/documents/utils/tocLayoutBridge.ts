import type { DocumentLayoutPageBodyBounds, DocumentLayoutPagePositionRange, DocumentLayoutPageSpan } from '../types'

export type TocLayoutHints = {
  layoutVersion?: number
  pageBounds?: DocumentLayoutPageBodyBounds[]
  mountedPageBodyBounds?: DocumentLayoutPageBodyBounds[]
  pagePositionRanges?: DocumentLayoutPagePositionRange[]
  pageSpans?: DocumentLayoutPageSpan[]
  retainedPageSpans?: DocumentLayoutPageSpan[]
}

type Listener = () => void

const listeners = new Set<Listener>()

let hints: TocLayoutHints | undefined

export function setDocumentTocLayoutHints(next: TocLayoutHints | undefined): void {
  hints = next
  listeners.forEach(listener => listener())
}

export function getDocumentTocLayoutHints(): TocLayoutHints | undefined {
  return hints
}

export function subscribeDocumentTocLayout(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
