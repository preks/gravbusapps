import type { MutableRefObject } from 'react'

import type { SpreadsheetColumn } from '../types'
import type { SpreadsheetRowMaterializationReadiness } from './spreadsheetRowMaterializationReadiness'

interface SpreadsheetPersistenceIndicator {
  beginPersist: () => void
  endPersist: () => void
  markDirty: () => void
  recordSuccess: (isSettled: boolean) => void
  recordError: (message: string) => void
}

export interface UseSpreadsheetUniverRowCreatePipelineParams {
  activeSheetId: string
  activeSheetIdRef: MutableRefObject<string>
  activeSheetColumns: SpreadsheetColumn[]
  pendingLocalMutationCellsRef?: MutableRefObject<Set<string>>
  getColumnsForSheet: (sheetId: string) => SpreadsheetColumn[]
  isUuid: (value: string) => boolean
  isOpsV2Enabled: boolean
  onRowAdd?: unknown
  entityEnabledRef: MutableRefObject<boolean>
  canEditWithLockRef: MutableRefObject<boolean>
  latestUniverDataRef: MutableRefObject<{ data: Record<string, unknown>[]; sheetId: string } | null>
  pendingUniverRowsBySheetRef: MutableRefObject<
    Map<string, { data: Record<string, unknown>[]; persistedRows: Record<string, unknown>[] }>
  >
  lastProcessedLengthRef: MutableRefObject<number>
  operationQueueRef: MutableRefObject<Promise<void>>
  chainOnOperationQueue: (queueRef: MutableRefObject<Promise<void>>, fn: () => Promise<void>) => Promise<void>
  sheetPersist: SpreadsheetPersistenceIndicator
  markVersionAsChanged: () => void
  markVersionAsSaved: () => void
  onPersistRowsErrorMessage: string
  getActiveSessionRows: () => Record<string, unknown>[]
  buildAddRowPayloadsFromUniverRows: (
    rows: Array<Record<string, unknown>>,
    columns: SpreadsheetColumn[]
  ) => Array<Record<string, unknown>>
  persistAddedRowsWithBatch: (
    targetSheetId: string,
    rowPayloads: Record<string, unknown>[],
    updateLocalRowsAfterCreate: (result: {
      createdRows: Array<Record<string, unknown>>
      persistedIdByClientRowId: Map<string, string>
    }) => void
  ) => Promise<void>
  persistSingleAddedRow: (
    targetSheetId: string,
    rowPayloads: Record<string, unknown>[],
    updateLocalRowsAfterCreate: (result: {
      createdRows: Array<Record<string, unknown>>
      persistedIdByClientRowId: Map<string, string>
    }) => void
  ) => Promise<void>
  recoverFromVersionConflict: () => Promise<boolean>
  fetchAuthoritativeRowsForSheet?: (sheetId: string) => Promise<Array<Record<string, unknown>>>
  summarizeRowsForDebug: (rows: Record<string, unknown>[] | undefined) => Record<string, unknown>
  getRowsForSheet: (sheetId: string) => Record<string, unknown>[]
  multiSheetDebugLog: (event: string, meta?: Record<string, unknown> | (() => Record<string, unknown>)) => void
  commitRowsForSheet: (sheetId: string, rows: Record<string, unknown>[], options?: { syncGrid?: boolean }) => void
  onRowsMaterializedContextSync?: (
    sheetId: string,
    rows: Record<string, unknown>[],
    meta: {
      affectedUiRowIds: string[]
      createdGridRowIndices: number[]
      isActiveTarget: boolean
      createdRows: Record<string, unknown>[]
      sourceUniverRows: Record<string, unknown>[]
    }
  ) => void
  onRowIdentityDiagnostics?: (stage: string, payload: Record<string, unknown>) => void
  pendingCreatedSheetSelectionRef: MutableRefObject<{
    temporarySheetId: string
    persistedSheetId: string | null
  } | null>
  createdSheetIdAliasesRef: MutableRefObject<Map<string, string>>
  rowMaterializationReadiness?: SpreadsheetRowMaterializationReadiness
}

export interface UseSpreadsheetUniverRowCreatePipelineResult {
  processUniverDataChange: () => Promise<void>
  processUniverDataChangeRef: MutableRefObject<() => Promise<void>>
  materializeTemporaryRowsForSubmit: (targetSheetId: string, rows: Array<Record<string, unknown>>) => Promise<void>
  isRowMaterializationInFlightForSheet: (targetSheetId: string) => boolean
  releaseRowMaterializationInFlightForSheet: (targetSheetId: string) => void
}
