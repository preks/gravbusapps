import { act, renderHook } from '@testing-library/react'

import { useSpreadsheetRowPersistencePipeline } from '../useSpreadsheetRowPersistencePipeline'

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
        onRowIdentityDiagnostics: jest.fn()
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
})
