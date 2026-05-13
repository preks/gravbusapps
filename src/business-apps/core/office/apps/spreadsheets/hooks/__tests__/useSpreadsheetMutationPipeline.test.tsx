import { act, renderHook } from '@testing-library/react'

import type { SpreadsheetSession } from '../../core'
import { SpreadsheetApiService } from '../../services/SpreadsheetApiService'
import type { SpreadsheetSheet } from '../../types'
import { useSpreadsheetMutationPipeline } from '../useSpreadsheetMutationPipeline'

function minimalSheet(id: string): SpreadsheetSheet {
  return {
    id,
    name: id,
    viewType: 'table',
    columns: [],
    data: [],
    views: [],
    settings: {},
    version: 3
  } as SpreadsheetSheet
}

describe('useSpreadsheetMutationPipeline', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('serializes concurrent submitMutationBatch HTTP calls for the same sheet (per-sheet chain)', async () => {
    let inFlight = 0
    let maxConcurrent = 0

    const applySpy = jest.spyOn(SpreadsheetApiService, 'applyOperationBatch').mockImplementation(async () => {
      inFlight += 1
      maxConcurrent = Math.max(maxConcurrent, inFlight)
      await new Promise(resolve => setTimeout(resolve, 8))
      inFlight -= 1
      return {
        sheetId: 'sheet-1',
        newVersion: 9,
        appliedOperations: [],
        operationResults: [],
        idempotentReplay: false
      }
    })

    const spreadsheetSession = {
      getState: () => ({
        appId: 'app-1',
        activeSheetId: 'sheet-1',
        workbookSnapshotVersion: 0,
        workbookSnapshot: null,
        sheets: {}
      }),
      getActiveSheetState: () => ({ version: 3, rows: [], columns: [] }),
      getSheetState: () => null,
      subscribe: () => () => {},
      setActiveSheet: jest.fn(),
      replaceSheetState: jest.fn(),
      updateWorkbookSnapshot: jest.fn(),
      applyMutation: jest.fn(),
      applyDeltaChanges: jest.fn(),
      capturePersistedBaseline: jest.fn(),
      markSheetNeedsGridMaterialization: jest.fn(),
      clearSheetGridMaterialization: jest.fn(),
      clearDirty: jest.fn()
    } as unknown as SpreadsheetSession

    const { result } = renderHook(() =>
      useSpreadsheetMutationPipeline({
        appId: 'app-1',
        activeSheetIdRef: { current: 'sheet-1' },
        spreadsheetSession,
        sheetVersionRef: { current: 3 },
        appSheetsRef: { current: [minimalSheet('sheet-1')] },
        snapshotSaveMetricsRef: { current: { conflicts: 0 } },
        unloadKeepAlivePersistRef: { current: false },
        enqueueSnapshotCheckpointRef: { current: null },
        activeTraceSessionRef: { current: null },
        diagnosticsBrowserSessionIdRef: { current: 'browser-session' },
        diagnosticsTabIdRef: { current: 'tab-1' },
        createOperationId: (prefix: string) => `${prefix}_generated`,
        getKnownSheetVersion: () => 3,
        rememberRecentLocalBatchId: jest.fn(),
        rememberKnownSheetVersion: jest.fn(),
        rememberSheetVersion: jest.fn(),
        rememberLocalCommittedVersion: jest.fn(),
        refreshBaseVersionBeforeWrite: async (_sheetId, base) => base,
        updateActiveSheetVersion: jest.fn(),
        applyResponseRowsToLocalBaseline: jest.fn(),
        recoverFromVersionConflict: async () => true,
        enqueueDiagnosticsTraceEvent: jest.fn(),
        fetchSheetVersion: async () => 3,
        fetchSheetReplaySince: async () => ({ currentVersion: 3, changes: [], requiresSnapshot: false }),
        scheduleRemoteStructuralResync: jest.fn(),
        mutationFacadeRef: { current: null }
      })
    )

    await act(async () => {
      await Promise.all([
        result.current.submitMutationBatch({
          sheetId: 'sheet-1',
          operations: [
            {
              operationId: 'op-a',
              type: 'set_cell',
              data: { rowId: 'row-1', columnName: 'ColumnA', value: 'a' }
            }
          ],
          batchIdPrefix: 'set_cell'
        }),
        result.current.submitMutationBatch({
          sheetId: 'sheet-1',
          operations: [
            {
              operationId: 'op-b',
              type: 'set_cell',
              data: { rowId: 'row-1', columnName: 'ColumnA', value: 'b' }
            }
          ],
          batchIdPrefix: 'set_cell'
        })
      ])
    })

    expect(applySpy).toHaveBeenCalledTimes(2)
    expect(maxConcurrent).toBe(1)
  })
})
