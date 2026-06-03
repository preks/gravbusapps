import {
  convertBackendDirtyRegionsToDeltaRegions,
  resolveBackendDirtyRegionsToAuthoritativeRegions
} from '../spreadsheetDirtyRegions'
import type { SpreadsheetColumn } from '../../types/spreadsheet'

const columns: SpreadsheetColumn[] = [
  { id: 'column_j', name: 'J', isVisible: true, order: 0 },
  { id: 'column_m', name: 'M', isVisible: true, order: 1 }
]

describe('spreadsheetDirtyRegions', () => {
  it('resolves backend cell dirty metadata to exact rects', () => {
    const rows = [{ _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 139, J: 1, M: 2 }]
    const delta = convertBackendDirtyRegionsToDeltaRegions({
      dirtyRegions: [
        { type: 'cell', row: 139, col: 0, columnName: 'J' },
        { type: 'cell', row: 139, col: 1, columnName: 'M' }
      ],
      columns,
      rows
    })

    expect(delta).toEqual([
      { type: 'rect', minRow: 139, maxRow: 139, minCol: 0, maxCol: 0 },
      { type: 'rect', minRow: 139, maxRow: 139, minCol: 1, maxCol: 1 }
    ])
  })

  it('returns multiple authoritative regions for disjoint backend cells', () => {
    const rows = [
      { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 10, J: 1 },
      { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 50, M: 2 }
    ]
    const regions = resolveBackendDirtyRegionsToAuthoritativeRegions({
      dirtyRegions: [
        { type: 'cell', row: 10, col: 0 },
        { type: 'cell', row: 50, col: 1 }
      ],
      columns,
      rows
    })

    expect(regions).toEqual([
      { minRow: 10, maxRow: 10, minCol: 0, maxCol: 0 },
      { minRow: 50, maxRow: 50, minCol: 1, maxCol: 1 }
    ])
  })
})
