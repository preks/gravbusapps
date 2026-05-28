import type { SpreadsheetBatchOperation, SpreadsheetBatchOperationResponse } from '../services/SpreadsheetApiService'
import type { SpreadsheetColumn, SpreadsheetSheet } from '../types'

export type SpreadsheetViewerRow = Record<string, unknown>

export type SpreadsheetSessionMutationSource =
  | 'local_edit'
  | 'remote_apply'
  | 'snapshot_checkpoint'
  | 'sheet_structure'
  | 'resync'

/** Prefer these over raw strings so session mutation sources stay consistent across viewer, hooks, and tests. */
export const SpreadsheetSessionMutationSources = {
  LocalEdit: 'local_edit',
  RemoteApply: 'remote_apply',
  SnapshotCheckpoint: 'snapshot_checkpoint',
  SheetStructure: 'sheet_structure',
  Resync: 'resync'
} as const satisfies Record<
  'LocalEdit' | 'RemoteApply' | 'SnapshotCheckpoint' | 'SheetStructure' | 'Resync',
  SpreadsheetSessionMutationSource
>

export interface SpreadsheetSheetSessionState {
  sheetId: string
  version: number
  rows: SpreadsheetViewerRow[]
  columns: SpreadsheetColumn[]
  /** Rows last acknowledged as durable HTTP-batch baseline (snapshot checkpoint reconcile). */
  persistedBaselineRows: SpreadsheetViewerRow[] | null
  isDirty: boolean
  needsGridMaterialization: boolean
  /** Last reason passed to {@link SpreadsheetSession.markSheetNeedsGridMaterialization}; cleared when materialization completes. */
  gridMaterializationReason: string | null
  lastMutationSource?: SpreadsheetSessionMutationSource
}

export interface SpreadsheetSessionState {
  appId: string
  activeSheetId: string
  workbookSnapshotVersion: number
  workbookSnapshot: Record<string, unknown> | null
  sheets: Record<string, SpreadsheetSheetSessionState>
}

export interface SpreadsheetSessionMutationDescriptor {
  sheetId: string
  operations: SpreadsheetBatchOperation[]
  response?: SpreadsheetBatchOperationResponse
  source: SpreadsheetSessionMutationSource
}

export interface SpreadsheetSessionDeltaChangesDescriptor {
  sheetId: string
  changes: unknown[] | undefined
  source: SpreadsheetSessionMutationSource
  columns?: SpreadsheetColumn[]
  version?: number
}

export interface SpreadsheetSession {
  getState(): SpreadsheetSessionState
  getActiveSheetState(): SpreadsheetSheetSessionState | null
  getSheetState(sheetId: string): SpreadsheetSheetSessionState | null
  /** Notify after any in-memory session mutation (for React `useSyncExternalStore`). */
  subscribe(listener: () => void): () => void
  setActiveSheet(sheetId: string): void
  replaceSheetState(sheet: SpreadsheetSheet, rows: SpreadsheetViewerRow[], version?: number): void
  updateWorkbookSnapshot(snapshot: Record<string, unknown> | null, version: number): void
  applyMutation(descriptor: SpreadsheetSessionMutationDescriptor): void
  applyDeltaChanges(descriptor: SpreadsheetSessionDeltaChangesDescriptor): void
  capturePersistedBaseline(sheetId: string): void
  capturePersistedBaselineForOperations(sheetId: string, operations: SpreadsheetBatchOperation[]): void
  markSheetNeedsGridMaterialization(sheetId: string, reason: string): void
  clearSheetGridMaterialization(sheetId: string): void
  clearDirty(sheetId: string): void
}
