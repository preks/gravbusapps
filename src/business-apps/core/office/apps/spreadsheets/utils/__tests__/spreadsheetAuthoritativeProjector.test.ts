import {
  buildAuthoritativePaintCellsForMaterializedRows,
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
    expect(items).toEqual([
      expect.objectContaining({
        rowIndex: 0,
        colIndex: 1,
        value: 'peer',
        rowId: 'row-1',
        options: { useSenderA1Row: true }
      })
    ])
  })

  it('does not emit adjacent-slot diff paints for unchanged rows shifted by inserted empty rows', () => {
    const columns = [column('A', 0)]
    const before = [
      { _id: 'row-1', _gridRowIndex: 0, A: '' },
      { _id: 'row-2', _gridRowIndex: 1, A: '' }
    ]
    const after = [
      { _id: 'row-1', _gridRowIndex: 0, A: '' },
      { _id: 'inserted-row', _gridRowIndex: 1, A: 99 },
      { _id: 'row-2', _gridRowIndex: 2, A: '' }
    ]

    const items = diffViewerRowsToAuthoritativePaintCells(before, after, columns)

    expect(items).toEqual([])
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
    expect(items.every(item => item.options?.useSenderA1Row === true)).toBe(true)
  })

  it('buildAuthoritativePaintCellsForMaterializedRows returns only the materialized region cells', () => {
    const columns = [column('A', 0), column('B', 1)]
    const data = [
      { _id: 'row-0', _rowUuid: 'row-0', _gridRowIndex: 0, A: 'keep', B: 'keep' },
      { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 1, A: 'new-a', B: 'new-b' }
    ]

    const items = buildAuthoritativePaintCellsForMaterializedRows(data, columns, {
      minRow: 1,
      maxRow: 1,
      minCol: 0,
      maxCol: 1
    })

    expect(items).toEqual([
      expect.objectContaining({ rowIndex: 1, colIndex: 0, value: 'new-a', rowId: 'row-1' }),
      expect.objectContaining({ rowIndex: 1, colIndex: 1, value: 'new-b', rowId: 'row-1' })
    ])
  })
})
