import {
  buildAuthoritativePaintCellsFromViewerRows,
  diffViewerRowsToAuthoritativePaintCells
} from '../spreadsheetAuthoritativeProjector'
import type { SpreadsheetColumn } from '../../types'

const column = (name: string, order: number): SpreadsheetColumn =>
  ({
    id: `col-${name}`,
    name,
    label: name,
    type: 'text',
    order,
    isVisible: true
  }) as SpreadsheetColumn

describe('spreadsheetAuthoritativeProjector', () => {
  it('diffViewerRowsToAuthoritativePaintCells emits only changed cells', () => {
    const columns = [column('A', 0), column('B', 1)]
    const before = [{ _id: 'row-1', _gridRowIndex: 0, A: 'x', B: 'y' }]
    const after = [{ _id: 'row-1', _gridRowIndex: 0, A: 'x', B: 'peer' }]

    const items = diffViewerRowsToAuthoritativePaintCells(before, after, columns)
    expect(items).toEqual([expect.objectContaining({ rowIndex: 0, colIndex: 1, value: 'peer', rowId: 'row-1' })])
  })

  it('buildAuthoritativePaintCellsFromViewerRows projects a bounded region', () => {
    const columns = [column('M', 0)]
    const data = Array.from({ length: 4 }, (_, index) => ({
      _id: `row-${index}`,
      _gridRowIndex: index,
      M: `v${index}`
    }))
    const items = buildAuthoritativePaintCellsFromViewerRows(data, columns, {
      regions: [{ minRow: 1, maxRow: 2, minCol: 0, maxCol: 0 }]
    })
    expect(items.map(item => item.rowIndex)).toEqual([1, 2])
    expect(items[0].value).toBe('v1')
  })
})
