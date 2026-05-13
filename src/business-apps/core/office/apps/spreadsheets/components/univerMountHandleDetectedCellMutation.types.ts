import type { SpreadsheetMutationPlan, SpreadsheetMutationPlannedCell } from '../core'
import type { SpreadsheetColumn } from '../types/spreadsheet'
import type { ConversionContext } from '../utils/univerAdapter'
import type { SheetCellMatrix, SheetRangeShape } from './cellMatrixUtils'
import type { UniverWorkbookBootstrapMountContext } from './univerWorkbookBootstrapMountContext'
import type { UniverGridController } from './useUniverGridController'

export type HandleDetectedCellMutationArgs = {
  source: 'sheet-value-changed' | 'command-executed' | 'selection-reconcile' | 'sheet-edit-ended'
  commandId?: string
  payloadCellValue: SheetCellMatrix | undefined
  ranges: SheetRangeShape[]
  worksheetId?: string | null
  preserveUndefinedAsNull?: boolean
}

export type UniverMountHandleDetectedCellMutationDeps = Pick<
  UniverGridController,
  | 'univerAPIRef'
  | 'propsRef'
  | 'callbacksRef'
  | 'contextRef'
  | 'recentlyDuplicatedWorksheetIdsRef'
  | 'remoteEchoSuppressionRef'
  | 'recentLocallyMutatedGridCellsRef'
  | 'lastSyncedGridCellSignaturesRef'
  | 'lastCellValueMutationAtRef'
  | 'newRowClientIdByIndexRef'
  | 'recentLocalMutationSignaturesRef'
  | 'pendingFormattingPasteIntentRef'
> &
  Pick<UniverWorkbookBootstrapMountContext, 'getWorkbookSnapshotRef'> & {
    peekPasteFormattingReplaceIntent: (sheetId: string) => boolean
    /**
     * Ensures `add_rows` completes before unified cell/style HTTP batch when new rows use `client_*` ids.
     */
    flushUnmaterializedRowsBeforePersist?: (targetSheetId: string) => Promise<void>
    /** Authoritative row snapshot after flush (session); used to remap `client_*` → server UUIDs in batch ops. */
    getPersistSheetRowsSnapshot?: (targetSheetId: string) => Record<string, unknown>[]
    /** Same predicate as pending cell batches; identifies persisted backend row ids for remap map. */
    isUuidForRowRemap?: (value: string) => boolean
  }

/** Work completed after matrix + gating; passed into persist plan + emit. */
export type DetectedCellMutationReady = {
  now: number
  source: HandleDetectedCellMutationArgs['source']
  commandId: string | undefined
  targetSheetId: string
  useResolvedContext: boolean
  cellValue: SheetCellMatrix
  ctxBefore: ConversionContext
  contextColumns: SpreadsheetColumn[]
  currentData: Record<string, unknown>[]
  rowOffset: number
  colOffset: number
  hadPasteIntentForSheet: boolean
  hadPasteFormattingIntentForSheet: boolean
  disableMixedValueStylePayloads: boolean
  preserveUndefinedAsNull: boolean
  explicitPayloadAbsoluteCellValue: SheetCellMatrix | undefined
  worksheetCellValue: SheetCellMatrix | undefined
  workbookSnapshotCellValue: SheetCellMatrix | undefined
  payloadCellValue: SheetCellMatrix | undefined
  ranges: SheetRangeShape[]
  shouldSuppress: (globalRowIndex: number, globalColIndex: number, value: unknown) => boolean
  pendingNewRowsUpdate: {
    nextData: Record<string, unknown>[]
    nextContext: ConversionContext
  } | null
}

export type ResolveDetectedCellMutationResult =
  | { status: 'return'; value: boolean }
  | { status: 'ready'; ready: DetectedCellMutationReady }

export type PersistEmitInput = {
  source: HandleDetectedCellMutationArgs['source']
  targetSheetId: string
  mutationTraceId: string
  localMutationPlan: SpreadsheetMutationPlan
  plannedCellsFiltered: SpreadsheetMutationPlannedCell[]
  emittedChangedCells: Array<{
    rowId: string
    columnName: string
    value: unknown
    univerRow: number
    univerCol: number
  }>
  planStyles: SpreadsheetMutationPlan['styles']
  hadPasteIntentForSheet: boolean
  hadPasteFormattingIntentForSheet: boolean
  commandId: string | undefined
  /** True when new rows were merged into sheet data this tick and value cells will be persisted. */
  materializeRowsBeforeEmit: boolean
}

export type PersistPlanPhaseResult = { kind: 'return'; value: boolean } | { kind: 'emit'; emit: PersistEmitInput }
