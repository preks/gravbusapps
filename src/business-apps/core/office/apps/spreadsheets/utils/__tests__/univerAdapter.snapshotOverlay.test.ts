import type { SpreadsheetColumn } from '../../types/spreadsheet'
import {
  mergeAuthoritativeViewerRowsIntoWorkbookSnapshot,
  workbookSnapshotMismatchesViewerRows
} from '../univerAdapter'

const textCol = (id: string, name: string, order: number): SpreadsheetColumn => ({
  id,
  name,
  label: name,
  type: 'text',
  isVisible: true,
  isEditable: true,
  isRequired: false,
  isUnique: false,
  order
})

describe('univerAdapter snapshot row overlay', () => {
  const sheetId = 'sheet-1'
  const columns: SpreadsheetColumn[] = [textCol('c0', 'alpha', 0), textCol('c1', 'beta', 1)]

  it('workbookSnapshotMismatchesViewerRows detects null snapshot cell vs row value', () => {
    const viewerRows: Record<string, unknown>[] = Array.from({ length: 15 }, () => ({}))
    viewerRows[12] = { alpha: 'a', beta: 'b' }

    const snapshot: Record<string, unknown> = {
      id: 'wb',
      name: 'W',
      sheetOrder: [sheetId],
      sheets: {
        [sheetId]: {
          id: sheetId,
          name: 'S',
          cellData: {
            12: {
              0: { v: 'a' },
              1: { v: null }
            }
          }
        }
      }
    }

    expect(workbookSnapshotMismatchesViewerRows(snapshot, sheetId, viewerRows, columns)).toBe(true)
  })

  it('mergeAuthoritativeViewerRowsIntoWorkbookSnapshot overwrites stale cells from rows', () => {
    const viewerRows: Record<string, unknown>[] = Array.from({ length: 15 }, () => ({}))
    viewerRows[12] = { alpha: 'a', beta: 'synced' }

    const snapshot: Record<string, unknown> = {
      id: 'wb',
      name: 'W',
      sheetOrder: [sheetId],
      sheets: {
        [sheetId]: {
          id: sheetId,
          name: 'S',
          cellData: {
            12: {
              0: { v: 'a' },
              1: { v: null }
            }
          },
          mergeData: [{ startRow: 0, startColumn: 0, endRow: 0, endColumn: 1 }]
        }
      }
    }

    const merged = mergeAuthoritativeViewerRowsIntoWorkbookSnapshot(snapshot, sheetId, viewerRows, columns)
    const ws = (merged.sheets as Record<string, { cellData?: Record<number, Record<number, { v?: unknown }>> }>)[
      sheetId
    ]
    expect(ws?.cellData?.[12]?.[1]?.v).toBe('synced')
    expect(ws?.mergeData).toEqual([{ startRow: 0, startColumn: 0, endRow: 0, endColumn: 1 }])
    expect(workbookSnapshotMismatchesViewerRows(merged, sheetId, viewerRows, columns)).toBe(false)
  })
})
