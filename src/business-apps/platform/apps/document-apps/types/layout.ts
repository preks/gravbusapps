/**
 * Runtime layout types for paginated document rendering.
 *
 * These types intentionally model derived UI state rather than persisted
 * document structure so the storage layer can remain page-agnostic.
 */

export type DocumentLayoutSource = 'legacy-dom-pagination' | 'incremental-layout-engine'
export type DocumentLayoutComputationStatus = 'idle' | 'scheduled' | 'measuring'
export type DocumentLayoutInvalidationScope = 'viewport' | 'structure' | 'formatting' | 'full-document'
export type DocumentLayoutInvalidationReason =
  | 'initial-load'
  | 'document-hydration'
  | 'layout-inputs-changed'
  | 'viewport-resize'
  | 'legacy-dom-structure'
  | 'layout-service-changed'

export interface DocumentLayoutPageSnapshot {
  pageNumber: number
}

export interface DocumentLayoutPageRange {
  startPage: number
  endPage: number
}

export interface DocumentLayoutMeasurementRequest {
  generation: number
  reason: DocumentLayoutInvalidationReason
  scope: DocumentLayoutInvalidationScope
  pageRange: DocumentLayoutPageRange | null
}

export interface DocumentLayoutSnapshot {
  layoutVersion: number
  source: DocumentLayoutSource
  pageCount: number
  pages: DocumentLayoutPageSnapshot[]
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
