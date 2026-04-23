import type { SpreadsheetColumn, SpreadsheetSheet } from '../../types/spreadsheet'
import {
  buildMultiSheetWorkbookFromAppSheets,
  isolateWorkbookSnapshotToSingleSheet,
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

const makeSheet = (
  id: string,
  name: string,
  columns: SpreadsheetColumn[],
  data: Record<string, unknown>[]
): SpreadsheetSheet => ({
  id,
  name,
  viewType: 'table',
  columns,
  views: [],
  data,
  settings: {
    allowAdd: true,
    allowEdit: true,
    allowDelete: true,
    allowExport: true,
    allowImport: true,
    rowsPerPage: 50,
    showRowNumbers: true
  }
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
    const ws = (
      merged.sheets as Record<
        string,
        {
          cellData?: Record<number, Record<number, { v?: unknown }>>
          mergeData?: Array<{ startRow: number; startColumn: number; endRow: number; endColumn: number }>
        }
      >
    )[sheetId]
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

describe('buildMultiSheetWorkbookFromAppSheets', () => {
  it('overlays active-sheet bootstrap cellData with authoritative rows', () => {
    const sheet1Columns = [textCol('s1c0', 'alpha', 0)]
    const appSheets = [makeSheet('sheet-1', 'Sheet1', sheet1Columns, [{ alpha: 'row-value' }])]

    const staleSheet1Bootstrap: Record<string, unknown> = {
      id: 'wb-sheet-1',
      name: 'Sheet1',
      sheetOrder: ['sheet-1'],
      sheets: {
        'sheet-1': {
          id: 'sheet-1',
          name: 'Sheet1',
          cellData: {
            0: {
              0: { v: 'stale-bootstrap-value' }
            }
          },
          columnCount: 1
        }
      }
    }

    const workbook = buildMultiSheetWorkbookFromAppSheets({
      appSheets,
      activeSheetId: 'sheet-1',
      getRowsForSheet: sheetId => appSheets.find(sheet => sheet.id === sheetId)?.data ?? [],
      singleWorksheetBootstrap: staleSheet1Bootstrap,
      appId: 'app-1'
    })

    expect(workbook.sheets['sheet-1']?.cellData?.[0]?.[0]?.v).toBe('row-value')
  })

  it('does not reuse another sheet bootstrap when the active sheet changes', () => {
    const sheet1Columns = [textCol('s1c0', 'alpha', 0), textCol('s1c1', 'beta', 1)]
    const sheet2Columns = Array.from({ length: 26 }, (_, index) => textCol(`s2c${index}`, `col${index}`, index))
    const appSheets = [
      makeSheet('sheet-1', 'Sheet1', sheet1Columns, [{ alpha: 'sheet-1', beta: 'only-here' }]),
      makeSheet('sheet-2', 'Sheet2', sheet2Columns, [{ col0: 'sheet-2', col25: 'z-col' }])
    ]

    const staleSheet1Bootstrap: Record<string, unknown> = {
      id: 'wb-sheet-1',
      name: 'Sheet1',
      sheetOrder: ['sheet-1'],
      sheets: {
        'sheet-1': {
          id: 'sheet-1',
          name: 'Sheet1',
          cellData: {
            0: {
              0: { v: 'sheet-1' },
              1: { v: 'only-here' }
            }
          },
          columnCount: 20
        }
      }
    }

    const workbook = buildMultiSheetWorkbookFromAppSheets({
      appSheets,
      activeSheetId: 'sheet-2',
      getRowsForSheet: sheetId => appSheets.find(sheet => sheet.id === sheetId)?.data ?? [],
      singleWorksheetBootstrap: staleSheet1Bootstrap,
      appId: 'app-1'
    })

    expect(workbook.sheets['sheet-2']?.cellData?.[0]?.[0]?.v).toBe('sheet-2')
    expect(workbook.sheets['sheet-2']?.cellData?.[0]?.[25]?.v).toBe('z-col')
    expect(workbook.sheets['sheet-2']?.cellData?.[0]?.[1]).toBeUndefined()
    expect(workbook.sheets['sheet-2']?.columnCount).toBe(26)
  })
})

describe('isolateWorkbookSnapshotToSingleSheet', () => {
  it('drops ghost worksheets from a single-sheet bootstrap snapshot', () => {
    const snapshot: Record<string, unknown> = {
      id: 'wb',
      name: 'Workbook',
      sheetOrder: ['sheet-1', 'sheet-2'],
      sheets: {
        'sheet-1': {
          id: 'sheet-1',
          name: 'Sheet1',
          cellData: {
            0: { 0: { v: '1' } }
          }
        },
        'sheet-2': {
          id: 'sheet-2',
          name: 'Sheet2',
          cellData: {
            0: { 0: { v: '2' } }
          }
        }
      }
    }

    const isolated = isolateWorkbookSnapshotToSingleSheet(snapshot, 'sheet-1', 'Sheet1')

    expect(isolated).not.toBeNull()
    expect(isolated?.sheetOrder).toEqual(['sheet-1'])
    expect(Object.keys((isolated?.sheets as Record<string, unknown>) ?? {})).toEqual(['sheet-1'])
    expect(
      (isolated?.sheets as Record<string, { cellData?: Record<number, Record<number, { v?: string }>> }>)['sheet-1']
        ?.cellData?.[0]?.[0]?.v
    ).toBe('1')
  })
})
