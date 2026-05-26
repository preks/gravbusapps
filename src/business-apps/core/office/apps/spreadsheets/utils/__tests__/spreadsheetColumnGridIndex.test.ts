import {
  coalesceAdjacentColumnSlotDeletes,
  coalesceAdjacentColumnSlotInserts,
  extractContiguousColumnSlotDelete,
  extractContiguousColumnSlotInsert,
  mergeRemoteColumnAdd,
  mergeRemoteColumnDelete,
  visibleGridColumnIndexFromColumn,
  visibleInsertIndexFromColumnOrder
} from '../spreadsheetColumnGridIndex'
import type { SpreadsheetColumn } from '../../types'

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

describe('spreadsheetColumnGridIndex', () => {
  it('coalesces consecutive column slot inserts into one range', () => {
    expect(
      coalesceAdjacentColumnSlotInserts([
        { startGridColumnIndex: 6, count: 1 },
        { startGridColumnIndex: 7, count: 1 },
        { startGridColumnIndex: 8, count: 1 },
        { startGridColumnIndex: 9, count: 1 }
      ])
    ).toEqual([{ startGridColumnIndex: 6, count: 4 }])
  })

  it('derives insert index from column order among existing columns', () => {
    const columns = Array.from({ length: 7 }, (_, order) => col({ id: `col-${order}`, name: `Column ${order}`, order }))
    const added = Array.from({ length: 4 }, (_, offset) =>
      col({ id: `new-${offset}`, name: `New ${offset}`, order: 7 + offset })
    )
    expect(extractContiguousColumnSlotInsert(columns, added)).toEqual({
      startGridColumnIndex: 7,
      count: 4
    })
    expect(visibleInsertIndexFromColumnOrder(columns, 7)).toBe(7)
  })

  it('maps appended column order to the next visible grid index', () => {
    const columns = [col({ id: 'a', name: 'A', order: 0 }), col({ id: 'b', name: 'B', order: 1 })]
    const merged = mergeRemoteColumnAdd(columns, col({ id: 'c', name: 'C', order: 2 }))
    expect(visibleGridColumnIndexFromColumn(merged, col({ id: 'c', name: 'C', order: 2 }))).toBe(2)
  })

  it('coalesces consecutive column slot deletes into one range', () => {
    expect(
      coalesceAdjacentColumnSlotDeletes([
        { startGridColumnIndex: 2, count: 1 },
        { startGridColumnIndex: 3, count: 1 },
        { startGridColumnIndex: 4, count: 1 }
      ])
    ).toEqual([{ startGridColumnIndex: 2, count: 3 }])
  })

  it('derives delete index from deleted column ids among existing columns', () => {
    const columns = Array.from({ length: 6 }, (_, order) => col({ id: `col-${order}`, name: `Column ${order}`, order }))
    expect(extractContiguousColumnSlotDelete(columns, ['col-2', 'col-3', 'col-4'])).toEqual({
      startGridColumnIndex: 2,
      count: 3
    })
  })

  it('removes a column by id and reindexes orders', () => {
    const columns = [col({ id: 'a', name: 'A', order: 0 }), col({ id: 'b', name: 'B', order: 1 })]
    expect(mergeRemoteColumnDelete(columns, 'a')).toEqual([col({ id: 'b', name: 'B', order: 0 })])
  })
})
