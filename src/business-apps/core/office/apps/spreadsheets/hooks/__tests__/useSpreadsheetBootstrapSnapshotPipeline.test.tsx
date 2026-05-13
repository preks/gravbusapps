import { renderHook, waitFor } from '@testing-library/react'
import type { SpreadsheetColumn, SpreadsheetSheet } from '../../types/spreadsheet'
import { SpreadsheetApiService } from '../../services/SpreadsheetApiService'
import { useSpreadsheetBootstrapSnapshotPipeline } from '../useSpreadsheetBootstrapSnapshotPipeline'

const fooColumn = (): SpreadsheetColumn => ({
  id: 'c_foo',
  name: 'foo',
  label: 'Foo',
  type: 'text',
  isVisible: true,
  isEditable: true,
  isRequired: false,
  isUnique: false,
  order: 0
})

const minimalSheet = (): SpreadsheetSheet => ({
  id: 'sh1',
  name: 'Sheet 1',
  viewType: 'table',
  columns: [fooColumn()],
  views: [],
  data: [],
  version: 1,
  settings: {
    allowAdd: true,
    allowEdit: true,
    allowDelete: true,
    allowExport: true,
    allowImport: true,
    rowsPerPage: 50,
    showRowNumbers: true
  }
})

const mapSnapshotRowsToViewerRows = (rows: unknown[]): Record<string, unknown>[] => rows as Record<string, unknown>[]

describe('useSpreadsheetBootstrapSnapshotPipeline', () => {
  beforeEach(() => {
    jest.spyOn(SpreadsheetApiService, 'getSheetSnapshot').mockRejectedValue(new Error('canonical fetch failed'))
    jest.spyOn(SpreadsheetApiService, 'getUniverSnapshot').mockResolvedValue({
      version: 0,
      snapshot: null,
      updatedAt: null
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('calls onBootstrapWorkbookReconcileIssue with canonical phase when sheet snapshot fails', async () => {
    const onBootstrapWorkbookReconcileIssue = jest.fn()
    const spreadsheetSession = {
      updateWorkbookSnapshot: jest.fn(),
      setActiveSheet: jest.fn(),
      replaceSheetState: jest.fn(),
      capturePersistedBaseline: jest.fn()
    }
    const activeSheet = minimalSheet()
    const seedActiveSheetState = jest.fn()
    const debugLog = jest.fn()

    renderHook(() =>
      useSpreadsheetBootstrapSnapshotPipeline({
        appId: 'app-1',
        activeSheetId: 'sh1',
        activeSheet,
        entityEnabled: false,
        preferUniverNativeSheetTabs: false,
        spreadsheetSession: spreadsheetSession as any,
        workbookSnapshotVersionRef: { current: 0 },
        peerSheetDataCacheRef: { current: new Map() },
        authoritativePeerSheetDataCacheRef: { current: new Set() },
        seedActiveSheetState,
        mapSnapshotRowsToViewerRows,
        debugLog,
        onBootstrapWorkbookReconcileIssue
      })
    )

    await waitFor(() =>
      expect(onBootstrapWorkbookReconcileIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: 'canonical',
          error: expect.any(Error)
        })
      )
    )
  })
})
