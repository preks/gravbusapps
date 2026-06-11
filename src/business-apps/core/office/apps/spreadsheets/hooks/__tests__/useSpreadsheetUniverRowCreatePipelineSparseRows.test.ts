import { act, renderHook } from '@testing-library/react'

import { SpreadsheetApiRequestError } from '../../services/SpreadsheetApiService'
import type { SpreadsheetColumn } from '../../types'
import { buildAddRowPayloadsFromUniverRows } from '../../utils/spreadsheetViewerRows'
import { useSpreadsheetUniverRowCreatePipeline } from '../useSpreadsheetUniverRowCreatePipeline'

const column = (id: string, name: string): SpreadsheetColumn => ({
  id,
  name,
  label: name,
  type: 'text',
  isVisible: true,
  isEditable: true,
  isRequired: false,
  isUnique: false,
  order: 0
})

const clientRow = (gridRowIndex: number): Record<string, unknown> => ({
  _id: `client-row-${gridRowIndex}`,
  _gridRowIndex: gridRowIndex,
  ColumnA: `value ${gridRowIndex}`
})

const backendRow = (gridRowIndex: number): Record<string, unknown> => ({
  _id: `backend-row-${gridRowIndex}`,
  _rowUuid: `backend-row-${gridRowIndex}`,
  _gridRowIndex: gridRowIndex,
  ColumnA: `persisted ${gridRowIndex}`
})

const createdRow = (gridRowIndex: number): Record<string, unknown> => ({
  _id: `client-row-${gridRowIndex}`,
  _clientRowId: `client-row-${gridRowIndex}`,
  _rowUuid: `backend-row-${gridRowIndex}`,
  _gridRowIndex: gridRowIndex,
  ColumnA: `value ${gridRowIndex}`
})

const getDebugPayloads = (multiSheetDebugLog: jest.Mock, eventName: string): Array<Record<string, unknown>> =>
  multiSheetDebugLog.mock.calls
    .filter(([event]) => event === eventName)
    .map(([, meta]) => (typeof meta === 'function' ? meta() : meta))

function renderPipeline({
  latestRows,
  persistedRows,
  lastProcessedLength = persistedRows.length,
  persistAddedRowsWithBatch,
  recoverFromVersionConflict = jest.fn(async () => false),
  buildAddRowPayloads = (rows: Array<Record<string, unknown>>) =>
    rows.map(row => ({
      _clientRowId: row._id,
      _gridRowIndex: row._gridRowIndex,
      ColumnA: row.ColumnA
    }))
}: {
  latestRows: Array<Record<string, unknown>>
  persistedRows: Array<Record<string, unknown>>
  lastProcessedLength?: number
  persistAddedRowsWithBatch?: jest.Mock
  recoverFromVersionConflict?: jest.Mock<Promise<boolean>, []>
  buildAddRowPayloads?: (rows: Array<Record<string, unknown>>) => Array<Record<string, unknown>>
}) {
  const activeSheetIdRef = { current: 'sheet-1' }
  const latestUniverDataRef = { current: { sheetId: 'sheet-1', data: latestRows } }
  const persistedRowsRef = { current: persistedRows }
  const pendingUniverRowsBySheetRef = {
    current: new Map<string, { data: Record<string, unknown>[]; persistedRows: Record<string, unknown>[] }>()
  }
  const commitRowsForSheet = jest.fn()
  const multiSheetDebugLog = jest.fn()
  const chainOnOperationQueue = jest.fn(async (_queueRef, fn: () => Promise<void>) => fn())
  const persistBatch =
    persistAddedRowsWithBatch ??
    jest.fn(
      async (
        _targetSheetId: string,
        rowPayloads: Record<string, unknown>[],
        updateLocalRowsAfterCreate: (result: {
          createdRows: Array<Record<string, unknown>>
          persistedIdByClientRowId: Map<string, string>
        }) => void
      ) => {
        const createdRows = rowPayloads.map(row => createdRow(Number(row._gridRowIndex)))
        updateLocalRowsAfterCreate({
          createdRows,
          persistedIdByClientRowId: new Map(
            createdRows.map(row => [String(row._clientRowId ?? row._id ?? ''), String(row._rowUuid ?? '')])
          )
        })
      }
    )

  const hook = renderHook(() =>
    useSpreadsheetUniverRowCreatePipeline({
      activeSheetId: 'sheet-1',
      activeSheetIdRef,
      activeSheetColumns: [column('col-a', 'ColumnA')],
      getColumnsForSheet: () => [column('col-a', 'ColumnA')],
      isUuid: value => value.startsWith('backend-row-'),
      isOpsV2Enabled: true,
      onRowAdd: undefined,
      entityEnabledRef: { current: false },
      canEditWithLockRef: { current: true },
      latestUniverDataRef,
      pendingUniverRowsBySheetRef,
      lastProcessedLengthRef: { current: lastProcessedLength },
      operationQueueRef: { current: Promise.resolve() },
      chainOnOperationQueue,
      sheetPersist: {
        beginPersist: jest.fn(),
        endPersist: jest.fn(),
        markDirty: jest.fn(),
        recordSuccess: jest.fn(),
        recordError: jest.fn()
      },
      markVersionAsChanged: jest.fn(),
      markVersionAsSaved: jest.fn(),
      onPersistRowsErrorMessage: 'failed',
      getActiveSessionRows: () => persistedRowsRef.current,
      buildAddRowPayloadsFromUniverRows: buildAddRowPayloads,
      persistAddedRowsWithBatch: persistBatch,
      persistSingleAddedRow: jest.fn(),
      recoverFromVersionConflict,
      summarizeRowsForDebug: rows => ({ count: rows?.length ?? 0 }),
      getRowsForSheet: () => persistedRowsRef.current,
      multiSheetDebugLog,
      commitRowsForSheet,
      onRowsMaterializedContextSync: jest.fn(),
      onRowIdentityDiagnostics: jest.fn(),
      pendingCreatedSheetSelectionRef: { current: null },
      createdSheetIdAliasesRef: { current: new Map<string, string>() }
    })
  )

  return {
    ...hook,
    chainOnOperationQueue,
    commitRowsForSheet,
    latestUniverDataRef,
    multiSheetDebugLog,
    persistAddedRowsWithBatch: persistBatch,
    persistedRowsRef
  }
}

