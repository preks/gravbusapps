import type { SpreadsheetColumn } from '../../types/spreadsheet'
import {
  applyMoveCellRangeToViewerRows,
  buildColumnNamesByVisibleGridIndex,
  countVisibleGridColumns,
  parseMoveCellRangeWirePayload,
  validateMoveCellRangeForVisibleGrid
} from '../spreadsheetMoveCellRangeGrid'

const col = (
  partial: Partial<SpreadsheetColumn> & Pick<SpreadsheetColumn, 'id' | 'name' | 'order'>
): SpreadsheetColumn => ({
  type: 'text',
  label: partial.name,
  isEditable: true,
  isRequired: false,
  isUnique: false,
  isVisible: true,
  ...partial
})

describe('spreadsheetMoveCellRangeGrid', () => {
  const columnsWithHidden = [
    col({ id: 'a', name: 'col_a', order: 0, isVisible: true }),
    col({ id: 'b', name: 'col_b', order: 1, isVisible: false }),
    col({ id: 'c', name: 'col_c', order: 2, isVisible: true }),
    col({ id: 'd', name: 'col_d', order: 3, isVisible: true })
  ]

  it('maps visible grid indices to visible column names only', () => {
    expect(countVisibleGridColumns(columnsWithHidden)).toBe(3)
    expect(buildColumnNamesByVisibleGridIndex(columnsWithHidden)).toEqual(['col_a', 'col_c', 'col_d'])
  })

  it('relocates session values using visible grid column index (skips hidden columns)', () => {
    const rows = [
      { _id: 'r0', _gridRowIndex: 0, col_a: 'A', col_c: 'C' },
      { _id: 'r1', _gridRowIndex: 1 }
    ]
    const next = applyMoveCellRangeToViewerRows({
      rows,
      columns: columnsWithHidden,
      fromRange: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
      toRange: { startRow: 1, endRow: 1, startColumn: 1, endColumn: 1 }
    })
    expect((next[0] as Record<string, unknown>).col_a).toBeUndefined()
    expect((next[1] as Record<string, unknown>).col_c).toBe('A')
  })

  it('rejects column indices outside the visible grid', () => {
    const result = validateMoveCellRangeForVisibleGrid(
      columnsWithHidden,
      { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
      { startRow: 0, endRow: 0, startColumn: 3, endColumn: 3 }
    )
    expect(result).toEqual({ ok: false, reason: 'column_out_of_bounds' })
  })

  it('rejects unequal source and destination dimensions', () => {
    const result = validateMoveCellRangeForVisibleGrid(
      columnsWithHidden,
      { startRow: 0, endRow: 1, startColumn: 0, endColumn: 0 },
      { startRow: 0, endRow: 0, startColumn: 1, endColumn: 1 }
    )
    expect(result).toEqual({ ok: false, reason: 'dimension_mismatch' })
  })

  it('parses wire payloads and leaves rows unchanged when invalid', () => {
    const rows = [{ _id: 'r0', col_a: 'keep' }]
    const unchanged = applyMoveCellRangeToViewerRows({
      rows,
      columns: columnsWithHidden,
      fromRange: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
      toRange: { startRow: 0, endRow: 0, startColumn: 9, endColumn: 9 }
    })
    expect(unchanged).toBe(rows)

    const parsed = parseMoveCellRangeWirePayload({
      fromRange: { startRow: 4, startColumn: 7, endRow: 4, endColumn: 7 },
      toRange: { startRow: 6, startColumn: 6, endRow: 6, endColumn: 6 }
    })
    expect(parsed).toEqual({
      fromRange: { startRow: 4, endRow: 4, startColumn: 7, endColumn: 7 },
      toRange: { startRow: 6, endRow: 6, startColumn: 6, endColumn: 6 }
    })
  })
})
