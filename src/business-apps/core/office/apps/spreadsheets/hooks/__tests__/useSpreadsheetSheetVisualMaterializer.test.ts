import type { SpreadsheetColumn, SpreadsheetSheet } from '../../types/spreadsheet'
import {
  chooseStableAppliedSheetVisualCandidate,
  choosePreferredSheetVisualCandidate,
  isWeakSessionVisualCandidate,
  prepareSheetVisualCandidate
} from '../useSpreadsheetSheetVisualMaterializer'

const column = (): SpreadsheetColumn => ({
  id: 'col-a',
  name: 'column_a',
  label: 'Column A',
  type: 'text',
  order: 0,
  isVisible: true,
  isEditable: true,
  isRequired: false,
  isUnique: false
})

const sheet = (): SpreadsheetSheet => ({
  id: 'sheet-1',
  name: 'Sheet 1',
  viewType: 'table',
  columns: [column()],
  views: [],
  data: [],
  version: 3,
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

const rows = [{ _id: 'row-1', _gridRowIndex: 0, column_a: 'server value' }]

const snapshotWithStyle = (cellValue: string, styleId = 'style-1') => ({
  id: 'wb',
  styles: { [styleId]: { bg: { rgb: '#ffff00' } } },
  sheetOrder: ['sheet-1'],
  sheets: {
    'sheet-1': {
      id: 'sheet-1',
      name: 'Sheet 1',
      cellData: {
        0: {
          0: { v: cellValue, s: styleId }
        }
      }
    }
  }
})

const snapshotWithNumericStyleRef = (cellValue: string, styleId = 1) => ({
  id: 'wb',
  styles: { [String(styleId)]: { bg: { rgb: '#ffff00' } } },
  sheetOrder: ['sheet-1'],
  sheets: {
    'sheet-1': {
      id: 'sheet-1',
      name: 'Sheet 1',
      cellData: {
        0: {
          0: { v: cellValue, s: styleId }
        }
      }
    }
  }
})

const snapshotWithOrphanStyles = () => ({
  id: 'wb',
  styles: { orphan: { bg: { rgb: '#ffff00' } } },
  sheetOrder: ['sheet-1'],
  sheets: {
    'sheet-1': {
      id: 'sheet-1',
      name: 'Sheet 1',
      rowData: {
        0: { h: 30 }
      },
      columnData: {
        0: { w: 120 }
      },
      cellData: {}
    }
  }
})

const snapshotWithStructuralVisualState = () => ({
  id: 'wb',
  sheetOrder: ['sheet-1'],
  sheets: {
    'sheet-1': {
      id: 'sheet-1',
      name: 'Sheet 1',
      rowData: {
        0: { h: 30 }
      },
      columnData: {
        0: { w: 120 }
      },
      mergeData: [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 1 }],
      cellData: {}
    }
  }
})

describe('useSpreadsheetSheetVisualMaterializer helpers', () => {
  it('prefers hydration candidates over equally valid cache candidates', () => {
    const canonicalSheet = sheet()
    const cachePrepared = prepareSheetVisualCandidate({
      preferUniverNativeSheetTabs: true,
      candidate: {
        snapshot: snapshotWithStyle('server value'),
        seed: 'cache-candidate',
        source: 'cache',
        version: 3,
        updatedAt: null,
        coversVersions: { 'sheet-1': 3 }
      },
      canonicalSheetMeta: canonicalSheet,
      canonicalRows: rows,
      appId: 'app-1',
      activeSheetId: 'sheet-1',
      appSheets: [canonicalSheet]
    })
    const hydrationPrepared = prepareSheetVisualCandidate({
      preferUniverNativeSheetTabs: true,
      candidate: {
        snapshot: snapshotWithStyle('server value', 'style-2'),
        seed: 'hydration-candidate',
        source: 'remote',
        version: 4,
        updatedAt: null,
        coversVersions: { 'sheet-1': 3 }
      },
      canonicalSheetMeta: canonicalSheet,
      canonicalRows: rows,
      appId: 'app-1',
      activeSheetId: 'sheet-1',
      appSheets: [canonicalSheet],
      formattingSourceOverride: 'hydration'
    })

    const chosen = choosePreferredSheetVisualCandidate(cachePrepared, hydrationPrepared)

    expect(chosen?.formattingSource).toBe('hydration')
    expect(chosen?.result.seed).toBe('hydration-candidate')
  })

  it('classifies numeric style refs as visual-complete formatting signals', () => {
    const canonicalSheet = sheet()
    const numericStylePrepared = prepareSheetVisualCandidate({
      preferUniverNativeSheetTabs: true,
      candidate: {
        snapshot: snapshotWithNumericStyleRef('server value', 1),
        seed: 'numeric-style-ref',
        source: 'remote',
        version: 4,
        updatedAt: null,
        coversVersions: { 'sheet-1': 3 }
      },
      canonicalSheetMeta: canonicalSheet,
      canonicalRows: rows,
      appId: 'app-1',
      activeSheetId: 'sheet-1',
      appSheets: [canonicalSheet]
    })

    expect(numericStylePrepared.validation.formattingScore).toBeGreaterThan(0)
    expect(numericStylePrepared.readiness).toBe('visual_complete')
  })

  it('classifies orphan styles with structural worksheet metadata as visual-partial', () => {
    const canonicalSheet = sheet()
    const orphanPrepared = prepareSheetVisualCandidate({
      preferUniverNativeSheetTabs: true,
      candidate: {
        snapshot: snapshotWithOrphanStyles(),
        seed: 'orphan-hydration',
        source: 'remote',
        version: 4,
        updatedAt: null,
        coversVersions: { 'sheet-1': 3 }
      },
      canonicalSheetMeta: canonicalSheet,
      canonicalRows: rows,
      appId: 'app-1',
      activeSheetId: 'sheet-1',
      appSheets: [canonicalSheet],
      formattingSourceOverride: 'hydration'
    })

    expect(orphanPrepared.readiness).toBe('visual_partial')
    expect(orphanPrepared.validation.formattingScore).toBe(0)
  })

  it('treats row-overlay-only value snapshots as data-only', () => {
    const canonicalSheet = sheet()
    const overlaidPrepared = prepareSheetVisualCandidate({
      preferUniverNativeSheetTabs: true,
      candidate: {
        snapshot: {
          id: 'wb',
          sheetOrder: ['sheet-1'],
          sheets: {
            'sheet-1': {
              id: 'sheet-1',
              name: 'Sheet 1',
              cellData: {
                0: {
                  0: { v: 'stale' }
                }
              }
            }
          }
        },
        seed: 'overlay-only',
        source: 'remote',
        version: 4,
        updatedAt: null,
        coversVersions: { 'sheet-1': 3 }
      },
      canonicalSheetMeta: canonicalSheet,
      canonicalRows: rows,
      appId: 'app-1',
      activeSheetId: 'sheet-1',
      appSheets: [canonicalSheet]
    })

    expect(overlaidPrepared.rowOverlayChanged).toBe(true)
    expect(overlaidPrepared.validation.formattingScore).toBe(0)
    expect(overlaidPrepared.readiness).toBe('data_only')
  })

  it('classifies structural worksheet metadata as visual-partial after row overlay', () => {
    const canonicalSheet = sheet()
    const structuralPrepared = prepareSheetVisualCandidate({
      preferUniverNativeSheetTabs: true,
      candidate: {
        snapshot: snapshotWithStructuralVisualState(),
        seed: 'structural-visual',
        source: 'remote',
        version: 5,
        updatedAt: null,
        coversVersions: { 'sheet-1': 3 }
      },
      canonicalSheetMeta: canonicalSheet,
      canonicalRows: rows,
      appId: 'app-1',
      activeSheetId: 'sheet-1',
      appSheets: [canonicalSheet]
    })

    expect(structuralPrepared.rowOverlayChanged).toBe(true)
    expect(structuralPrepared.validation.formattingScore).toBe(0)
    expect(structuralPrepared.readiness).toBe('visual_partial')
  })

  it('prefers a visual-complete cache candidate over a visual-partial orphan-style hydration candidate', () => {
    const canonicalSheet = sheet()
    const cachePrepared = prepareSheetVisualCandidate({
      preferUniverNativeSheetTabs: true,
      candidate: {
        snapshot: snapshotWithStyle('server value'),
        seed: 'cache-visual-ready',
        source: 'cache',
        version: 3,
        updatedAt: null,
        coversVersions: { 'sheet-1': 3 }
      },
      canonicalSheetMeta: canonicalSheet,
      canonicalRows: rows,
      appId: 'app-1',
      activeSheetId: 'sheet-1',
      appSheets: [canonicalSheet]
    })
    const hydrationPrepared = prepareSheetVisualCandidate({
      preferUniverNativeSheetTabs: true,
      candidate: {
        snapshot: snapshotWithOrphanStyles(),
        seed: 'hydration-data-only',
        source: 'remote',
        version: 8,
        updatedAt: null,
        coversVersions: { 'sheet-1': 3 }
      },
      canonicalSheetMeta: canonicalSheet,
      canonicalRows: rows,
      appId: 'app-1',
      activeSheetId: 'sheet-1',
      appSheets: [canonicalSheet],
      formattingSourceOverride: 'hydration'
    })

    const chosen = choosePreferredSheetVisualCandidate(hydrationPrepared, cachePrepared)

    expect(hydrationPrepared.readiness).toBe('visual_partial')
    expect(cachePrepared.readiness).toBe('visual_complete')
    expect(chosen?.result.seed).toBe('cache-visual-ready')
  })

  it('prefers higher sheet coverage before raw workbook recency', () => {
    const canonicalSheet = sheet()
    const lowerCoverageCandidate = prepareSheetVisualCandidate({
      preferUniverNativeSheetTabs: true,
      candidate: {
        snapshot: snapshotWithStyle('server value'),
        seed: 'lower-coverage',
        source: 'remote',
        version: 9,
        updatedAt: null,
        coversVersions: { 'sheet-1': 3 }
      },
      canonicalSheetMeta: canonicalSheet,
      canonicalRows: rows,
      appId: 'app-1',
      activeSheetId: 'sheet-1',
      appSheets: [canonicalSheet]
    })
    const higherCoverageCandidate = prepareSheetVisualCandidate({
      preferUniverNativeSheetTabs: true,
      candidate: {
        snapshot: snapshotWithStyle('server value', 'style-3'),
        seed: 'higher-coverage',
        source: 'remote',
        version: 8,
        updatedAt: null,
        coversVersions: { 'sheet-1': 5 }
      },
      canonicalSheetMeta: canonicalSheet,
      canonicalRows: rows,
      appId: 'app-1',
      activeSheetId: 'sheet-1',
      appSheets: [canonicalSheet]
    })

    const chosen = choosePreferredSheetVisualCandidate(lowerCoverageCandidate, higherCoverageCandidate)

    expect(lowerCoverageCandidate.validation.safety).toBe('safe')
    expect(higherCoverageCandidate.validation.safety).toBe('safe')
    expect(higherCoverageCandidate.loaderCoverageVersion).toBeGreaterThan(lowerCoverageCandidate.loaderCoverageVersion)
    expect(chosen?.result.seed).toBe('higher-coverage')
  })

  it('preserves the current applied winner when a weaker hydration candidate appears later', () => {
    const canonicalSheet = sheet()
    const currentApplied = prepareSheetVisualCandidate({
      preferUniverNativeSheetTabs: true,
      candidate: {
        snapshot: snapshotWithStyle('server value', 'style-session'),
        seed: 'session-winner',
        source: 'remote',
        version: 9,
        updatedAt: null,
        coversVersions: { 'sheet-1': 3 }
      },
      canonicalSheetMeta: canonicalSheet,
      canonicalRows: rows,
      appId: 'app-1',
      activeSheetId: 'sheet-1',
      appSheets: [canonicalSheet],
      formattingSourceOverride: 'session'
    })
    const weakerHydration = prepareSheetVisualCandidate({
      preferUniverNativeSheetTabs: true,
      candidate: {
        snapshot: snapshotWithStyle('server value', 'style-hydration'),
        seed: 'hydration-weaker',
        source: 'remote',
        version: 10,
        updatedAt: null,
        coversVersions: { 'sheet-1': 3 }
      },
      canonicalSheetMeta: canonicalSheet,
      canonicalRows: rows,
      appId: 'app-1',
      activeSheetId: 'sheet-1',
      appSheets: [canonicalSheet],
      formattingSourceOverride: 'hydration'
    })
    weakerHydration.validation.formattingScore = Math.max(0, currentApplied.validation.formattingScore - 50)

    const chosen = chooseStableAppliedSheetVisualCandidate(currentApplied, weakerHydration)

    expect(chosen?.result.seed).toBe('session-winner')
    expect(chosen?.formattingSource).toBe('session')
  })

  it('allows a stronger incoming candidate to replace the current applied winner', () => {
    const canonicalSheet = sheet()
    const currentApplied = prepareSheetVisualCandidate({
      preferUniverNativeSheetTabs: true,
      candidate: {
        snapshot: snapshotWithStyle('server value', 'style-hydration'),
        seed: 'hydration-winner',
        source: 'remote',
        version: 9,
        updatedAt: null,
        coversVersions: { 'sheet-1': 3 }
      },
      canonicalSheetMeta: canonicalSheet,
      canonicalRows: rows,
      appId: 'app-1',
      activeSheetId: 'sheet-1',
      appSheets: [canonicalSheet],
      formattingSourceOverride: 'hydration'
    })
    const strongerSession = prepareSheetVisualCandidate({
      preferUniverNativeSheetTabs: true,
      candidate: {
        snapshot: snapshotWithStyle('server value', 'style-session'),
        seed: 'session-stronger',
        source: 'remote',
        version: 10,
        updatedAt: null,
        coversVersions: { 'sheet-1': 4 }
      },
      canonicalSheetMeta: canonicalSheet,
      canonicalRows: rows,
      appId: 'app-1',
      activeSheetId: 'sheet-1',
      appSheets: [canonicalSheet],
      formattingSourceOverride: 'session'
    })
    strongerSession.validation.formattingScore = currentApplied.validation.formattingScore + 100

    const chosen = chooseStableAppliedSheetVisualCandidate(currentApplied, strongerSession)

    expect(chosen?.result.seed).toBe('session-stronger')
    expect(chosen?.formattingSource).toBe('session')
  })

  it('flags style-less visual-partial session candidates as weak', () => {
    const canonicalSheet = sheet()
    const weakSession = prepareSheetVisualCandidate({
      preferUniverNativeSheetTabs: true,
      candidate: {
        snapshot: snapshotWithStructuralVisualState(),
        seed: 'session-weak',
        source: 'remote',
        version: 10,
        updatedAt: null,
        coversVersions: { 'sheet-1': 3 }
      },
      canonicalSheetMeta: canonicalSheet,
      canonicalRows: rows,
      appId: 'app-1',
      activeSheetId: 'sheet-1',
      appSheets: [canonicalSheet],
      formattingSourceOverride: 'session'
    })

    expect(weakSession.readiness).toBe('visual_partial')
    expect(weakSession.validation.formattingScore).toBe(0)
    expect(isWeakSessionVisualCandidate(weakSession)).toBe(true)
  })
})