const ROW_MATERIALIZATION_IDLE_MS = 400

const flushRowMaterializationDebounce = async () => {
  await act(async () => {
    jest.advanceTimersByTime(ROW_MATERIALIZATION_IDLE_MS)
  })
}

const runProcessUniverDataChange = async (result: {
  current: { processUniverDataChange: () => Promise<void> } | null
}) => {
  let pending: Promise<void> | undefined
  await act(async () => {
    pending = result.current?.processUniverDataChange()
  })
  await flushRowMaterializationDebounce()
  await act(async () => {
    await pending
  })
}

describe('useSpreadsheetUniverRowCreatePipeline sparse row materialization', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('creates only a sparse missing visual row even when the data length was already processed', async () => {
    const latestRows = Array.from({ length: 11 }, (_, index) => clientRow(index + 1))
    const persistedRows = [1, 2, 3, 4, 5, 6, 7, 8, 10, 11].map(backendRow)
    const { result, commitRowsForSheet, multiSheetDebugLog, persistAddedRowsWithBatch } = renderPipeline({
      latestRows,
      persistedRows,
      lastProcessedLength: latestRows.length
    })

    await runProcessUniverDataChange(result)

    expect(persistAddedRowsWithBatch).toHaveBeenCalledWith(
      'sheet-1',
      [{ _clientRowId: 'client-row-9', _gridRowIndex: 9, ColumnA: 'value 9' }],
      expect.any(Function)
    )
    const committedRows = commitRowsForSheet.mock.calls[0][1] as Array<Record<string, unknown>>
    expect(committedRows.map(row => row._gridRowIndex)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    expect(committedRows[8]).toEqual(createdRow(9))

    const planLogs = getDebugPayloads(multiSheetDebugLog, 'process_univer_data_change_materialization_plan')
    expect(planLogs[0]).toEqual(
      expect.objectContaining({
        missingGridRowIndices: [9],
        unmaterializedClientRowIds: [],
        rowPayloadCount: 1,
        missingAndWillCreateCount: 1,
        gridIndexCoordinateMode: 'zeroBasedVisualGridIndex'
      })
    )
    expect(planLogs[planLogs.length - 1]).toEqual(
      expect.objectContaining({
        createdSparseGridRowIndices: [9]
      })
    )
  })

  it('does not create the same sparse visual row twice while creation is in flight', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    let finishPersist: (() => void) | undefined
    const persistAddedRowsWithBatch = jest.fn(
      async (
        _targetSheetId: string,
        rowPayloads: Record<string, unknown>[],
        updateLocalRowsAfterCreate: (result: {
          createdRows: Array<Record<string, unknown>>
          persistedIdByClientRowId: Map<string, string>
        }) => void
      ) =>
        new Promise<void>(resolve => {
          finishPersist = () => {
            const createdRows = rowPayloads.map(row => createdRow(Number(row._gridRowIndex)))
            updateLocalRowsAfterCreate({
              createdRows,
              persistedIdByClientRowId: new Map(
                createdRows.map(row => [String(row._clientRowId ?? row._id ?? ''), String(row._rowUuid ?? '')])
              )
            })
            resolve()
          }
        })
    )
    const latestRows = [clientRow(1), clientRow(2), clientRow(3)]
    const persistedRows = [backendRow(1), backendRow(3)]
    const { result, multiSheetDebugLog } = renderPipeline({
      latestRows,
      persistedRows,
      lastProcessedLength: latestRows.length,
      persistAddedRowsWithBatch
    })

    try {
      await act(async () => {
        const firstFlush = result.current.processUniverDataChange()
        const secondFlush = result.current.processUniverDataChange()
        jest.advanceTimersByTime(ROW_MATERIALIZATION_IDLE_MS)
        await Promise.resolve()
        finishPersist?.()
        await Promise.all([firstFlush, secondFlush])
      })
    } finally {
      consoleWarnSpy.mockRestore()
    }

    expect(persistAddedRowsWithBatch).toHaveBeenCalledTimes(1)
    const planLogs = getDebugPayloads(multiSheetDebugLog, 'process_univer_data_change_materialization_plan')
    expect(planLogs.length).toBeGreaterThanOrEqual(1)
    expect(planLogs[planLogs.length - 1]).toEqual(
      expect.objectContaining({
        missingGridRowIndices: [2],
        rowPayloadCount: 1
      })
    )
  })

  it('reconciles an already-created sparse row after a create conflict without retrying the duplicate create', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    const recoverFromVersionConflict = jest.fn(async () => true)
    const { result, chainOnOperationQueue, persistedRowsRef, persistAddedRowsWithBatch } = renderPipeline({
      latestRows: [clientRow(1), clientRow(2), clientRow(3)],
      persistedRows: [backendRow(1), backendRow(3)],
      lastProcessedLength: 3,
      recoverFromVersionConflict,
      persistAddedRowsWithBatch: jest.fn(async () => {
        persistedRowsRef.current = [backendRow(1), backendRow(2), backendRow(3)]
        throw new SpreadsheetApiRequestError('conflict', 409)
      })
    })

    await runProcessUniverDataChange(result)
    consoleErrorSpy.mockRestore()

    expect(persistAddedRowsWithBatch).toHaveBeenCalledTimes(1)
    expect(recoverFromVersionConflict).toHaveBeenCalledTimes(1)
    expect(chainOnOperationQueue).not.toHaveBeenCalled()
  })

  it('continues to materialize dense trailing rows', async () => {
    const { result, persistAddedRowsWithBatch } = renderPipeline({
      latestRows: [clientRow(0), clientRow(1), clientRow(2)],
      persistedRows: [backendRow(0), backendRow(1)],
      lastProcessedLength: 2
    })

    await runProcessUniverDataChange(result)

    expect(persistAddedRowsWithBatch).toHaveBeenCalledWith(
      'sheet-1',
      [{ _clientRowId: 'client-row-2', _gridRowIndex: 2, ColumnA: 'value 2' }],
      expect.any(Function)
    )
  })

  it('does not recreate rows that already have backend row identities', async () => {
    const { result, multiSheetDebugLog, persistAddedRowsWithBatch } = renderPipeline({
      latestRows: [clientRow(0), clientRow(1)],
      persistedRows: [backendRow(0), backendRow(1)],
      lastProcessedLength: 2
    })

    await runProcessUniverDataChange(result)

    expect(persistAddedRowsWithBatch).not.toHaveBeenCalled()
    const skipLogs = getDebugPayloads(multiSheetDebugLog, 'process_univer_data_change_skip_no_new_rows')
    expect(skipLogs[0]).toEqual(
      expect.objectContaining({
        visualIndexPlannerFoundMissingRows: false
      })
    )
  })

  it('skips add_rows for visual placeholder rows with no meaningful values', async () => {
    const latestRows = [
      {
        _id: 'client-row-12',
        _clientRowId: 'client-row-12',
        _gridRowIndex: 12
      }
    ]
    const { result, persistAddedRowsWithBatch } = renderPipeline({
      latestRows,
      persistedRows: [],
      lastProcessedLength: latestRows.length,
      buildAddRowPayloads: rows => buildAddRowPayloadsFromUniverRows(rows, [column('col-a', 'ColumnA')])
    })

    await runProcessUniverDataChange(result)

    expect(persistAddedRowsWithBatch).not.toHaveBeenCalled()
  })
})
