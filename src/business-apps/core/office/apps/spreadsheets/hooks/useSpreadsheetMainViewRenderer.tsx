import { useMemo, type MutableRefObject, type ReactNode } from 'react'

import { useTranslation } from '@newwork/nw-design-system'

import type { SpreadsheetColumn, SpreadsheetSheet, ViewType } from '../types'
import type { SpreadsheetUnifiedMutationBatchPayload } from '../core'
import { DashboardView, FormView, KanbanView } from '../views'
import { TableView } from '../views/TableView'
import type { UniverSheetGridInitLifecycleEvent } from '../components/UniverSheetGrid.types'
import type { SpreadsheetRowSlotIdentityRegistry } from '../utils/spreadsheetRowSlotIdentity'
import type { SpreadsheetRowMaterializationReadiness } from './spreadsheetRowMaterializationReadiness'
import translations from '../_i18n'

type ViewerRow = Record<string, unknown>

const BOOTSTRAP_GRID_SHELL_ROWS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8'] as const

export interface UseSpreadsheetMainViewRendererParams {
  viewType: ViewType
  /** Canonical rows/version seeded — unblock grid shell while workbook enrichment continues. */
  isBootstrapCanonicalReady: boolean
  /** Background remote workbook reconcile after cache-first paint. */
  isBootstrapWorkbookEnriching: boolean
  /** Workbook remote reconcile failed after retry, or canonical sheet load failed. */
  workbookSnapshotSyncFailed?: boolean
  preferUniverNativeSheetTabs: boolean
  sheetCount: number
  hasBootstrappedDone: boolean
  activeSheet: SpreadsheetSheet
  sheetData: ViewerRow[]
  initialSnapshot: Record<string, unknown> | null
  initialSnapshotSeed: number | string
  tableUniverSnapshot: Record<string, unknown> | null | undefined
  tableSnapshotSeed: number | string
  authoritativeDataSyncToken: number | string
  workbookInstanceKey: string
  pendingLocalMutationCellsRef: MutableRefObject<Set<string>>
  spreadsheetIntentJournalRef?: MutableRefObject<import('../core/spreadsheetIntentJournal').SpreadsheetIntentJournal>
  versionCausalOwnershipRef?: MutableRefObject<
    import('../core/spreadsheetVersionCausalOwnership').SpreadsheetVersionCausalOwnershipRegistry
  >
  resolveKnownSheetVersion?: (sheetId: string) => number
  spreadsheetColumnsForGrid: SpreadsheetColumn[]
  testId: string
  onNativeSheetStructureIntent: (intent: unknown) => void
  onActiveWorksheetChange: (worksheetId: string, worksheetName: string) => void
  onUniverSheetInserted: (payload: unknown) => void
  onUniverSheetRemoved: (payload: unknown) => void
  onUniverSheetRenamed: (payload: unknown) => void
  onUniverSheetVisibilityChanged: (payload: unknown) => void
  getSheetContext: (sheetId: string) => { columns: SpreadsheetColumn[]; data: ViewerRow[] } | null
  onCellChange: (rowId: string, columnName: string, value: unknown, sheetId?: string) => void
  onCellsChange: (cells: Array<{ rowId: string; columnName: string; value: unknown; sheetId?: string }>) => void
  onSnapshotRequested: () => Promise<void>
  onWorkbookSnapshotLifecycle: (event: unknown) => void
  onOpenCommentRequest: (payload: unknown) => void
  commentedCells: unknown
  onDataChange: (rows: ViewerRow[], sourceSheetId?: string) => void
  participants: unknown[]
  emitOperation: (operation: unknown) => void
  onDiagnosticsTraceEvent: (event: unknown) => void
  onGridInitLifecycle: (event: UniverSheetGridInitLifecycleEvent) => void
  onStyleBatchOp: (styleData: any) => void
  onMutationBatchOp?: (data: SpreadsheetUnifiedMutationBatchPayload) => void | Promise<void>
  flushUnmaterializedRowsBeforePersistRef: MutableRefObject<((sheetId: string) => Promise<void>) | null>
  flushPendingCellChangesRef: MutableRefObject<(() => Promise<void>) | null>
  flushDeferredDirtyCellsRef: MutableRefObject<(() => Promise<void>) | null>
  getPersistSheetRowsSnapshot: (sheetId: string) => ViewerRow[]
  getPersistedBaselineRowsSnapshot: (sheetId: string) => ViewerRow[] | null
  isBackendRowUuid: (value: string) => boolean
  rowSlotIdentityRegistryRef: MutableRefObject<SpreadsheetRowSlotIdentityRegistry | null>
  rowMaterializationReadinessRef: MutableRefObject<SpreadsheetRowMaterializationReadiness | null>
  columnStructureStateRef: MutableRefObject<{
    healthy: boolean
    pendingInsertedRange: { startIndex: number; endIndex: number; columnNames: string[] } | null
    expectedColumnsSignature: string | null
  }>
  onCursorEmit: (pos: { path: string[] }) => void
  getCanonicalSheetId: (sheetId: string) => string
  collaborationEnabled: boolean
  canEditWithLock: boolean
  onColumnAdd?: (...args: any[]) => void | Promise<void>
  onColumnsInsert?: (...args: any[]) => void
  onColumnsDelete?: (...args: any[]) => void
  onColumnsMove?: (...args: any[]) => void
  onRowsInsert?: (...args: any[]) => void
  onRowsDelete?: (...args: any[]) => void
  onRowsMove?: (...args: any[]) => void
  onCellRangeMove?: (...args: any[]) => void
  onDimensionsChange: (payload: unknown) => void
  gridRef: MutableRefObject<any>
  onEditRow: (row: ViewerRow) => void
  onDeleteRow: (rowId: string) => Promise<void>
  activeView: unknown
}

