import type { SpreadsheetColumn, SpreadsheetSheet } from '../../types/spreadsheet'
import {
  buildWorkbookSnapshot,
  buildMultiSheetWorkbookFromAppSheets,
  createUniverConversionContext,
  isolateWorkbookSnapshotToSingleSheet,
  mergeAuthoritativeViewerRowsIntoWorkbookSnapshot,
  mergeWorkbookFormattingFromDonor,
  normalizeWorkbookSnapshotToAppSheets,
  stripWorkbookSnapshotValuesPreservingFormatting,
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

const numberCol = (id: string, name: string, order: number): SpreadsheetColumn => ({
  ...textCol(id, name, order),
  type: 'number'
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

  it('counts workbook styles only when the active sheet references them', () => {
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
    expect(workbookFormattingRichnessScore(snap, sheetId)).toBe(1)
  })

  it('counts workbook styles when worksheet cells reference numeric style ids', () => {
    const snap: Record<string, unknown> = {
      id: 'wb',
      styles: { '1': { bl: 1 }, '2': { it: 1 } },
      sheetOrder: [sheetId],
      sheets: {
        [sheetId]: {
          id: sheetId,
          cellData: {
            0: { 0: { v: 'x', s: 1 }, 1: { v: 'y' } }
          }
        }
      }
    }
    expect(workbookFormattingRichnessScore(snap, sheetId)).toBe(1)
  })

  it('counts inline cell formatting even without workbook style ids', () => {
    const snap: Record<string, unknown> = {
      id: 'wb',
      sheetOrder: [sheetId],
      sheets: {
        [sheetId]: {
          id: sheetId,
          cellData: {
            0: {
              0: { v: 'x', bg: { rgb: '#ffff00' } },
              1: { v: 'y', bl: 1 }
            }
          }
        }
      }
    }
    expect(workbookFormattingRichnessScore(snap, sheetId)).toBe(2)
  })

  it('ignores unreferenced workbook styles when the worksheet has no styled cells', () => {
    const snap: Record<string, unknown> = {
      id: 'wb',
      styles: { st1: { bl: 1 }, st2: { it: 1 } },
      sheetOrder: [sheetId],
      sheets: {
        [sheetId]: {
          id: sheetId,
          cellData: {}
        }
      }
    }

    expect(workbookFormattingRichnessScore(snap, sheetId)).toBe(0)
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

  it('upgrades partially formatted hydration cells with richer donor formatting', () => {
    const into: Record<string, unknown> = {
      id: 'wb',
      sheetOrder: [sheetId],
      sheets: {
        [sheetId]: {
          id: sheetId,
          cellData: {
            0: { 0: { v: 'hello', s: { bg: { rgb: '#ffff00' } } } }
          }
        }
      }
    }
    const donor: Record<string, unknown> = {
      id: 'wb2',
      styles: { richStyle: { bg: { rgb: '#ffff00' }, bl: 1 } },
      sheetOrder: [sheetId],
      sheets: {
        [sheetId]: {
          id: sheetId,
          cellData: {
            0: { 0: { v: 'old', s: 'richStyle' } }
          }
        }
      }
    }

    const merged = mergeWorkbookFormattingFromDonor(into, donor, sheetId)
    const cell = (
      merged.sheets as Record<string, { cellData: Record<number, Record<number, { v?: string; s?: unknown }>> }>
    )[sheetId].cellData[0][0]

    expect(cell.v).toBe('hello')
    expect(cell.s).toBe('richStyle')
  })
})

describe('stripWorkbookSnapshotValuesPreservingFormatting', () => {
  it('removes stale cell values while preserving styles, dimensions, and merges', () => {
    const snapshot: Record<string, unknown> = {
      id: 'wb',
      styles: { styleRed: { bg: { rgb: '#ff0000' } } },
      sheetOrder: ['sheet-1'],
      sheets: {
        'sheet-1': {
          id: 'sheet-1',
          name: 'Sheet1',
          cellData: {
            0: {
              0: {
                v: 'stale',
                f: '=A1',
                m: 'stale',
                p: { body: 'stale' },
                ct: { fa: '@' },
                si: 'stale',
                custom: { value: 'stale' },
                s: 'styleRed'
              },
              1: { v: 'delete-me' }
            }
          },
          mergeData: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 1 }],
          rowData: { 0: { h: 32, hd: 1 } },
          columnData: { 0: { w: 120, hd: 1 } }
        }
      }
    }

    const stripped = stripWorkbookSnapshotValuesPreservingFormatting(snapshot)
    const ws = (
      stripped.sheets as Record<
        string,
        { cellData?: Record<number, Record<number, Record<string, unknown>>>; mergeData?: unknown[]; rowData?: unknown }
      >
    )['sheet-1']

    expect(stripped.styles).toEqual({ styleRed: { bg: { rgb: '#ff0000' } } })
    expect(ws.mergeData).toEqual([{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 1 }])
    expect(ws.rowData).toEqual({ 0: { h: 32, hd: 1 } })
    expect((ws as { columnData?: unknown }).columnData).toEqual({ 0: { w: 120, hd: 1 } })
    expect(ws.cellData?.[0]?.[0]).toEqual({ s: 'styleRed' })
    expect(ws.cellData?.[0]?.[1]).toBeUndefined()
  })
})

describe('univerAdapter snapshot row overlay', () => {
  const sheetId = 'sheet-1'
  const columns: SpreadsheetColumn[] = [textCol('c0', 'alpha', 0), textCol('c1', 'beta', 1)]
  const numericColumns: SpreadsheetColumn[] = [numberCol('c0', 'amount', 0)]

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

  it('buildWorkbookSnapshot keeps merged values on the anchor and drops non-finite values', () => {
    const sheet = makeSheet(sheetId, 'Sheet 1', columns, [
      { alpha: 'anchor', beta: 'covered' },
      { alpha: Number.NaN, beta: 'also-covered' }
    ])
    sheet.settings.mergeData = [{ startRow: 0, endRow: 1, startColumn: 0, endColumn: 1 }]

    const snapshot = buildWorkbookSnapshot(sheet, sheet.data, columns)
    const ws = snapshot.sheets[sheetId]

    expect(ws.cellData[0]?.[0]).toEqual({ v: 'anchor' })
    expect(ws.cellData[0]?.[1]).toBeUndefined()
    expect(ws.cellData[1]).toBeUndefined()
  })

  it('buildWorkbookSnapshot coerces numeric-column strings into numeric cell values', () => {
    const sheet = makeSheet(sheetId, 'Sheet 1', numericColumns, [{ amount: '42' }])

    const snapshot = buildWorkbookSnapshot(sheet, sheet.data, numericColumns)

    expect(snapshot.sheets[sheetId]?.cellData?.[0]?.[0]).toEqual({ v: 42 })
  })

  it('buildWorkbookSnapshot maps sheet tab hidden state into Univer worksheet metadata', () => {
    const sheet = { ...makeSheet(sheetId, 'Sheet 1', columns, []), hidden: true }

    const snapshot = buildWorkbookSnapshot(sheet, sheet.data, columns)

    expect(snapshot.sheets[sheetId]?.hidden).toBe(1)
  })

  it('mergeAuthoritativeViewerRowsIntoWorkbookSnapshot does not rehydrate values into merge-covered cells', () => {
    const viewerRows: Record<string, unknown>[] = [{ alpha: 'anchor', beta: 'covered' }]
    const snapshot: Record<string, unknown> = {
      id: 'wb',
      name: 'W',
      sheetOrder: [sheetId],
      sheets: {
        [sheetId]: {
          id: sheetId,
          name: 'S',
          mergeData: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 1 }],
          cellData: {
            0: {
              1: { v: 'stale-covered', s: 'covered-style' }
            }
          }
        }
      }
    }

    const merged = mergeAuthoritativeViewerRowsIntoWorkbookSnapshot(snapshot, sheetId, viewerRows, columns)
    const ws = (
      merged.sheets as Record<string, { cellData?: Record<number, Record<number, { v?: unknown; s?: string }>> }>
    )[sheetId]

    expect(ws.cellData?.[0]?.[0]).toEqual({ v: 'anchor' })
    expect(ws.cellData?.[0]?.[1]).toEqual({ s: 'covered-style' })
  })

  it('mergeAuthoritativeViewerRowsIntoWorkbookSnapshot materializes target worksheet when id missing (does not borrow another tab)', () => {
    const targetId = 'canonical-sheet-id'
    const ghostId = 'ghost-id'
    const viewerRows: Record<string, unknown>[] = [{ alpha: 'x', beta: '' }]
    const snapshot: Record<string, unknown> = {
      id: 'wb',
      sheetOrder: [ghostId],
      sheets: {
        [ghostId]: {
          id: ghostId,
          name: 'Ghost',
          cellData: {
            0: { 0: { v: 'wrong-tab' } }
          }
        }
      }
    }

    const merged = mergeAuthoritativeViewerRowsIntoWorkbookSnapshot(snapshot, targetId, viewerRows, columns)
    const targetWs = (merged.sheets as Record<string, { cellData?: Record<number, Record<number, { v?: unknown }>> }>)[
      targetId
    ]
    expect(targetWs?.cellData?.[0]?.[0]?.v).toBe('x')
    const ghostWs = (merged.sheets as Record<string, { cellData?: Record<number, unknown> }>)[ghostId]
    expect(ghostWs?.cellData?.[0]?.[0]?.v).toBe('wrong-tab')
  })

  it('mergeAuthoritativeViewerRowsIntoWorkbookSnapshot drops stale calculated v when authoritative cell is formula-only', () => {
    const viewerRows: Record<string, unknown>[] = Array.from({ length: 5 }, () => ({}))
    viewerRows[3] = { alpha: { f: '=SUM(A10:A26)' } }

    const snapshot: Record<string, unknown> = {
      id: 'wb',
      name: 'W',
      sheetOrder: [sheetId],
      sheets: {
        [sheetId]: {
          id: sheetId,
          name: 'S',
          cellData: {
            3: {
              0: { f: '=SUM(A10:A26)', v: 24 }
            }
          }
        }
      }
    }

    const merged = mergeAuthoritativeViewerRowsIntoWorkbookSnapshot(snapshot, sheetId, viewerRows, columns)
    const cell = (
      merged.sheets as Record<string, { cellData?: Record<number, Record<number, { f?: string; v?: unknown }>> }>
    )[sheetId]?.cellData?.[3]?.[0]
    expect(cell?.f).toBe('=SUM(A10:A26)')
    expect(cell?.v).toBeUndefined()
  })

  it('mergeAuthoritativeViewerRowsIntoWorkbookSnapshot strips cached v from authoritative formula objects', () => {
    const viewerRows: Record<string, unknown>[] = Array.from({ length: 5 }, () => ({}))
    viewerRows[3] = { alpha: { f: '=SUM(A10:A26)', v: 24, m: '24' } }

    const snapshot: Record<string, unknown> = {
      id: 'wb',
      name: 'W',
      sheetOrder: [sheetId],
      sheets: {
        [sheetId]: {
          id: sheetId,
          name: 'S',
          cellData: {
            3: {
              0: { f: '=SUM(A10:A26)', v: 24 }
            }
          }
        }
      }
    }

    const merged = mergeAuthoritativeViewerRowsIntoWorkbookSnapshot(snapshot, sheetId, viewerRows, columns)
    const cell = (
      merged.sheets as Record<string, { cellData?: Record<number, Record<number, { f?: string; v?: unknown }>> }>
    )[sheetId]?.cellData?.[3]?.[0]
    expect(cell?.f).toBe('=SUM(A10:A26)')
    expect(cell?.v).toBeUndefined()
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

  it('mergeAuthoritativeViewerRowsIntoWorkbookSnapshot keeps style refs but drops stale text metadata for numeric cells', () => {
    const viewerRows: Record<string, unknown>[] = [{ amount: '42' }]
    const snapshot: Record<string, unknown> = {
      id: 'wb',
      name: 'W',
      sheetOrder: [sheetId],
      sheets: {
        [sheetId]: {
          id: sheetId,
          name: 'S',
          cellData: {
            0: {
              0: { v: 'old', s: 'style-num', ct: { fa: '@' }, t: 1 }
            }
          }
        }
      }
    }

    const merged = mergeAuthoritativeViewerRowsIntoWorkbookSnapshot(snapshot, sheetId, viewerRows, numericColumns)
    const cell = (
      merged.sheets as Record<
        string,
        { cellData?: Record<number, Record<number, { v?: unknown; s?: string; ct?: unknown; t?: unknown }>> }
      >
    )[sheetId]?.cellData?.[0]?.[0]

    expect(cell).toEqual({ v: 42, s: 'style-num' })
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

  it('preserves unresolved snapshot-only values when bootstrap requests no-degrade overlay semantics', () => {
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
              0: { v: 'snapshot-only', s: 'carry-style' }
            }
          }
        }
      }
    }

    const merged = mergeAuthoritativeViewerRowsIntoWorkbookSnapshot(snapshot, sheetId, viewerRows, columns, {
      preserveUnresolvedSnapshotValues: true
    })
    const ws = (
      merged.sheets as Record<string, { cellData?: Record<number, Record<number, { v?: unknown; s?: string }>> }>
    )[sheetId]

    expect(ws?.cellData?.[13]?.[0]).toEqual({ v: 'snapshot-only', s: 'carry-style' })
  })

  it('synchronizes worksheet bounds with authoritative columns without collapsing the row canvas', () => {
    const structuralColumns = [textCol('alpha', 'alpha', 0), textCol('beta', 'beta', 1), textCol('gamma', 'gamma', 2)]
    const viewerRows: Record<string, unknown>[] = [{ alpha: 'a', beta: 'b' }]

    const snapshot: Record<string, unknown> = {
      id: 'wb',
      name: 'W',
      sheetOrder: [sheetId],
      sheets: {
        [sheetId]: {
          id: sheetId,
          name: 'S',
          columnCount: 2,
          rowCount: 99,
          cellData: {
            0: {
              0: { v: 'a' },
              1: { v: 'b' },
              3: { v: 'stale-removed-column' }
            }
          }
        }
      }
    }

    const merged = mergeAuthoritativeViewerRowsIntoWorkbookSnapshot(snapshot, sheetId, viewerRows, structuralColumns)
    const ws = (
      merged.sheets as Record<
        string,
        { columnCount?: number; rowCount?: number; cellData?: Record<number, Record<number, { v?: unknown }>> }
      >
    )[sheetId]

    expect(ws?.columnCount).toBe(3)
    expect(ws?.rowCount).toBe(1000)
    expect(ws?.cellData?.[0]?.[3]).toBeUndefined()
  })

  it('clears stale values without dropping formatting-only cell data', () => {
    const viewerRows: Record<string, unknown>[] = [{ alpha: 'a' }]

    const snapshot: Record<string, unknown> = {
      id: 'wb',
      name: 'W',
      sheetOrder: [sheetId],
      sheets: {
        [sheetId]: {
          id: sheetId,
          name: 'S',
          cellData: {
            0: {
              0: { v: 'a' },
              1: { v: 'stale', s: 'border-style', bd: { t: { s: 1 } } }
            }
          }
        }
      }
    }

    const merged = mergeAuthoritativeViewerRowsIntoWorkbookSnapshot(snapshot, sheetId, viewerRows, columns)
    const ws = (
      merged.sheets as Record<
        string,
        { cellData?: Record<number, Record<number, { v?: unknown; s?: string; bd?: unknown }>> }
      >
    )[sheetId]

    expect(ws?.cellData?.[0]?.[1]?.v).toBeUndefined()
    expect(ws?.cellData?.[0]?.[1]?.s).toBe('border-style')
    expect(ws?.cellData?.[0]?.[1]?.bd).toEqual({ t: { s: 1 } })
  })
})

