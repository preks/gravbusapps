import {
  coalesceQueuedCellChanges,
  reconcileQueuedDraftCellsForCreatedRows,
  shouldSkipFreshRowCellReplay
} from '../spreadsheetPendingCells'

describe('coalesceQueuedCellChanges', () => {
  it('keeps only the latest queued edit for each logical cell', () => {
    expect(
      coalesceQueuedCellChanges([
        { sheetId: 'sheet-1', rowId: 'row-1', columnName: 'ColumnA', value: 'first' },
        { sheetId: 'sheet-1', rowId: 'row-1', columnName: 'ColumnA', value: 'second' },
        { sheetId: 'sheet-1', rowId: 'row-1', columnName: 'ColumnB', value: 1 }
      ])
    ).toEqual([
      { sheetId: 'sheet-1', rowId: 'row-1', columnName: 'ColumnA', value: 'second' },
      { sheetId: 'sheet-1', rowId: 'row-1', columnName: 'ColumnB', value: 1 }
    ])
  })

  it('preserves clears and keeps sheet scopes independent', () => {
    expect(
      coalesceQueuedCellChanges([
        { sheetId: 'sheet-1', rowId: 'row-1', columnName: 'ColumnA', value: 'typed' },
        { sheetId: 'sheet-2', rowId: 'row-1', columnName: 'ColumnA', value: 'other-sheet' },
        { sheetId: 'sheet-1', rowId: 'row-1', columnName: 'ColumnA', value: undefined }
      ])
    ).toEqual([
      { sheetId: 'sheet-2', rowId: 'row-1', columnName: 'ColumnA', value: 'other-sheet' },
      { sheetId: 'sheet-1', rowId: 'row-1', columnName: 'ColumnA', value: undefined }
    ])
  })
})

describe('shouldSkipFreshRowCellReplay', () => {
  it('skips identical queued values', () => {
    expect(shouldSkipFreshRowCellReplay('value', 'value')).toBe(true)
    expect(shouldSkipFreshRowCellReplay({ v: 'x' }, { v: 'x' })).toBe(true)
  })

  it('skips blank queued values when the fresh row already has a value', () => {
    expect(shouldSkipFreshRowCellReplay('fresh', undefined)).toBe(true)
    expect(shouldSkipFreshRowCellReplay({ v: 'fresh' }, { v: '' })).toBe(true)
  })

  it('keeps queued values that still differ from the created row baseline', () => {
    expect(shouldSkipFreshRowCellReplay('fresh', 'different')).toBe(false)
  })
})

describe('reconcileQueuedDraftCellsForCreatedRows', () => {
  it('rewrites client row ids to persisted row ids when the queued value still needs replay', () => {
    expect(
      reconcileQueuedDraftCellsForCreatedRows(
        [{ rowId: 'client_row_1', columnName: 'ColumnA', value: 'queued' }],
        [{ _id: 'client_row_1', _rowUuid: 'row-1', ColumnA: 'fresh' }],
        new Map([['client_row_1', 'row-1']])
      )
    ).toEqual([{ rowId: 'row-1', columnName: 'ColumnA', value: 'queued' }])
  })

  it('preserves queued cells even when value equals the freshly created row baseline (Fix F)', () => {
    // Pre-Fix-F behaviour dropped these as redundant, silently swallowing legitimate user writes
    // such as "type 0 into a numeric column whose default is 0". Post-Fix F we always replay so
    // audit / collab logs see the explicit edit.
    expect(
      reconcileQueuedDraftCellsForCreatedRows(
        [{ rowId: 'client_row_1', columnName: 'ColumnA', value: 'fresh' }],
        [{ _id: 'client_row_1', _rowUuid: 'row-1', ColumnA: 'fresh' }],
        new Map([['client_row_1', 'row-1']])
      )
    ).toEqual([{ rowId: 'row-1', columnName: 'ColumnA', value: 'fresh' }])
  })

  it('leaves non-created-row queued cells untouched', () => {
    expect(
      reconcileQueuedDraftCellsForCreatedRows(
        [{ rowId: 'other-client-row', columnName: 'ColumnA', value: 'queued' }],
        [{ _id: 'client_row_1', _rowUuid: 'row-1', ColumnA: 'fresh' }],
        new Map([['client_row_1', 'row-1']])
      )
    ).toEqual([{ rowId: 'other-client-row', columnName: 'ColumnA', value: 'queued' }])
  })
})