export function useSpreadsheetMainViewRenderer(params: UseSpreadsheetMainViewRendererParams): ReactNode {
  const { t } = useTranslation(translations)
  const {
    viewType,
    isBootstrapCanonicalReady,
    isBootstrapWorkbookEnriching,
    workbookSnapshotSyncFailed = false,
    preferUniverNativeSheetTabs,
    sheetCount,
    hasBootstrappedDone,
    activeSheet,
    sheetData,
    initialSnapshot,
    initialSnapshotSeed,
    tableUniverSnapshot,
    tableSnapshotSeed,
    authoritativeDataSyncToken,
    workbookInstanceKey,
    pendingLocalMutationCellsRef,
    spreadsheetIntentJournalRef,
    versionCausalOwnershipRef,
    resolveKnownSheetVersion,
    spreadsheetColumnsForGrid,
    testId,
    onNativeSheetStructureIntent,
    onActiveWorksheetChange,
    onUniverSheetInserted,
    onUniverSheetRemoved,
    onUniverSheetRenamed,
    onUniverSheetVisibilityChanged,
    getSheetContext,
    onCellChange,
    onCellsChange,
    onSnapshotRequested,
    onWorkbookSnapshotLifecycle,
    onOpenCommentRequest,
    commentedCells,
    onDataChange,
    participants,
    emitOperation,
    onDiagnosticsTraceEvent,
    onGridInitLifecycle,
    onStyleBatchOp,
    onMutationBatchOp,
    flushUnmaterializedRowsBeforePersistRef,
    flushPendingCellChangesRef,
    flushDeferredDirtyCellsRef,
    getPersistSheetRowsSnapshot,
    getPersistedBaselineRowsSnapshot,
    isBackendRowUuid,
    rowSlotIdentityRegistryRef,
    rowMaterializationReadinessRef,
    columnStructureStateRef,
    onCursorEmit,
    getCanonicalSheetId,
    collaborationEnabled,
    canEditWithLock,
    onColumnAdd,
    onColumnsInsert,
    onColumnsDelete,
    onColumnsMove,
    onRowsInsert,
    onRowsDelete,
    onRowsMove,
    onCellRangeMove,
    onDimensionsChange,
    gridRef,
    onEditRow,
    onDeleteRow,
    activeView
  } = params

  return useMemo(() => {
    if (viewType === 'table') {
      const shouldWaitForCanonicalBootstrap =
        !isBootstrapCanonicalReady && (!preferUniverNativeSheetTabs || sheetCount <= 1 || !hasBootstrappedDone)
      if (shouldWaitForCanonicalBootstrap) {
        return (
          <div
            className="gba:flex gba:h-full gba:w-full gba:flex-col gba:bg-background"
            data-testid={`${testId}-bootstrap-shell`}
          >
            <div className="gba:flex gba:flex-1 gba:flex-col gba:gap-2 gba:p-4">
              <div className="gba:h-8 gba:w-48 gba:rounded-md gba:bg-muted/60 gba:animate-pulse" />
              <div className="gba:flex gba:flex-1 gba:flex-col gba:gap-1 gba:pt-2">
                {BOOTSTRAP_GRID_SHELL_ROWS.map(rowKey => (
                  <div key={rowKey} className="gba:h-6 gba:w-full gba:rounded gba:bg-muted/40 gba:animate-pulse" />
                ))}
              </div>
              <div className="gba:text-xs gba:text-muted-foreground">{t('workbook-bootstrap-loading-shell')}</div>
            </div>
          </div>
        )
      }

      return (
        <TableView
          sheet={activeSheet}
          data={sheetData}
          initialSnapshot={preferUniverNativeSheetTabs ? tableUniverSnapshot : initialSnapshot}
          snapshotSeed={(preferUniverNativeSheetTabs ? tableSnapshotSeed : initialSnapshotSeed) as any}
          authoritativeDataSyncToken={authoritativeDataSyncToken as any}
          workbookInstanceKey={workbookInstanceKey as any}
          pendingLocalMutationCellsRef={pendingLocalMutationCellsRef}
          spreadsheetIntentJournalRef={spreadsheetIntentJournalRef}
          versionCausalOwnershipRef={versionCausalOwnershipRef}
          resolveKnownSheetVersion={resolveKnownSheetVersion}
          multiSheetWorkbookMode={preferUniverNativeSheetTabs}
          apiFirstSheetStructure={preferUniverNativeSheetTabs}
          workbookSnapshotSyncing={isBootstrapWorkbookEnriching}
          workbookSnapshotSyncFailed={workbookSnapshotSyncFailed}
          onNativeSheetStructureIntent={onNativeSheetStructureIntent as any}
          onActiveWorksheetChange={onActiveWorksheetChange}
          onUniverSheetInserted={onUniverSheetInserted as any}
          onUniverSheetRemoved={onUniverSheetRemoved as any}
          onUniverSheetRenamed={onUniverSheetRenamed as any}
          onUniverSheetVisibilityChanged={onUniverSheetVisibilityChanged as any}
          getSheetContext={getSheetContext}
          columns={[]}
          spreadsheetColumns={spreadsheetColumnsForGrid}
          testId={`${testId}-table-view`}
          onCellChange={onCellChange}
          onCellsChange={onCellsChange as any}
          onSnapshotRequested={onSnapshotRequested}
          onWorkbookSnapshotLifecycle={onWorkbookSnapshotLifecycle as any}
          onOpenCommentRequest={onOpenCommentRequest as any}
          commentedCells={commentedCells as any}
          onDataChange={onDataChange}
          participants={participants as any}
          onOperationEmit={op => emitOperation(op)}
          onDiagnosticsTraceEvent={onDiagnosticsTraceEvent as any}
          onGridInitLifecycle={onGridInitLifecycle}
          onStyleBatchOp={onStyleBatchOp}
          onMutationBatchOp={onMutationBatchOp}
          flushUnmaterializedRowsBeforePersistRef={flushUnmaterializedRowsBeforePersistRef}
          flushPendingCellChangesRef={flushPendingCellChangesRef}
          flushDeferredDirtyCellsRef={flushDeferredDirtyCellsRef}
          getPersistSheetRowsSnapshot={getPersistSheetRowsSnapshot}
          getPersistedBaselineRowsSnapshot={getPersistedBaselineRowsSnapshot}
          isBackendRowUuid={isBackendRowUuid}
          rowSlotIdentityRegistryRef={rowSlotIdentityRegistryRef}
          rowMaterializationReadinessRef={rowMaterializationReadinessRef}
          columnStructureStateRef={columnStructureStateRef}
          onCursorEmit={onCursorEmit}
          getCanonicalSheetId={getCanonicalSheetId}
          collaborationEnabled={collaborationEnabled}
          onColumnAdd={canEditWithLock ? onColumnAdd : undefined}
          onColumnsInsert={canEditWithLock ? onColumnsInsert : undefined}
          onColumnsDelete={canEditWithLock ? onColumnsDelete : undefined}
          onColumnsMove={canEditWithLock ? onColumnsMove : undefined}
          onRowsInsert={canEditWithLock ? onRowsInsert : undefined}
          onRowsDelete={canEditWithLock ? onRowsDelete : undefined}
          onRowsMove={canEditWithLock ? onRowsMove : undefined}
          onCellRangeMove={canEditWithLock ? onCellRangeMove : undefined}
          onDimensionsChange={onDimensionsChange as any}
          isReadOnly={!canEditWithLock}
          gridRef={gridRef}
        />
      )
    }

    if (viewType === 'form') {
      return (
        <FormView
          sheet={activeSheet}
          data={sheetData}
          onEdit={onEditRow}
          onDelete={onDeleteRow}
          canEdit={canEditWithLock}
          testId={`${testId}-form-view`}
        />
      )
    }

    if (viewType === 'dashboard') {
      return <DashboardView sheet={activeSheet} data={sheetData} testId={`${testId}-dashboard-view`} />
    }

    if (viewType === 'kanban') {
      return (
        <KanbanView
          sheet={activeSheet}
          data={sheetData}
          view={activeView as any}
          onEdit={onEditRow}
          canEdit={canEditWithLock}
          testId={`${testId}-kanban-view`}
        />
      )
    }

    return null
  }, [
    activeSheet,
    activeView,
    authoritativeDataSyncToken,
    canEditWithLock,
    collaborationEnabled,
    commentedCells,
    emitOperation,
    getSheetContext,
    gridRef,
    hasBootstrappedDone,
    initialSnapshot,
    initialSnapshotSeed,
    isBootstrapCanonicalReady,
    isBootstrapWorkbookEnriching,
    workbookSnapshotSyncFailed,
    onActiveWorksheetChange,
    onCellChange,
    onCellsChange,
    onColumnAdd,
    pendingLocalMutationCellsRef,
    onColumnsDelete,
    onColumnsInsert,
    onRowsInsert,
    onDataChange,
    onDeleteRow,
    onDiagnosticsTraceEvent,
    onGridInitLifecycle,
    onDimensionsChange,
    onEditRow,
    onNativeSheetStructureIntent,
    onOpenCommentRequest,
    onSnapshotRequested,
    onStyleBatchOp,
    onMutationBatchOp,
    flushUnmaterializedRowsBeforePersistRef,
    flushPendingCellChangesRef,
    flushDeferredDirtyCellsRef,
    getPersistSheetRowsSnapshot,
    isBackendRowUuid,
    rowSlotIdentityRegistryRef,
    rowMaterializationReadinessRef,
    onUniverSheetInserted,
    onUniverSheetRemoved,
    onUniverSheetRenamed,
    onWorkbookSnapshotLifecycle,
    getCanonicalSheetId,
    participants,
    preferUniverNativeSheetTabs,
    sheetCount,
    sheetData,
    spreadsheetColumnsForGrid,
    tableSnapshotSeed,
    tableUniverSnapshot,
    workbookInstanceKey,
    t,
    testId,
    viewType
  ])
}
