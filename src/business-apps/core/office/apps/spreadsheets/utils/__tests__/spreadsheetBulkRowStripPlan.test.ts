import type { SpreadsheetBulkRemoteCellItem } from '../../core'
import { bulkCellHasNoIncomingStyle, planBulkRowStrips } from '../spreadsheetBulkRowStripPlan'

const cell = (
  rowIndex: number,
  colIndex: number,
  value: unknown = 'v',
  options?: SpreadsheetBulkRemoteCellItem['options']
): SpreadsheetBulkRemoteCellItem => ({ rowIndex, colIndex, value, options })

describe('planBulkRowStrips', () => {
  it('returns no strips for an empty input', () => {
    expect(planBulkRowStrips([])).toEqual([])
  })

  it('merges contiguous columns in the same row into a single strip', () => {
    const strips = planBulkRowStrips([cell(5, 2, 'a'), cell(5, 3, 'b'), cell(5, 4, 'c')])
    expect(strips).toHaveLength(1)
    expect(strips[0]).toMatchObject({ rowIndex: 5, startCol: 2, styleSafe: true })
    expect(strips[0]!.cells.map(c => c.colIndex)).toEqual([2, 3, 4])
  })

  it('breaks a strip on a column gap', () => {
    const strips = planBulkRowStrips([cell(0, 0), cell(0, 1), cell(0, 3)])
    expect(strips.map(s => ({ row: s.rowIndex, start: s.startCol, len: s.cells.length }))).toEqual([
      { row: 0, start: 0, len: 2 },
      { row: 0, start: 3, len: 1 }
    ])
  })

  it('groups by row in ascending order and sorts columns within each row', () => {
    const strips = planBulkRowStrips([cell(3, 1), cell(1, 4), cell(1, 3), cell(3, 0)])
    expect(strips).toEqual([
      expect.objectContaining({ rowIndex: 1, startCol: 3, cells: expect.arrayContaining([]) }),
      expect.objectContaining({ rowIndex: 3, startCol: 0 })
    ])
    expect(strips[0]!.cells.map(c => c.colIndex)).toEqual([3, 4])
    expect(strips[1]!.cells.map(c => c.colIndex)).toEqual([0, 1])
  })

  it('dedupes duplicate (row, col) keeping the last write', () => {
    const strips = planBulkRowStrips([cell(0, 0, 'first'), cell(0, 0, 'second'), cell(0, 1, 'x')])
    expect(strips).toHaveLength(1)
    expect(strips[0]!.cells.map(c => c.value)).toEqual(['second', 'x'])
  })

  it('marks a strip styleSafe=false when any cell carries univerStyles', () => {
    const strips = planBulkRowStrips([
      cell(0, 0, 'a'),
      cell(0, 1, 'b', { univerStyles: { s1: { bg: { rgb: '#fff' } } } } as never)
    ])
    expect(strips).toHaveLength(1)
    expect(strips[0]!.styleSafe).toBe(false)
  })

  it('marks a strip styleSafe=false when any cell carries a univerCell payload', () => {
    const strips = planBulkRowStrips([cell(0, 0, 'a'), cell(0, 1, 'b', { univerCell: { v: 'b', s: 'sid' } } as never)])
    expect(strips[0]!.styleSafe).toBe(false)
  })

  it('marks a strip styleSafe=false when any cell carries a stylePatch with sets', () => {
    const strips = planBulkRowStrips([cell(0, 0, 'a', { stylePatch: { set: { bl: 1 } } } as never), cell(0, 1, 'b')])
    expect(strips[0]!.styleSafe).toBe(false)
  })

  it('ignores empty style payloads when computing styleSafe', () => {
    const strips = planBulkRowStrips([
      cell(0, 0, 'a', { univerStyles: {} } as never),
      cell(0, 1, 'b', { univerCell: {}, stylePatch: { set: {}, unset: [] } } as never)
    ])
    expect(strips[0]!.styleSafe).toBe(true)
  })
})

describe('bulkCellHasNoIncomingStyle', () => {
  it('treats missing options as style-free', () => {
    expect(bulkCellHasNoIncomingStyle(cell(0, 0))).toBe(true)
  })

  it('returns false for non-empty univerCell payload', () => {
    expect(bulkCellHasNoIncomingStyle(cell(0, 0, null, { univerCell: { v: 1 } } as never))).toBe(false)
  })

  it('returns false for non-empty stylePatch.unset', () => {
    expect(bulkCellHasNoIncomingStyle(cell(0, 0, null, { stylePatch: { unset: ['bl'] } } as never))).toBe(false)
  })
})
