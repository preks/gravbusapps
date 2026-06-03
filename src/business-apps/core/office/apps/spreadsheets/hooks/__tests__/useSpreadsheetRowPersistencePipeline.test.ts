import { act, renderHook } from '@testing-library/react'

import { useSpreadsheetRowPersistencePipeline } from '../useSpreadsheetRowPersistencePipeline'
import { createSpreadsheetRowMaterializationReadiness } from '../spreadsheetRowMaterializationReadiness'

describe('useSpreadsheetRowPersistencePipeline', () => {
  it('materializes rows first, then flushes pending cell writes with backend row ids', async () => {
    const submitBatch = jest.fn()
    const appendRows = jest.fn(async () => ({
      sheetId: 'sheet-1',
      newVersion: 8,
      appliedOperations: [],
      operationResults: [
        {
          operationId: 'add-rows-op',
          type: 'add_rows' as const,
          result: {
            rows: [
              {
                id: 'backend-row-1',
                data: { _clientRowId: 'client-row-1', ColumnA: 'from-row-payload' }
              }
            ]
          }
        }
      ],
      idempotentReplay: false,
      rowMappings: [{ clientRowId: 'client-row-1', rowUuid: 'backend-row-1' }]
    }))
    const setRange = jest.fn(async () => ({ sheetId: 'sheet-1', newVersion: 9 }))

    const pendingClientRowUpdatesRef = {
      current: new Map<string, Record<string, unknown>>([['client-row-1', { ColumnB: 'from-pending-update' }]])
    }

    const { result } = renderHook(() =>
      useSpreadsheetRowPersistencePipeline({
        activeSheetId: 'sheet-1',
        mutationFacade: {
          submitBatch,
          appendRows,
          setRange
        } as any,
        updateActiveSheetVersion: jest.fn(),
        isUuid: value => value === 'backend-row-1',
        pendingClientRowUpdatesRef,
        pendingCellChangesRef: { current: [] },
        persistPendingCellJournal: jest.fn(),
        buildCreatedRowsFromBatch: () => ({
          createdRows: [{ _id: 'client-row-1', _rowUuid: 'backend-row-1', ColumnA: 'from-row-payload' }],
          flushCells: [{ rowId: 'backend-row-1', columnName: 'ColumnB', value: 'from-pending-update' }],
          persistedIdByClientRowId: new Map([['client-row-1', 'backend-row-1']])
        }),
        onFlushDeferredCellEmits: jest.fn(),
        onRowIdentityDiagnostics: jest.fn(),
        rowMaterializationReadiness: createSpreadsheetRowMaterializationReadiness()
      })
    )

    await act(async () => {
      await result.current.persistAddedRowsWithBatch(
        'sheet-1',
        [{ _clientRowId: 'client-row-1', ColumnA: 'from-row-payload' }],
        jest.fn()
      )
    })

    expect(appendRows).toHaveBeenCalledWith('sheet-1', [{ _clientRowId: 'client-row-1', ColumnA: 'from-row-payload' }])
    expect(submitBatch).not.toHaveBeenCalled()
    expect(setRange).toHaveBeenCalledWith('sheet-1', [
      { rowId: 'backend-row-1', columnName: 'ColumnB', value: 'from-pending-update' }
    ])
  })

  it('does not flush follow-up set_range when the adopted add_rows response already contains the pending value', async () => {
    const submitBatch = jest.fn()
    const appendRows = jest.fn(async () => ({
      sheetId: 'sheet-1',
      newVersion: 12,
      appliedOperations: [],
      operationResults: [
        {
          operationId: 'add-rows-op',
          type: 'add_rows' as const,
          result: {
            rows: [
              {
                id: 'backend-row-7',
                data: {
                  _clientRowId: 'client-row-7',
                  _gridRowIndex: 7,
                  ColumnA: 'peer value',
                  ColumnB: 'from-pending-update'
                }
              }
            ]
          }
        }
      ],
      idempotentReplay: false,
      rowMappings: [{ clientRowId: 'client-row-7', rowUuid: 'backend-row-7' }]
    }))
    const setRange = jest.fn(async () => ({ sheetId: 'sheet-1', newVersion: 13 }))

    const { result } = renderHook(() =>
      useSpreadsheetRowPersistencePipeline({
        activeSheetId: 'sheet-1',
        mutationFacade: {
          submitBatch,
          appendRows,
          setRange
        } as any,
        updateActiveSheetVersion: jest.fn(),
        isUuid: value => value === 'backend-row-7',
        pendingClientRowUpdatesRef: {
          current: new Map<string, Record<string, unknown>>([['client-row-7', { ColumnB: 'from-pending-update' }]])
        },
        pendingCellChangesRef: { current: [] },
        persistPendingCellJournal: jest.fn(),
        buildCreatedRowsFromBatch: () => ({
          createdRows: [
            {
              _id: 'backend-row-7',
              _rowUuid: 'backend-row-7',
              _clientRowId: 'client-row-7',
              _gridRowIndex: 7,
              ColumnA: 'peer value',
              ColumnB: 'from-pending-update'
            }
          ],
          flushCells: [],
          persistedIdByClientRowId: new Map([['client-row-7', 'backend-row-7']])
        }),
        onFlushDeferredCellEmits: jest.fn(),
        onRowIdentityDiagnostics: jest.fn(),
        rowMaterializationReadiness: createSpreadsheetRowMaterializationReadiness()
      })
    )

    await act(async () => {
      await result.current.persistAddedRowsWithBatch(
        'sheet-1',
        [{ _clientRowId: 'client-row-7', _gridRowIndex: 7, ColumnA: 'draft value' }],
        jest.fn()
      )
    })

    expect(appendRows).toHaveBeenCalledTimes(1)
    expect(setRange).not.toHaveBeenCalled()
    expect(submitBatch).not.toHaveBeenCalled()
  })

  it('removes redundant pending cell queue entries when add_rows already persisted the same value', async () => {
    const appendRows = jest.fn(async () => ({
      sheetId: 'sheet-1',
      newVersion: 12,
      appliedOperations: [],
      operationResults: [
        {
          operationId: 'add-rows-op',
          type: 'add_rows' as const,
          result: {
            rows: [
              {
                id: 'backend-row-7',
                data: {
                  _clientRowId: 'client-row-7',
                  _gridRowIndex: 7,
                  ColumnA: 'draft value'
                }
              }
            ]
          }
        }
      ],
      idempotentReplay: false,
      rowMappings: [{ clientRowId: 'client-row-7', rowUuid: 'backend-row-7' }]
    }))
    const pendingCellChangesRef = {
      current: [{ rowId: 'client-row-7', columnName: 'ColumnA', value: { v: 'draft value', t: 1 } }]
    }
    const rowMaterializationReadiness = createSpreadsheetRowMaterializationReadiness()

    const { result } = renderHook(() =>
      useSpreadsheetRowPersistencePipeline({
        activeSheetId: 'sheet-1',
        mutationFacade: {
          appendRows,
          setRange: jest.fn(async () => ({ sheetId: 'sheet-1', newVersion: 13 }))
        } as any,
        updateActiveSheetVersion: jest.fn(),
        isUuid: value => value === 'backend-row-7',
        pendingClientRowUpdatesRef: { current: new Map<string, Record<string, unknown>>() },
        pendingCellChangesRef,
        persistPendingCellJournal: jest.fn(),
        buildCreatedRowsFromBatch: () => ({
          createdRows: [
            {
              _id: 'backend-row-7',
              _rowUuid: 'backend-row-7',
              _clientRowId: 'client-row-7',
              _gridRowIndex: 7,
              ColumnA: 'draft value'
            }
          ],
          flushCells: [],
          persistedIdByClientRowId: new Map([['client-row-7', 'backend-row-7']])
        }),
        onFlushDeferredCellEmits: jest.fn(),
        onRowIdentityDiagnostics: jest.fn(),
        rowMaterializationReadiness
      })
    )

    await act(async () => {
      await result.current.persistAddedRowsWithBatch(
        'sheet-1',
        [{ _clientRowId: 'client-row-7', _gridRowIndex: 7, ColumnA: 'draft value' }],
        ({ persistedIdByClientRowId }) => {
          rowMaterializationReadiness.resolveMany('sheet-1', persistedIdByClientRowId)
        }
      )
    })

    expect(pendingCellChangesRef.current).toEqual([])
    expect(rowMaterializationReadiness.getMaterializedValuesByBackendRowId('sheet-1', 'backend-row-7')).toEqual({
      ColumnA: 'draft value'
    })
  })
})
