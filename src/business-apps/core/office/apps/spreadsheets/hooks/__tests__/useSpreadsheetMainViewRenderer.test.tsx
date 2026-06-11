import React from 'react'
import { render, screen } from '@testing-library/react'
import { useSpreadsheetMainViewRenderer } from '../useSpreadsheetMainViewRenderer'

jest.mock('@newwork/nw-design-system', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}))

jest.mock('../../views/TableView', () => ({
  TableView: ({ snapshotSeed }: { snapshotSeed?: string | number }) => (
    <div data-testid="mock-table-view" data-snapshot-seed={String(snapshotSeed ?? '')} />
  )
}))

const baseSheet = {
  id: 'sheet-1',
  name: 'Sheet 1',
  columns: [],
  data: [],
  settings: {},
  views: [],
  viewType: 'table'
} as any

const createParams = () =>
  ({
    viewType: 'table',
    isBootstrapCanonicalReady: true,
    isBootstrapSnapshotLoading: false,
    isBootstrapWorkbookEnriching: false,
    workbookSnapshotSyncFailed: false,
    preferUniverNativeSheetTabs: false,
    sheetCount: 1,
    hasBootstrappedDone: false,
    activeSheet: baseSheet,
    sheetData: [],
    initialSnapshot: null,
    initialSnapshotSeed: 'none',
    tableUniverSnapshot: null,
    tableSnapshotSeed: 'merged:none',
    authoritativeDataSyncToken: 0,
    authoritativePaintCellsRef: { current: null },
    authoritativePaintMetaRef: { current: null },
    pendingSnapshotStyleRepair: null,
    onSnapshotStyleRepairApplied: jest.fn(),
    workbookInstanceKey: 'single:app:sheet-1',
    pendingLocalMutationCellsRef: { current: new Set<string>() },
    spreadsheetIntentJournalRef: { current: null },
    versionCausalOwnershipRef: { current: null },
    resolveKnownSheetVersion: jest.fn(() => 0),
    spreadsheetColumnsForGrid: [],
    testId: 'spreadsheet',
    onNativeSheetStructureIntent: jest.fn(),
    onActiveWorksheetChange: jest.fn(),
    onUniverSheetInserted: jest.fn(),
    onUniverSheetRemoved: jest.fn(),
    onUniverSheetRenamed: jest.fn(),
    onUniverSheetVisibilityChanged: jest.fn(),
    getSheetContext: jest.fn(() => null),
    onCellChange: jest.fn(),
    onCellsChange: jest.fn(),
    onSnapshotRequested: jest.fn(),
    onWorkbookSnapshotLifecycle: jest.fn(),
    onOpenCommentRequest: jest.fn(),
    commentedCells: [],
    onDataChange: jest.fn(),
    participants: [],
    emitOperation: jest.fn(),
    onDiagnosticsTraceEvent: jest.fn(),
    onGridInitLifecycle: jest.fn(),
    onStyleBatchOp: jest.fn(),
    onMutationBatchOp: jest.fn(),
    flushUnmaterializedRowsBeforePersistRef: { current: null },
    flushPendingCellChangesRef: { current: null },
    flushDeferredDirtyCellsRef: { current: null },
    getPersistSheetRowsSnapshot: jest.fn(() => []),
    getPersistedBaselineRowsSnapshot: jest.fn(() => null),
    isBackendRowUuid: jest.fn(() => false),
    rowSlotIdentityRegistryRef: { current: null },
    rowMaterializationReadinessRef: { current: null },
    columnStructureStateRef: {
      current: {
        healthy: true,
        pendingInsertedRange: null,
        expectedColumnsSignature: null
      }
    },
    onCursorEmit: jest.fn(),
    getCanonicalSheetId: jest.fn((sheetId: string) => sheetId),
    collaborationEnabled: false,
    canEditWithLock: true,
    onColumnAdd: jest.fn(),
    onColumnsInsert: jest.fn(),
    onColumnsDelete: jest.fn(),
    onColumnsMove: jest.fn(),
    onRowsInsert: jest.fn(),
    onRowsDelete: jest.fn(),
    onRowsMove: jest.fn(),
    onCellRangeMove: jest.fn(),
    onDimensionsChange: jest.fn(),
    onAuthoritativeReapplyError: jest.fn(),
    gridRef: { current: null },
    onEditRow: jest.fn(),
    onDeleteRow: jest.fn(),
    activeView: null
  }) as Parameters<typeof useSpreadsheetMainViewRenderer>[0]

function Harness({ params }: { params: Parameters<typeof useSpreadsheetMainViewRenderer>[0] }) {
  return <>{useSpreadsheetMainViewRenderer(params)}</>
}

describe('useSpreadsheetMainViewRenderer', () => {
  it('keeps the bootstrap shell visible while the initial snapshot decision is still loading', () => {
    const params = createParams()
    params.isBootstrapSnapshotLoading = true

    render(<Harness params={params} />)

    expect(screen.getByTestId('spreadsheet-bootstrap-shell')).toBeInTheDocument()
    expect(screen.queryByTestId('mock-table-view')).not.toBeInTheDocument()
  })

  it('renders the table once the initial snapshot decision has completed', () => {
    const params = createParams()

    render(<Harness params={params} />)

    expect(screen.queryByTestId('spreadsheet-bootstrap-shell')).not.toBeInTheDocument()
    expect(screen.getByTestId('mock-table-view')).toHaveAttribute('data-snapshot-seed', 'none')
  })
})
