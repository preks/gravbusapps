import type { SpreadsheetBatchOperation, SpreadsheetBatchOperationResponse } from '../services/SpreadsheetApiService'
import type { SpreadsheetRowRef } from '../utils/spreadsheetRowIdentity'
import type { SpreadsheetApp, SpreadsheetColumn, SpreadsheetSheet } from '../types'
import type { SpreadsheetReplayResponse } from './SpreadsheetCollaborationContract'
import type { SpreadsheetSaveWorkbookSnapshotInput } from './spreadsheetSnapshotSaveWithRetry'
import type { SpreadsheetViewerRow } from './SpreadsheetSession'

export type SpreadsheetMutationName =
  | 'createSheet'
  | 'duplicateSheet'
  | 'renameSheet'
  | 'deleteSheet'
  | 'updateSheetMetadata'
  | 'appendRows'
  | 'insertRowsAt'
  | 'deleteRows'
  | 'moveRows'
  | 'reorderRows'
  | 'updateRowViaRange'
  | 'setCell'
  | 'setRange'
  | 'clearCell'
  | 'appendColumns'
  | 'insertColumnsAt'
  | 'updateColumn'
  | 'deleteColumns'
  | 'moveColumns'
  | 'reorderColumns'
  | 'setStyle'
  | 'setRowHeight'
  | 'setColWidth'
  | 'loadWorkbookSnapshot'
  | 'saveWorkbookSnapshot'
  | 'createCheckpointWithFlush'
  | 'fetchSheetChangesSince'
  | 'requestStructuralResync'

export interface SpreadsheetMutationTraceMeta {
  traceId?: string
  sourceTraceIds?: string[]
  operationType?: string
  traceSessionId?: string
  sessionId?: string
  tabId?: string
}

export interface SpreadsheetMutationBatchRequest {
  sheetId: string
  operations: SpreadsheetBatchOperation[]
  batchIdPrefix?: string
  batchIdOverride?: string
  traceMeta?: SpreadsheetMutationTraceMeta
}

export type SpreadsheetMutationBatchRunner = (
  operations: SpreadsheetBatchOperation[],
  batchIdPrefix?: string,
  batchIdOverride?: string,
  traceMeta?: SpreadsheetMutationTraceMeta
) => Promise<SpreadsheetBatchOperationResponse>

export type SpreadsheetMutationBatchSubmit = (
  request: SpreadsheetMutationBatchRequest
) => Promise<SpreadsheetBatchOperationResponse>

export interface SpreadsheetCreateSheetMutationRequest {
  name: string
  description?: string
  id?: string
  columns?: SpreadsheetColumn[]
  data?: SpreadsheetViewerRow[]
  worksheetSnapshot?: Record<string, unknown>
}

export interface SpreadsheetDuplicateSheetMutationRequest {
  sourceSheetId: string
  targetSheetId?: string
  name: string
  visualWorksheetSnapshot?: Record<string, unknown>
  visualWorkbookStyles?: Record<string, unknown>
}

export interface SpreadsheetRowRangeUpdate {
  rowId: string
  rowRef?: SpreadsheetRowRef
  columnName: string
  value: unknown
}

export interface SpreadsheetColumnReorderRequest {
  sheetId: string
  columns: Array<SpreadsheetColumn | string>
}

