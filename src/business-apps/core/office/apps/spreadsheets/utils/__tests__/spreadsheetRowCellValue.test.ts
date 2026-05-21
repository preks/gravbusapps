import type { SpreadsheetColumn } from '../../types/spreadsheet'
import { readSpreadsheetRowCellValue } from '../spreadsheetRowCellValue'

describe('readSpreadsheetRowCellValue', () => {
  const column: SpreadsheetColumn = {
    id: 'col_a',
    name: 'Alpha',
    type: 'text',
    width: 100,
    isVisible: true
  }

  it('reads name, id-only, and id when name is undefined (merged/collab rows)', () => {
    expect(readSpreadsheetRowCellValue({ Alpha: 1 }, column)).toBe(1)
    expect(readSpreadsheetRowCellValue({ col_a: 2 }, column)).toBe(2)
    expect(readSpreadsheetRowCellValue({ Alpha: undefined, col_a: 'peer' }, column)).toBe('peer')
  })

  it('keeps explicit null on name without reading id (do not use nullish coalescing)', () => {
    expect(readSpreadsheetRowCellValue({ Alpha: null, col_a: 5 }, column)).toBeNull()
  })

  it('falls back to case-insensitive key match', () => {
    expect(readSpreadsheetRowCellValue({ alpha: 'x' }, column)).toBe('x')
  })

  it('normalizes rich cell objects vs plain objects', () => {
    expect(readSpreadsheetRowCellValue({ Alpha: { v: 3 } }, column)).toEqual({ v: 3 })
    expect(readSpreadsheetRowCellValue({ Alpha: { other: 1 } }, column)).toBe('')
  })
})
