import { buildSpreadsheetCursorPath, parseSpreadsheetCursorPath } from '../cursorPathUtils'

describe('cursorPathUtils', () => {
  it('round-trips a sheet-scoped cursor path', () => {
    const path = buildSpreadsheetCursorPath('sheet-b', 'C4', 3, 2)

    expect(path).toEqual(['sheetId:sheet-b', 'cellRef:C4', 'row:3', 'col:2'])
    expect(parseSpreadsheetCursorPath(path, 'sheet-b', { requireSheetMatch: true })).toEqual({
      row: 3,
      col: 2,
      endRow: undefined,
      endCol: undefined
    })
  })

  it('round-trips a multi-cell range cursor path', () => {
    const path = buildSpreadsheetCursorPath('sheet-b', 'B2', 1, 1, 4, 5)

    expect(path).toEqual(['sheetId:sheet-b', 'cellRef:B2', 'row:1', 'col:1', 'endRow:4', 'endCol:5'])
    expect(parseSpreadsheetCursorPath(path, 'sheet-b', { requireSheetMatch: true })).toEqual({
      row: 1,
      col: 1,
      endRow: 4,
      endCol: 5
    })
  })

  it('omits range keys when range is a single cell', () => {
    const path = buildSpreadsheetCursorPath('sheet-b', 'B2', 1, 1, 1, 1)

    expect(path).toEqual(['sheetId:sheet-b', 'cellRef:B2', 'row:1', 'col:1'])
  })

  it('does not parse a cursor from a different sheet', () => {
    const path = buildSpreadsheetCursorPath('sheet-b', 'A1', 0, 0)

    expect(parseSpreadsheetCursorPath(path, 'sheet-a', { requireSheetMatch: true })).toBeNull()
  })

  it('hides modern cursor paths without sheet identity when sheet match is required', () => {
    expect(
      parseSpreadsheetCursorPath(['cellRef:A1', 'row:0', 'col:0'], 'sheet-a', { requireSheetMatch: true })
    ).toBeNull()
  })

  it('keeps single-sheet compatibility for cursor paths without sheet identity', () => {
    expect(parseSpreadsheetCursorPath(['cellRef:B2', 'row:1', 'col:1'], 'sheet-a')).toEqual({ row: 1, col: 1 })
  })
})
