import type { SpreadsheetColumn } from '../../types/spreadsheet'
import {
  mergeAuthoritativeViewerRowsIntoWorkbookSnapshot,
  mergeWorkbookFormattingFromDonor,
  workbookFormattingRichnessScore,
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

describe('workbookFormattingRichnessScore', () => {
  const sheetId = 'sheet-1'

  it('counts workbook styles and cell s refs', () => {
    const snap: Record<string, unknown> = {
      id: 'wb',
      styles: { st1: { bl: 1 }, st2: { it: 1 } },
      sheetOrder: [sheetId],
      sheets: {
        [sheetId]: {
          id: sheetId,
          cellData: {
            0: { 0: { v: 'x', s: 'st1' }, 1: { v: 'y' } }
          }
        }
      }
    }
    expect(workbookFormattingRichnessScore(snap, sheetId)).toBe(3)
  })
})

describe('mergeWorkbookFormattingFromDonor', () => {
  const sheetId = 'sheet-1'

  it('fills missing cell s and merges styles map from donor', () => {
    const into: Record<string, unknown> = {
      id: 'wb',
      sheetOrder: [sheetId],
      sheets: {
        [sheetId]: {
          id: sheetId,
          cellData: {
            0: { 0: { v: 'hello' } }
          }
        }
      }
    }
    const donor: Record<string, unknown> = {
      id: 'wb2',
      styles: { boldId: { bl: 1 } },
      sheetOrder: [sheetId],
      sheets: {
        [sheetId]: {
          id: sheetId,
          cellData: {
            0: { 0: { v: 'old', s: 'boldId' } }
          }
        }
      }
    }
    const merged = mergeWorkbookFormattingFromDonor(into, donor, sheetId)
    expect((merged.styles as Record<string, unknown>).boldId).toEqual({ bl: 1 })
    const cell = (
      merged.sheets as Record<string, { cellData: Record<number, Record<number, { v?: string; s?: string }>> }>
    )[sheetId].cellData[0][0]
    expect(cell.v).toBe('hello')
    expect(cell.s).toBe('boldId')
  })
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

  it('mergeAuthoritativeViewerRowsIntoWorkbookSnapshot preserves snapshot style ref when row is value-only', () => {
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
              0: { v: 'a', s: 'style-bold' },
              1: { v: null, s: 'style-italic' }
            }
          }
        }
      }
    }

    const merged = mergeAuthoritativeViewerRowsIntoWorkbookSnapshot(snapshot, sheetId, viewerRows, columns)
    const ws = (
      merged.sheets as Record<string, { cellData?: Record<number, Record<number, { v?: unknown; s?: string }>> }>
    )[sheetId]
    expect(ws?.cellData?.[12]?.[0]?.v).toBe('a')
    expect(ws?.cellData?.[12]?.[0]?.s).toBe('style-bold')
    expect(ws?.cellData?.[12]?.[1]?.v).toBe('synced')
    expect(ws?.cellData?.[12]?.[1]?.s).toBe('style-italic')
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

  it('clears stale snapshot-only values that are absent from authoritative rows', () => {
    const viewerRows: Record<string, unknown>[] = Array.from({ length: 15 }, () => ({}))
    viewerRows[12] = { alpha: 'a' }

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
              0: { v: 'a' }
            },
            13: {
              0: { v: 'stale-extra' }
            }
          }
        }
      }
    }

    expect(workbookSnapshotMismatchesViewerRows(snapshot, sheetId, viewerRows, columns)).toBe(true)

    const merged = mergeAuthoritativeViewerRowsIntoWorkbookSnapshot(snapshot, sheetId, viewerRows, columns)
    const ws = (merged.sheets as Record<string, { cellData?: Record<number, Record<number, { v?: unknown }>> }>)[
      sheetId
    ]

    expect(ws?.cellData?.[13]?.[0]).toBeUndefined()
    expect(workbookSnapshotMismatchesViewerRows(merged, sheetId, viewerRows, columns)).toBe(false)
  })
})
