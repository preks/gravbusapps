import {
  applyColumnVisibilityRangesToSpreadsheetColumns,
  buildColumnVisibilityReplayOperations,
  mergeSheetColumnVisibilityFromLocal,
  shouldPreserveLocalColumnVisibilityOnHydration
} from '../spreadsheetColumnVisibilityMetadata'
import type { SpreadsheetColumn } from '../../types'

const column = (id: string, order: number, isVisible: boolean | undefined = true): SpreadsheetColumn =>
  ({
    id,
    name: id,
    label: id,
    type: 'text',
    order,
    isVisible
  }) as SpreadsheetColumn

describe('spreadsheetColumnVisibilityMetadata', () => {
  it('maps physical column indices to isVisible on hide and unhide', () => {
    const columns = [column('a', 0), column('b', 1), column('c', 2)]

    const hidden = applyColumnVisibilityRangesToSpreadsheetColumns(columns, true, [{ start: 1, end: 1 }])
    expect(hidden.find(entry => entry.id === 'b')?.isVisible).toBe(false)
    expect(hidden.find(entry => entry.id === 'a')?.isVisible).not.toBe(false)
    expect(hidden.find(entry => entry.id === 'c')?.isVisible).not.toBe(false)

    const visible = applyColumnVisibilityRangesToSpreadsheetColumns(hidden, false, [{ start: 1, end: 1 }])
    expect(visible.find(entry => entry.id === 'b')?.isVisible).toBe(true)
  })

  it('targets hidden columns by physical index when an earlier column is already hidden', () => {
    const columns = [column('a', 0), column('hidden', 1, false), column('c', 2)]

    const next = applyColumnVisibilityRangesToSpreadsheetColumns(columns, true, [{ start: 2, end: 2 }])
    expect(next.find(entry => entry.id === 'c')?.isVisible).toBe(false)
    expect(next.find(entry => entry.id === 'a')?.isVisible).not.toBe(false)
  })

  it('uses server column visibility on snapshot reload when no local visibility persist is pending', () => {
    const server = [column('a', 0), column('b', 1)]
    const local = [column('a', 0), column('b', 1, false)]

    const merged = mergeSheetColumnVisibilityFromLocal(server, local)
    expect(merged.find(entry => entry.id === 'b')?.isVisible).toBe(true)
  })

  it('preserves local hidden visibility while a visibility_update batch may still be queued', () => {
    const server = [column('a', 0), column('b', 1)]
    const local = [column('a', 0), column('b', 1, false)]

    const merged = mergeSheetColumnVisibilityFromLocal(server, local, { preserveLocalVisibility: true })
    expect(merged.find(entry => entry.id === 'b')?.isVisible).toBe(false)
  })

  it('builds replay operations for hidden columns using physical indices', () => {
    const operations = buildColumnVisibilityReplayOperations('sheet-1', [
      column('a', 0),
      column('hidden', 1, false),
      column('c', 2, false)
    ])

    expect(operations).toEqual([
      {
        type: 'visibility_update',
        data: {
          sheetId: 'sheet-1',
          axis: 'column',
          hidden: true,
          ranges: [{ start: 1, end: 2 }]
        }
      }
    ])
  })

  it('preserves local visibility on focus hydration even without pending persistence', () => {
    expect(
      shouldPreserveLocalColumnVisibilityOnHydration({
        reason: 'focus',
        hasPendingPersistence: false
      })
    ).toBe(true)
  })

  it('uses server visibility on reconnect hydration when there is no pending persistence', () => {
    expect(
      shouldPreserveLocalColumnVisibilityOnHydration({
        reason: 'reconnect',
        hasPendingPersistence: false
      })
    ).toBe(false)
  })
})
