/**
 * Runtime layout types for paginated document rendering.
 *
 * These types intentionally model derived UI state rather than persisted
 * document structure so the storage layer can remain page-agnostic.
 */

export type DocumentLayoutSource = 'legacy-dom-pagination' | 'incremental-layout-engine'
export type DocumentLayoutComputationStatus = 'idle' | 'scheduled' | 'measuring'
export type DocumentLayoutInvalidationScope = 'viewport' | 'structure' | 'formatting' | 'full-document'
export type DocumentLayoutFlowSnapshotKind = 'page-break' | 'placeholder' | 'spacer'
export type DocumentLayoutInvalidationReason =
  | 'initial-load'
  | 'document-hydration'
  | 'layout-inputs-changed'
  | 'viewport-resize'
  | 'editor-transaction'
  | 'legacy-dom-structure'
  | 'layout-service-changed'

export interface DocumentLayoutPageSnapshot {
  pageNumber: number
  flowIndex: number | null
  mountedIndex: number | null
  isMounted: boolean
}

export interface DocumentLayoutPageBodyBounds {
  pageNumber: number
  left: number
  right: number
  top: number
  bottom: number
}

export interface DocumentLayoutPagePositionRange {
  pageNumber: number
  startPos: number
  endPos: number
}

export interface DocumentLayoutPageSpan extends DocumentLayoutPagePositionRange {
  source: 'mounted' | 'placeholder' | 'spacer' | 'retained'
}

export interface DocumentLayoutPageChromeMetrics {
  pageNumber: number
  headerHeight: number
  footerHeight: number
}

export interface DocumentLayoutAnchorRect {
  top: number
  bottom: number
  left: number
  right: number
}

export type DocumentLayoutAnchorKind = 'comment' | 'image' | 'link' | 'table'

export interface DocumentLayoutAnchorSnapshot {
  id: string
  kind: DocumentLayoutAnchorKind
  from: number
  to: number
  pageNumber: number | null
  pageRange: DocumentLayoutPageRange | null
  rect: DocumentLayoutAnchorRect | null
  metadata: Record<string, boolean | number | string | null>
}

export interface DocumentLayoutAnchorCollection {
  comments: DocumentLayoutAnchorSnapshot[]
  images: DocumentLayoutAnchorSnapshot[]
  links: DocumentLayoutAnchorSnapshot[]
  tables: DocumentLayoutAnchorSnapshot[]
}

export interface DocumentLayoutTableFragmentSnapshot {
  id: string
  tablePos: number
  from: number
  to: number
  pageNumbers: number[]
  pageRange: DocumentLayoutPageRange | null
  rowCount: number
  paginationChainKey: string
  paginationChainId: string | null
  paginationSplitId: string | null
  fragmentIndex: number
  fragmentCount: number
}

export interface DocumentLayoutPageRange {
  startPage: number
  endPage: number
}

export interface DocumentLayoutFlowSnapshot {
  flowIndex: number
  pageRange: DocumentLayoutPageRange
  kind: DocumentLayoutFlowSnapshotKind
  isMounted: boolean
}

export interface DocumentLayoutMeasurementRequest {
  generation: number
  reason: DocumentLayoutInvalidationReason
  scope: DocumentLayoutInvalidationScope
  pageRange: DocumentLayoutPageRange | null
}

export interface DocumentLayoutSnapshot {
  documentVersion: number
  layoutVersion: number
  source: DocumentLayoutSource
  pageCount: number
  pages: DocumentLayoutPageSnapshot[]
  flow: DocumentLayoutFlowSnapshot[]
  mountedRange: DocumentLayoutPageRange | null
  pageBounds: DocumentLayoutPageBodyBounds[]
  mountedPageBodyBounds: DocumentLayoutPageBodyBounds[]
  pageSpans: DocumentLayoutPageSpan[]
  retainedPageSpans: DocumentLayoutPageSpan[]
  pagePositionRanges?: DocumentLayoutPagePositionRange[]
  pageChromeMetrics: DocumentLayoutPageChromeMetrics[]
  anchors: DocumentLayoutAnchorCollection
  tableFragments: DocumentLayoutTableFragmentSnapshot[]
  activeRange: DocumentLayoutPageRange | null
  activePages: DocumentLayoutPageSnapshot[]
}

export interface DocumentLayoutRuntimeState {
  source: DocumentLayoutSource
  requestedGeneration: number
  resolvedGeneration: number
  status: DocumentLayoutComputationStatus
  pendingScope: DocumentLayoutInvalidationScope | null
  pendingRange: DocumentLayoutPageRange | null
  lastRequestedReason: DocumentLayoutInvalidationReason | null
  lastRequestedScope: DocumentLayoutInvalidationScope | null
  lastRequestedRange: DocumentLayoutPageRange | null
  lastResolvedReason: DocumentLayoutInvalidationReason | null
  lastResolvedScope: DocumentLayoutInvalidationScope | null
  lastResolvedRange: DocumentLayoutPageRange | null
}