describe('buildMultiSheetWorkbookFromAppSheets', () => {
  it('uses the frontend sheet hidden flag over stale bootstrap worksheet metadata', () => {
    const sheet1Columns = [textCol('s1c0', 'alpha', 0)]
    const appSheets = [{ ...makeSheet('sheet-1', 'Sheet1', sheet1Columns, [{ alpha: 'row-value' }]), hidden: false }]

    const staleHiddenBootstrap: Record<string, unknown> = {
      id: 'wb-sheet-1',
      name: 'Sheet1',
      sheetOrder: ['sheet-1'],
      sheets: {
        'sheet-1': {
          id: 'sheet-1',
          name: 'Sheet1',
          hidden: 1,
          cellData: {
            0: {
              0: { v: 'stale-bootstrap-value' }
            }
          }
        }
      }
    }

    const workbook = buildMultiSheetWorkbookFromAppSheets({
      appSheets,
      activeSheetId: 'sheet-1',
      getRowsForSheet: sheetId => appSheets.find(sheet => sheet.id === sheetId)?.data ?? [],
      singleWorksheetBootstrap: staleHiddenBootstrap,
      appId: 'app-1'
    })

    expect(workbook.sheets['sheet-1']?.hidden).toBe(0)
  })

  it('preserves saved bootstrap worksheet hidden metadata when sheet metadata has no explicit hidden flag', () => {
    const sheet1Columns = [textCol('s1c0', 'alpha', 0)]
    const appSheets = [makeSheet('sheet-1', 'Sheet1', sheet1Columns, [{ alpha: 'row-value' }])]

    const hiddenBootstrap: Record<string, unknown> = {
      id: 'wb-sheet-1',
      name: 'Sheet1',
      sheetOrder: ['sheet-1'],
      sheets: {
        'sheet-1': {
          id: 'sheet-1',
          name: 'Sheet1',
          hidden: 1,
          cellData: {
            0: {
              0: { v: 'stale-bootstrap-value' }
            }
          }
        }
      }
    }

    const workbook = buildMultiSheetWorkbookFromAppSheets({
      appSheets,
      activeSheetId: 'sheet-1',
      getRowsForSheet: sheetId => appSheets.find(sheet => sheet.id === sheetId)?.data ?? [],
      singleWorksheetBootstrap: hiddenBootstrap,
      appId: 'app-1'
    })

    expect(workbook.sheets['sheet-1']?.hidden).toBe(1)
  })

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

  it('does not let richer bootstrap worksheet values override canonical rows', () => {
    const sheet1Columns = [textCol('s1c0', 'alpha', 0), textCol('s1c1', 'beta', 1)]
    const appSheets = [makeSheet('sheet-1', 'Sheet1', sheet1Columns, [{ alpha: 'row-value' }])]

    const richerBootstrap: Record<string, unknown> = {
      id: 'wb-sheet-1',
      name: 'Sheet1',
      sheetOrder: ['sheet-1'],
      sheets: {
        'sheet-1': {
          id: 'sheet-1',
          name: 'Sheet1',
          cellData: {
            0: {
              0: { v: 'row-value' },
              1: { v: 'snapshot-only', s: 'border-style' }
            },
            4: {
              0: { v: 'drag-filled' }
            }
          },
          columnCount: 2
        }
      }
    }

    const workbook = buildMultiSheetWorkbookFromAppSheets({
      appSheets,
      activeSheetId: 'sheet-1',
      getRowsForSheet: sheetId => appSheets.find(sheet => sheet.id === sheetId)?.data ?? [],
      singleWorksheetBootstrap: richerBootstrap,
      appId: 'app-1'
    })

    expect(workbook.sheets['sheet-1']?.cellData?.[0]?.[0]?.v).toBe('row-value')
    expect(workbook.sheets['sheet-1']?.cellData?.[0]?.[1]?.v).toBe('snapshot-only')
    expect(workbook.sheets['sheet-1']?.cellData?.[0]?.[1]?.s).toBe('border-style')
    expect(workbook.sheets['sheet-1']?.cellData?.[4]?.[0]?.v).toBe('drag-filled')
  })

  it('preserves snapshot-only hydration cells and inline styling in native workbook bootstrap', () => {
    const sheet1Columns = [textCol('s1c0', 'alpha', 0), textCol('s1c1', 'beta', 1)]
    const appSheets = [makeSheet('sheet-1', 'Sheet1', sheet1Columns, [{ alpha: 'row-value' }])]

    const hydrationBootstrap: Record<string, unknown> = {
      id: 'wb-sheet-1',
      sheetOrder: ['sheet-1'],
      sheets: {
        'sheet-1': {
          id: 'sheet-1',
          name: 'Sheet1',
          cellData: {
            0: {
              0: { v: 'row-value', bg: { rgb: '#ffee58' } },
              1: { v: 'snapshot-only', bg: { rgb: '#c8e6c9' } }
            }
          },
          columnCount: 2
        }
      }
    }

    const workbook = buildMultiSheetWorkbookFromAppSheets({
      appSheets,
      activeSheetId: 'sheet-1',
      getRowsForSheet: sheetId => appSheets.find(sheet => sheet.id === sheetId)?.data ?? [],
      singleWorksheetBootstrap: hydrationBootstrap,
      appId: 'app-1'
    })

    expect(workbook.sheets['sheet-1']?.cellData?.[0]?.[0]).toEqual({ v: 'row-value', bg: { rgb: '#ffee58' } })
    expect(workbook.sheets['sheet-1']?.cellData?.[0]?.[1]).toEqual({ v: 'snapshot-only', bg: { rgb: '#c8e6c9' } })
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

  it('rehydrates formatting from a stale internal worksheet id without trusting its values', () => {
    const sheet1Columns = [textCol('s1c0', 'alpha', 0)]
    const sheet2Columns = [textCol('s2c0', 'beta', 0)]
    const appSheets = [
      makeSheet('sheet-1', 'Sheet1', sheet1Columns, [{ alpha: 'sheet-1-row' }]),
      makeSheet('sheet-2', 'Sheet2', sheet2Columns, [])
    ]

    const snapshotWithOrphanSheet2Id: Record<string, unknown> = {
      id: 'wb-sheet-1',
      name: 'Sheet1',
      sheetOrder: ['sheet-1', 'orphan-sheet-2'],
      sheets: {
        'sheet-1': {
          id: 'sheet-1',
          name: 'Sheet1',
          cellData: { 0: { 0: { v: 'sheet-1-row' } } },
          columnCount: 1
        },
        'orphan-sheet-2': {
          id: 'orphan-sheet-2',
          name: 'Sheet2',
          cellData: { 0: { 0: { v: 'sheet-2-from-snapshot' } } },
          columnCount: 1
        }
      }
    }

    const workbook = buildMultiSheetWorkbookFromAppSheets({
      appSheets,
      activeSheetId: 'sheet-2',
      getRowsForSheet: sheetId => appSheets.find(sheet => sheet.id === sheetId)?.data ?? [],
      singleWorksheetBootstrap: snapshotWithOrphanSheet2Id,
      appId: 'app-1'
    })

    expect(workbook.sheetOrder).toEqual(['sheet-1', 'sheet-2'])
    expect(workbook.sheets['sheet-2']?.id).toBe('sheet-2')
    expect(workbook.sheets['sheet-2']?.name).toBe('Sheet2')
    expect(workbook.sheets['sheet-2']?.cellData?.[0]?.[0]?.v).toBe('sheet-2-from-snapshot')
  })

  it('uses inactive sheet canonical rows over stale cached workbook values', () => {
    const sheet1Columns = [textCol('s1c0', 'alpha', 0)]
    const sheet2Columns = [textCol('s2c0', 'beta', 0)]
    const appSheets = [
      makeSheet('sheet-1', 'Sheet1', sheet1Columns, [{ alpha: 'active-row' }]),
      makeSheet('sheet-2', 'Sheet2', sheet2Columns, [{ beta: 'canonical-inactive-row' }])
    ]

    const staleFullWorkbook: Record<string, unknown> = {
      id: 'wb-app',
      styles: { yellow: { bg: { rgb: '#ffff00' } } },
      sheetOrder: ['sheet-1', 'sheet-2'],
      sheets: {
        'sheet-1': {
          id: 'sheet-1',
          name: 'Sheet1',
          cellData: { 0: { 0: { v: 'active-row' } } }
        },
        'sheet-2': {
          id: 'sheet-2',
          name: 'Sheet2',
          cellData: { 0: { 0: { v: 'stale-cache-value', s: 'yellow' } } }
        }
      }
    }

    const workbook = buildMultiSheetWorkbookFromAppSheets({
      appSheets,
      activeSheetId: 'sheet-1',
      getRowsForSheet: sheetId => appSheets.find(sheet => sheet.id === sheetId)?.data ?? [],
      singleWorksheetBootstrap: staleFullWorkbook,
      appId: 'app-1'
    })

    expect(workbook.sheets['sheet-2']?.cellData?.[0]?.[0]?.v).toBe('canonical-inactive-row')
    expect(workbook.sheets['sheet-2']?.cellData?.[0]?.[0]?.s).toBe('yellow')
  })

  it('preserves sparse visual row indices from viewer rows', () => {
    const sheet1Columns = [textCol('s1c0', 'alpha', 0), textCol('s1c1', 'beta', 1)]
    const appSheets = [
      makeSheet('sheet-1', 'Sheet1', sheet1Columns, [
        { _gridRowIndex: 1, alpha: 'd', beta: 'e' } as Record<string, unknown>
      ])
    ]

    const workbook = buildMultiSheetWorkbookFromAppSheets({
      appSheets,
      activeSheetId: 'sheet-1',
      getRowsForSheet: sheetId => appSheets.find(sheet => sheet.id === sheetId)?.data ?? [],
      singleWorksheetBootstrap: null,
      appId: 'app-1'
    })

    expect(workbook.sheets['sheet-1']?.cellData?.[0]).toBeUndefined()
    expect(workbook.sheets['sheet-1']?.cellData?.[1]?.[0]?.v).toBe('d')
    expect(workbook.sheets['sheet-1']?.cellData?.[1]?.[1]?.v).toBe('e')
  })

  it('maps row ids by sparse visual row indices for subsequent mutations', () => {
    const sheet1Columns = [textCol('s1c0', 'alpha', 0)]
    const ctx = createUniverConversionContext(sheet1Columns, [
      { _id: 'row-0', alpha: 'top' },
      { _id: 'client-row-3', _gridRowIndex: 3, alpha: 'sparse' }
    ])

    expect(ctx.rowIndexToId.get(0)).toBe('row-0')
    expect(ctx.rowIndexToId.get(3)).toBe('client-row-3')
    expect(ctx.rowIdToIndex.get('client-row-3')).toBe(3)
    expect(ctx.rowIndexToId.get(1)).toBeUndefined()
  })
})

describe('normalizeWorkbookSnapshotToAppSheets', () => {
  it('rewrites orphan worksheet ids onto the canonical app sheet ids', () => {
    const appSheets = [
      makeSheet('sheet-1', 'Sheet1', [textCol('s1c0', 'alpha', 0)], []),
      makeSheet('sheet-2', 'Sheet2', [textCol('s2c0', 'beta', 0)], [])
    ]

    const snapshot: Record<string, unknown> = {
      id: 'wb',
      name: 'Sheet1',
      sheetOrder: ['sheet-1', 'orphan-sheet-2'],
      sheets: {
        'sheet-1': { id: 'sheet-1', name: 'Sheet1', cellData: {} },
        'orphan-sheet-2': {
          id: 'orphan-sheet-2',
          name: 'Sheet2',
          cellData: { 0: { 0: { v: 'preserved' } } }
        }
      }
    }

    const normalized = normalizeWorkbookSnapshotToAppSheets(snapshot, appSheets)
    const normalizedSheets = normalized.sheets as Record<
      string,
      { id?: string; name?: string; cellData?: Record<number, Record<number, { v?: string }>> }
    >

    expect(normalized.sheetOrder).toEqual(['sheet-1', 'sheet-2'])
    expect(Object.keys(normalizedSheets)).toEqual(['sheet-1', 'sheet-2'])
    expect(normalizedSheets['sheet-2']?.id).toBe('sheet-2')
    expect(normalizedSheets['sheet-2']?.name).toBe('Sheet2')
    expect(normalizedSheets['sheet-2']?.cellData?.[0]?.[0]?.v).toBe('preserved')
  })

  it('does not map an unmatched single worksheet onto the first app sheet by index', () => {
    const appSheets = [
      makeSheet('sheet-1', 'Sheet1', [textCol('s1c0', 'alpha', 0)], []),
      makeSheet('sheet-2', 'Sheet2', [textCol('s2c0', 'beta', 0)], [])
    ]

    const snapshot: Record<string, unknown> = {
      id: 'wb',
      name: 'Workbook',
      sheetOrder: ['sheet-2'],
      sheets: {
        'sheet-2': {
          id: 'sheet-2',
          name: 'Sheet2',
          cellData: { 0: { 0: { v: 'sheet-2-only' } } }
        }
      }
    }

    const normalized = normalizeWorkbookSnapshotToAppSheets(snapshot, appSheets)
    const normalizedSheets = normalized.sheets as Record<
      string,
      { id?: string; name?: string; cellData?: Record<number, Record<number, { v?: string }>> }
    >

    expect(normalized.sheetOrder).toEqual(['sheet-2'])
    expect(normalizedSheets['sheet-1']).toBeUndefined()
    expect(normalizedSheets['sheet-2']?.cellData?.[0]?.[0]?.v).toBe('sheet-2-only')
  })

  it('preserves workbook styles while remapping a temporary worksheet id', () => {
    const appSheets = [
      makeSheet('sheet-1', 'Sheet1', [textCol('s1c0', 'alpha', 0)], []),
      makeSheet('sheet-2', 'Sheet2', [textCol('s2c0', 'beta', 0)], []),
      makeSheet('sheet-3', 'Sheet3', [textCol('s3c0', 'gamma', 0)], []),
      makeSheet('sheet-4', 'Sheet4', [textCol('s4c0', 'delta', 0)], [])
    ]

    const snapshot: Record<string, unknown> = {
      id: 'wb',
      name: 'Workbook',
      styles: {
        st1: { bg: { rgb: '#ff0000' } }
      },
      sheetOrder: ['sheet-1', 'sheet-2', 'sheet-3', 'temp-sheet-4'],
      sheets: {
        'sheet-1': {
          id: 'sheet-1',
          name: 'Sheet1',
          cellData: { 0: { 0: { v: 'formatted', s: 'st1' } } }
        },
        'sheet-2': { id: 'sheet-2', name: 'Sheet2', cellData: {} },
        'sheet-3': { id: 'sheet-3', name: 'Sheet3', cellData: {} },
        'temp-sheet-4': {
          id: 'temp-sheet-4',
          name: 'Sheet4',
          cellData: { 0: { 0: { v: 'new-sheet' } } }
        }
      }
    }

    const normalized = normalizeWorkbookSnapshotToAppSheets(snapshot, appSheets)
    const normalizedSheets = normalized.sheets as Record<
      string,
      { id?: string; name?: string; cellData?: Record<number, Record<number, { v?: string; s?: string }>> }
    >

    expect(normalized.sheetOrder).toEqual(['sheet-1', 'sheet-2', 'sheet-3', 'sheet-4'])
    expect((normalized.styles as Record<string, unknown>)?.st1).toEqual({ bg: { rgb: '#ff0000' } })
    expect(normalizedSheets['sheet-1']?.cellData?.[0]?.[0]?.s).toBe('st1')
    expect(normalizedSheets['sheet-4']?.id).toBe('sheet-4')
    expect(normalizedSheets['sheet-4']?.cellData?.[0]?.[0]?.v).toBe('new-sheet')
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
