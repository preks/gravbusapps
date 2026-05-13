import {
  buildSpreadsheetPendingCellJournalStorageKey,
  readSpreadsheetPendingCellJournal,
  writeSpreadsheetPendingCellJournal
} from '../spreadsheetPendingJournal'

describe('spreadsheetPendingJournal', () => {
  it('builds a stable session storage key', () => {
    expect(buildSpreadsheetPendingCellJournalStorageKey('app-123')).toBe('spreadsheet-pending-cell-journal:app-123')
  })

  it('returns null for invalid persisted payloads', () => {
    const storage = {
      getItem: jest.fn().mockReturnValue('{invalid json')
    } as Pick<Storage, 'getItem'>

    expect(readSpreadsheetPendingCellJournal('journal-key', storage)).toBeNull()
  })

  it('filters invalid draft cells and pending batches while keeping valid entries', () => {
    const storage = {
      getItem: jest.fn().mockReturnValue(
        JSON.stringify({
          draftCells: [{ rowId: 'row-1', columnName: 'ColumnA', value: 'value' }, { nope: true }],
          pendingBatches: [
            {
              batchId: 'batch-1',
              targetSheetId: 'sheet-1',
              operations: [{ operationId: 'op-1', type: 'set_range', data: { cells: [] } }]
            },
            { batchId: 7 }
          ]
        })
      )
    } as Pick<Storage, 'getItem'>

    expect(readSpreadsheetPendingCellJournal('journal-key', storage)).toEqual({
      draftCells: [{ rowId: 'row-1', columnName: 'ColumnA', value: 'value' }],
      pendingBatches: [
        {
          batchId: 'batch-1',
          targetSheetId: 'sheet-1',
          operations: [{ operationId: 'op-1', type: 'set_range', data: { cells: [] } }]
        }
      ]
    })
  })

  it('removes the stored entry when the journal is empty', () => {
    const storage = {
      setItem: jest.fn(),
      removeItem: jest.fn()
    } as Pick<Storage, 'setItem' | 'removeItem'>

    writeSpreadsheetPendingCellJournal('journal-key', { draftCells: [], pendingBatches: [] }, storage)

    expect(storage.removeItem).toHaveBeenCalledWith('journal-key')
    expect(storage.setItem).not.toHaveBeenCalled()
  })

  it('writes the journal payload when entries exist', () => {
    const storage = {
      setItem: jest.fn(),
      removeItem: jest.fn()
    } as Pick<Storage, 'setItem' | 'removeItem'>

    writeSpreadsheetPendingCellJournal(
      'journal-key',
      {
        draftCells: [{ rowId: 'row-1', columnName: 'ColumnA', value: 'value', traceId: 'trace-1' }],
        pendingBatches: [
          {
            batchId: 'batch-1',
            targetSheetId: 'sheet-1',
            operations: [{ operationId: 'op-1', type: 'set_range', data: { cells: [] } }]
          }
        ]
      },
      storage
    )

    expect(storage.setItem).toHaveBeenCalledWith(
      'journal-key',
      JSON.stringify({
        draftCells: [{ rowId: 'row-1', columnName: 'ColumnA', value: 'value', traceId: 'trace-1' }],
        pendingBatches: [
          {
            batchId: 'batch-1',
            targetSheetId: 'sheet-1',
            operations: [{ operationId: 'op-1', type: 'set_range', data: { cells: [] } }]
          }
        ]
      })
    )
    expect(storage.removeItem).not.toHaveBeenCalled()
  })
})
