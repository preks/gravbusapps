import { tryComputeAuthoritativeRegionFromReplayDeltas } from '../spreadsheetAuthoritativeRegion'
import type { SpreadsheetColumn } from '../../types/spreadsheet'
import type { SpreadsheetReplayDelta } from '../../core'

function col(partial: Partial<SpreadsheetColumn> & Pick<SpreadsheetColumn, 'id' | 'name'>): SpreadsheetColumn {
  return {
    type: 'text',
    label: partial.name,
    isEditable: true,
    isRequired: false,
    isUnique: false,
    order: 0,
    isVisible: true,
    ...partial
  }
}

describe('tryComputeAuthoritativeRegionFromReplayDeltas', () => {
  const columns: SpreadsheetColumn[] = [col({ id: 'col-a', name: 'ColumnA', order: 0 })]

  it('returns bounding box for set_range cells', () => {
    const rows: Record<string, unknown>[] = [
      { _id: 'r0', ColumnA: 1 },
      { _id: 'r1', ColumnA: 2 }
    ]
    const changes: SpreadsheetReplayDelta[] = [
      {
        operationType: 'set_range',
        appliedVersion: 2,
        payload: {
          cells: [
            { rowId: 'r0', columnName: 'ColumnA', value: 10 },
            { rowId: 'r1', columnName: 'ColumnA', value: 20 }
          ]
        }
      }
    ]
    const region = tryComputeAuthoritativeRegionFromReplayDeltas({ changes, columns, rows })
    expect(region).toEqual({ minRow: 0, maxRow: 1, minCol: 0, maxCol: 0 })
  })

  it('returns region for set_style with row/col', () => {
    const rows: Record<string, unknown>[] = [{ _id: 'r0', ColumnA: 1 }]
    const changes: SpreadsheetReplayDelta[] = [
      {
        operationType: 'set_style',
        appliedVersion: 1,
        payload: {
          cells: [
            { row: 0, col: 0, styleId: 's1' },
            { row: 2, col: 1, styleId: 's1' }
          ]
        }
      }
    ]
    const region = tryComputeAuthoritativeRegionFromReplayDeltas({ changes, columns, rows })
    expect(region).toEqual({ minRow: 0, maxRow: 2, minCol: 0, maxCol: 1 })
  })

  it('returns undefined when no resolvable coordinates', () => {
    const rows: Record<string, unknown>[] = []
    const changes: SpreadsheetReplayDelta[] = [
      {
        operationType: 'set_range',
        appliedVersion: 1,
        payload: { cells: [{ rowId: 'missing', columnName: 'ColumnA', value: 1 }] }
      }
    ]
    expect(tryComputeAuthoritativeRegionFromReplayDeltas({ changes, columns, rows })).toBeUndefined()
  })
})