export interface SpreadsheetMutationFacade {
  submitBatch: SpreadsheetMutationBatchSubmit
  createSheet(request: SpreadsheetCreateSheetMutationRequest): Promise<SpreadsheetSheet>
  duplicateSheet(request: SpreadsheetDuplicateSheetMutationRequest): Promise<SpreadsheetSheet>
  renameSheet(sheetId: string, name: string): Promise<SpreadsheetSheet>
  deleteSheet(sheetId: string): Promise<void>
  updateSheetMetadata(sheetId: string, patch: Partial<SpreadsheetSheet>): Promise<SpreadsheetSheet>
  createRow(sheetId: string, row: SpreadsheetViewerRow): Promise<SpreadsheetViewerRow>
  createRows(sheetId: string, rows: SpreadsheetViewerRow[]): Promise<SpreadsheetViewerRow[]>
  updateRow(sheetId: string, rowId: string, patch: SpreadsheetViewerRow): Promise<SpreadsheetViewerRow>
  appendRows(sheetId: string, rows: SpreadsheetViewerRow[]): Promise<SpreadsheetBatchOperationResponse>
  insertRowsAt(
    sheetId: string,
    rowIndex: number,
    rows: SpreadsheetViewerRow[]
  ): Promise<SpreadsheetBatchOperationResponse>
  insertRowSlots(
    sheetId: string,
    startGridRowIndex: number,
    count: number,
    materializedRows?: SpreadsheetViewerRow[]
  ): Promise<SpreadsheetBatchOperationResponse>
  deleteRow(sheetId: string, rowId: string): Promise<boolean>
  deleteRows(sheetId: string, rowIds: string[]): Promise<SpreadsheetBatchOperationResponse>
  deleteRowSlots(sheetId: string, startGridRowIndex: number, count: number): Promise<SpreadsheetBatchOperationResponse>
  moveRowSlots(
    sheetId: string,
    sourceStartGridRowIndex: number,
    count: number,
    destinationGridRowIndex: number
  ): Promise<SpreadsheetBatchOperationResponse>
  moveCellRange(
    sheetId: string,
    fromRange: { startRow: number; endRow: number; startColumn: number; endColumn: number },
    toRange: { startRow: number; endRow: number; startColumn: number; endColumn: number }
  ): Promise<SpreadsheetBatchOperationResponse>
  moveRows(
    sheetId: string,
    rowIds: string[],
    targetIndex: number,
    mode?: 'before' | 'after'
  ): Promise<SpreadsheetBatchOperationResponse>
  reorderRows(sheetId: string, rowIdsInOrder: string[]): Promise<SpreadsheetBatchOperationResponse>
  updateRowViaRange(sheetId: string, cells: SpreadsheetRowRangeUpdate[]): Promise<SpreadsheetBatchOperationResponse>
  setCell(sheetId: string, cell: SpreadsheetRowRangeUpdate): Promise<SpreadsheetBatchOperationResponse>
  setRange(sheetId: string, cells: SpreadsheetRowRangeUpdate[]): Promise<SpreadsheetBatchOperationResponse>
  clearCell(sheetId: string, rowId: string, columnName: string): Promise<SpreadsheetBatchOperationResponse>
  appendColumns(sheetId: string, columns: SpreadsheetColumn[]): Promise<SpreadsheetBatchOperationResponse>
  insertColumnsAt(
    sheetId: string,
    columnIndex: number,
    columns: SpreadsheetColumn[]
  ): Promise<SpreadsheetBatchOperationResponse>
  updateColumn(
    sheetId: string,
    columnId: string,
    patch: Partial<SpreadsheetColumn>
  ): Promise<SpreadsheetBatchOperationResponse>
  deleteColumns(sheetId: string, columnIds: string[]): Promise<SpreadsheetBatchOperationResponse>
  moveColumns(
    sheetId: string,
    columnIds: string[],
    targetIndex: number,
    mode?: 'before' | 'after'
  ): Promise<SpreadsheetBatchOperationResponse>
  reorderColumns(request: SpreadsheetColumnReorderRequest): Promise<SpreadsheetBatchOperationResponse>
  setStyle(sheetId: string, payload: Record<string, unknown>): Promise<SpreadsheetBatchOperationResponse>
  setRowHeight(sheetId: string, rowIndex: number, height: number): Promise<SpreadsheetBatchOperationResponse>
  setColWidth(sheetId: string, colIndex: number, width: number): Promise<SpreadsheetBatchOperationResponse>
  saveWorkbookSnapshotWithRetry(
    input: SpreadsheetSaveWorkbookSnapshotInput
  ): Promise<{ savedSnapshot: unknown; cacheResult: { stored: boolean; reason: string | null } }>
  /** App-level PATCH (settings/name, etc.). Must not include sheets — backend rejects full nested writes. */
  updateAppMetadata(updates: Partial<SpreadsheetApp>): Promise<SpreadsheetApp>
  fetchSheetChangesSince(sheetId: string, sinceVersion: number): Promise<SpreadsheetReplayResponse>
  requestStructuralResync(sheetId?: string, options?: { immediate?: boolean }): void
}
