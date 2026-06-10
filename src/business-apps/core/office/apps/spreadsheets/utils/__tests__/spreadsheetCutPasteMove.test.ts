import {
  filterColumnDeleteFormulaReapplyCells,
  cellRangeRectsSameDimensions,
  filterColumnMoveFormulaReapplyCells,
  filterMoveCellRangeFormulaReapplyCells,
  filterRowMoveFormulaReapplyCells,
  isNativeCutPasteCommand,
  resolveCutPasteCellRangeMove,
  shouldDropStandaloneDeleteColumnFormulaFollowUpBatch,
  shouldDropStandaloneMoveCellRangeFormulaFollowUpBatch
} from '../spreadsheetCutPasteMove'

describe('spreadsheetCutPasteMove', () => {
  it('detects native cut-paste command ids', () => {
    expect(isNativeCutPasteCommand('sheet.command.cut-paste')).toBe(true)
    expect(isNativeCutPasteCommand('sheet.command.paste')).toBe(false)
  })

  it('requires matching dimensions between source and destination', () => {
    expect(
      cellRangeRectsSameDimensions(
        { startRow: 0, endRow: 1, startColumn: 0, endColumn: 2 },
        { startRow: 5, endRow: 6, startColumn: 4, endColumn: 6 }
      )
    ).toBe(true)
    expect(
      cellRangeRectsSameDimensions(
        { startRow: 0, endRow: 1, startColumn: 0, endColumn: 2 },
        { startRow: 5, endRow: 7, startColumn: 4, endColumn: 6 }
      )
    ).toBe(false)
  })

  it('resolves move from command params when Univer includes fromRange and toRange', () => {
    const move = resolveCutPasteCellRangeMove({
      commandParams: {
        fromRange: { startRow: 1, endRow: 2, startColumn: 3, endColumn: 4 },
        toRange: { startRow: 8, endRow: 9, startColumn: 5, endColumn: 6 }
      },
      pendingCut: null,
      activeSheetId: 'sheet-1',
      workbook: null
    })
    expect(move).toEqual({
      fromRange: { startRow: 1, endRow: 2, startColumn: 3, endColumn: 4 },
      toRange: { startRow: 8, endRow: 9, startColumn: 5, endColumn: 6 }
    })
  })

  it('falls back to pending cut selection and active paste destination', () => {
    const workbook = {
      getActiveSheet: () => ({
        getSelection: () => ({
          getActiveRange: () => ({
            startRow: 10,
            endRow: 11,
            startColumn: 2,
            endColumn: 3
          })
        })
      })
    }
    const move = resolveCutPasteCellRangeMove({
      commandParams: {},
      pendingCut: {
        sheetId: 'sheet-1',
        fromRange: { startRow: 1, endRow: 2, startColumn: 0, endColumn: 1 },
        capturedAt: Date.now()
      },
      activeSheetId: 'sheet-1',
      workbook
    })
    expect(move).toEqual({
      fromRange: { startRow: 1, endRow: 2, startColumn: 0, endColumn: 1 },
      toRange: { startRow: 10, endRow: 11, startColumn: 2, endColumn: 3 }
    })
  })

  it('filters authoritative reapply formula cells after moving a formula row from 13 to 16', () => {
    const result = filterRowMoveFormulaReapplyCells({
      suppressUntilMs: Date.now() + 500,
      worksheetId: 'sheet-1',
      recentMove: {
        sheetId: 'sheet-1',
        followUpRanges: [
          {
            startRow: 13,
            endRow: Number.MAX_SAFE_INTEGER,
            startColumn: 0,
            endColumn: Number.MAX_SAFE_INTEGER
          }
        ]
      },
      cells: [
        {
          rowIndex: 13,
          colIndex: 6,
          value: { f: '=SUM(G1:G5)' }
        },
        {
          rowIndex: 16,
          colIndex: 6,
          options: { univerCell: { f: '=SUM(G2:G6)' } }
        },
        {
          rowIndex: 1,
          colIndex: 0,
          value: 'keep-me'
        }
      ]
    })

    expect(result.skippedCellCount).toBe(2)
    expect(result.cells).toEqual([
      {
        rowIndex: 1,
        colIndex: 0,
        value: 'keep-me'
      }
    ])
  })

  it('keeps authoritative reapply values outside the recent move formula window', () => {
    const result = filterRowMoveFormulaReapplyCells({
      suppressUntilMs: Date.now() + 500,
      worksheetId: 'sheet-1',
      recentMove: {
        sheetId: 'sheet-1',
        followUpRanges: [
          {
            startRow: 13,
            endRow: Number.MAX_SAFE_INTEGER,
            startColumn: 0,
            endColumn: Number.MAX_SAFE_INTEGER
          }
        ]
      },
      cells: [
        {
          rowIndex: 12,
          colIndex: 6,
          value: { f: '=SUM(G1:G5)' }
        },
        {
          rowIndex: 15,
          colIndex: 7,
          value: 99
        }
      ]
    })

    expect(result.skippedCellCount).toBe(0)
    expect(result.cells).toHaveLength(2)
  })

  it('filters authoritative reapply formula cells that overlap a recent moved cell range', () => {
    const result = filterMoveCellRangeFormulaReapplyCells({
      suppressUntilMs: Date.now() + 500,
      worksheetId: 'sheet-1',
      recentMove: {
        sheetId: 'sheet-1',
        fromRange: { startRow: 13, endRow: 13, startColumn: 6, endColumn: 6 },
        toRange: { startRow: 16, endRow: 16, startColumn: 6, endColumn: 6 }
      },
      cells: [
        { rowIndex: 13, colIndex: 6, value: { f: '=SUM(G1:G5)' } },
        { rowIndex: 16, colIndex: 6, options: { univerCell: { f: '=SUM(G2:G6)' } } },
        { rowIndex: 20, colIndex: 6, value: { f: '=SUM(G10:G11)' } }
      ]
    })

    expect(result.skippedCellCount).toBe(2)
    expect(result.cells).toEqual([{ rowIndex: 20, colIndex: 6, value: { f: '=SUM(G10:G11)' } }])
  })

  it('drops standalone move-cell formula follow-up batches when all formulas are outside the moved range', () => {
    expect(
      shouldDropStandaloneMoveCellRangeFormulaFollowUpBatch({
        suppressUntilMs: Date.now() + 500,
        targetSheetId: 'sheet-1',
        recentMove: {
          sheetId: 'sheet-1',
          fromRange: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
          toRange: { startRow: 0, endRow: 0, startColumn: 1, endColumn: 1 }
        },
        operations: [
          {
            type: 'set_range',
            data: {
              cells: [
                { rowId: 'row-1', columnName: 'column_c', value: { f: '=SUM(A1:B1)' }, row: 0, col: 2 },
                { rowId: 'row-2', columnName: 'column_c', value: { f: '=SUM(A2:B2)' }, row: 1, col: 2 }
              ]
            }
          }
        ]
      })
    ).toBe(true)
  })

  it('keeps single-cell move-cell formula repairs for later replay', () => {
    expect(
      shouldDropStandaloneMoveCellRangeFormulaFollowUpBatch({
        suppressUntilMs: Date.now() + 500,
        targetSheetId: 'sheet-1',
        recentMove: {
          sheetId: 'sheet-1',
          fromRange: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
          toRange: { startRow: 0, endRow: 0, startColumn: 1, endColumn: 1 }
        },
        operations: [
          {
            type: 'set_range',
            data: {
              cells: [{ rowId: 'row-1', columnName: 'column_c', value: { f: '=SUM(A1:B1)' }, row: 0, col: 2 }]
            }
          }
        ]
      })
    ).toBe(false)
  })

  it('filters authoritative reapply formula cells after reordering columns', () => {
    const result = filterColumnMoveFormulaReapplyCells({
      suppressUntilMs: Date.now() + 500,
      worksheetId: 'sheet-1',
      recentMove: {
        sheetId: 'sheet-1',
        followUpRanges: [
          {
            startRow: 0,
            endRow: Number.MAX_SAFE_INTEGER,
            startColumn: 1,
            endColumn: Number.MAX_SAFE_INTEGER
          }
        ]
      },
      cells: [
        { rowIndex: 5, colIndex: 1, value: { f: '=B1' } },
        { rowIndex: 5, colIndex: 4, options: { univerCell: { f: '=E1' } } },
        { rowIndex: 5, colIndex: 0, value: 'keep' }
      ]
    })

    expect(result.skippedCellCount).toBe(2)
    expect(result.cells).toEqual([{ rowIndex: 5, colIndex: 0, value: 'keep' }])
  })

  it('keeps single-cell column formula reapply repairs', () => {
    const result = filterColumnMoveFormulaReapplyCells({
      suppressUntilMs: Date.now() + 500,
      worksheetId: 'sheet-1',
      recentMove: {
        sheetId: 'sheet-1',
        followUpRanges: [
          {
            startRow: 0,
            endRow: Number.MAX_SAFE_INTEGER,
            startColumn: 2,
            endColumn: Number.MAX_SAFE_INTEGER
          }
        ]
      },
      cells: [{ rowIndex: 5, colIndex: 2, value: { f: '=C1' } }]
    })

    expect(result.skippedCellCount).toBe(0)
    expect(result.cells).toHaveLength(1)
  })

  it('drops single-cell column-delete formula follow-up batches from the listener emit path', () => {
    expect(
      shouldDropStandaloneDeleteColumnFormulaFollowUpBatch({
        suppressUntilMs: Date.now() + 500,
        targetSheetId: 'sheet-1',
        recentDelete: {
          sheetId: 'sheet-1',
          followUpRanges: [
            {
              startRow: 0,
              endRow: Number.MAX_SAFE_INTEGER,
              startColumn: 2,
              endColumn: Number.MAX_SAFE_INTEGER
            }
          ]
        },
        operations: [
          {
            type: 'set_range',
            data: {
              cells: [{ rowId: 'row-1', columnName: 'column_c', value: { f: '=SUM(C1:C5)' }, row: 0, col: 2 }]
            }
          }
        ]
      })
    ).toBe(true)
  })

  it('keeps single-cell column-delete formula repairs for authoritative reapply', () => {
    const result = filterColumnDeleteFormulaReapplyCells({
      suppressUntilMs: Date.now() + 500,
      worksheetId: 'sheet-1',
      recentDelete: {
        sheetId: 'sheet-1',
        followUpRanges: [
          {
            startRow: 0,
            endRow: Number.MAX_SAFE_INTEGER,
            startColumn: 2,
            endColumn: Number.MAX_SAFE_INTEGER
          }
        ]
      },
      cells: [{ rowIndex: 0, colIndex: 2, value: { f: '=SUM(C1:C5)' } }]
    })

    expect(result.skippedCellCount).toBe(0)
    expect(result.cells).toHaveLength(1)
  })
})
