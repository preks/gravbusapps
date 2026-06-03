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
      ).queuedCells
    ).toEqual([{ rowId: 'row-1', columnName: 'ColumnA', value: 'queued' }])
  })

  it('drops queued cells when add_rows already transmitted the same value for that column', () => {
    const result = reconcileQueuedDraftCellsForCreatedRows(
      [{ rowId: 'client_row_1', columnName: 'ColumnA', value: { v: 'fresh', t: 1 } }],
      [{ _id: 'client_row_1', _rowUuid: 'row-1', ColumnA: 'fresh' }],
      new Map([['client_row_1', 'row-1']]),
      new Map([['client_row_1', { ColumnA: 'fresh' }]])
    )

    expect(result.queuedCells).toEqual([])
    expect(result.droppedCellKeys).toEqual(['row-1\u0000ColumnA'])
  })

  it('leaves non-created-row queued cells untouched', () => {
    expect(
      reconcileQueuedDraftCellsForCreatedRows(
        [{ rowId: 'other-client-row', columnName: 'ColumnA', value: 'queued' }],
        [{ _id: 'client_row_1', _rowUuid: 'row-1', ColumnA: 'fresh' }],
        new Map([['client_row_1', 'row-1']])
      ).queuedCells
    ).toEqual([{ rowId: 'other-client-row', columnName: 'ColumnA', value: 'queued' }])
  })

  it('keeps queued cells when add_rows carried a different value', () => {
    const result = reconcileQueuedDraftCellsForCreatedRows(
      [{ rowId: 'client_row_1', columnName: 'ColumnA', value: 'fresh' }],
      [{ _id: 'client_row_1', _rowUuid: 'row-1', ColumnA: 'old' }],
      new Map([['client_row_1', 'row-1']]),
      new Map([['client_row_1', { ColumnA: 'old' }]])
    )

    expect(result.queuedCells).toEqual([{ rowId: 'row-1', columnName: 'ColumnA', value: 'fresh' }])
    expect(result.droppedCellKeys).toEqual([])
    expect(result.retainedCellKeys).toEqual(['row-1\u0000ColumnA'])
  })

  it('keeps queued cells when add_rows never carried that column (Fix F default-value case)', () => {
    const result = reconcileQueuedDraftCellsForCreatedRows(
      [{ rowId: 'client_row_1', columnName: 'ColumnA', value: 0 }],
      [{ _id: 'client_row_1', _rowUuid: 'row-1', ColumnA: 0 }],
      new Map([['client_row_1', 'row-1']]),
      new Map([['client_row_1', { ColumnB: 'other-value' }]])
    )

    expect(result.queuedCells).toEqual([{ rowId: 'row-1', columnName: 'ColumnA', value: 0 }])
    expect(result.droppedCellKeys).toEqual([])
  })
})
