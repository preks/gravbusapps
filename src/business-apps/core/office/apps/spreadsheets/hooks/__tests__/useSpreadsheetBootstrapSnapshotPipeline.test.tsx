import { renderHook, waitFor } from '@testing-library/react'
import type { SpreadsheetColumn, SpreadsheetSheet } from '../../types/spreadsheet'
import { SpreadsheetApiService } from '../../services/SpreadsheetApiService'
import { useSpreadsheetBootstrapSnapshotPipeline } from '../useSpreadsheetBootstrapSnapshotPipeline'
import * as univerSnapshotCache from '../../utils/univerSnapshotCache'

const fooColumn = (): SpreadsheetColumn => ({
  id: 'c_foo',
  name: 'foo',
  label: 'Foo',
  type: 'text',
  isVisible: true,
  isEditable: true,
  isRequired: false,
  isUnique: false,
  order: 0
})

const minimalSheet = (): SpreadsheetSheet => ({
  id: 'sh1',
  name: 'Sheet 1',
  viewType: 'table',
  columns: [fooColumn()],
  views: [],
  data: [],
  version: 1,
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

const mapSnapshotRowsToViewerRows = (rows: unknown[]): Record<string, unknown>[] => rows as Record<string, unknown>[]

const createStablePipelineDeps = () => ({
  workbookSnapshotVersionRef: { current: 0 },
  workbookSnapshotCoversVersionsRef: { current: {} as Record<string, number> },
  peerSheetDataCacheRef: { current: new Map<string, Record<string, unknown>[]>() },
  authoritativePeerSheetDataCacheRef: { current: new Set<string>() }
})

describe('useSpreadsheetBootstrapSnapshotPipeline', () => {
  beforeEach(() => {
    jest.spyOn(SpreadsheetApiService, 'getUniverSnapshot').mockResolvedValue({
      appId: 'app-1',
      version: 0,
      snapshot: null,
      updatedAt: null,
      coversVersions: {}
    })
    jest.spyOn(univerSnapshotCache, 'readUniverSnapshotCacheForBootstrap').mockReturnValue(null)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('calls onBootstrapWorkbookReconcileIssue with canonical phase when sheet snapshot fails', async () => {
    jest
      .spyOn(SpreadsheetApiService, 'getSheetHydrationSnapshot')
      .mockRejectedValue(new Error('canonical fetch failed'))
    const onBootstrapWorkbookReconcileIssue = jest.fn()
    const spreadsheetSession = {
      updateWorkbookSnapshot: jest.fn(),
      setActiveSheet: jest.fn(),
      replaceSheetState: jest.fn(),
      capturePersistedBaseline: jest.fn()
    }
    const activeSheet = minimalSheet()
    const seedActiveSheetState = jest.fn()
    const debugLog = jest.fn()
    const stableDeps = createStablePipelineDeps()

    renderHook(() =>
      useSpreadsheetBootstrapSnapshotPipeline({
        appId: 'app-1',
        activeSheetId: 'sh1',
        activeSheet,
        entityEnabled: false,
        preferUniverNativeSheetTabs: false,
        spreadsheetSession: spreadsheetSession as any,
        workbookSnapshotVersionRef: stableDeps.workbookSnapshotVersionRef,
        workbookSnapshotCoversVersionsRef: stableDeps.workbookSnapshotCoversVersionsRef,
        peerSheetDataCacheRef: stableDeps.peerSheetDataCacheRef,
        authoritativePeerSheetDataCacheRef: stableDeps.authoritativePeerSheetDataCacheRef,
        seedActiveSheetState,
        mapSnapshotRowsToViewerRows,
        debugLog,
        onBootstrapWorkbookReconcileIssue
      })
    )

    await waitFor(() =>
      expect(onBootstrapWorkbookReconcileIssue).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: 'canonical',
          error: expect.any(Error)
        })
      )
    )
  })

  it('keeps a row-built first mount when hydration has no worksheet snapshot', async () => {
    jest.spyOn(SpreadsheetApiService, 'getSheetHydrationSnapshot').mockResolvedValue({
      sheet: minimalSheet(),
      rows: [{ _id: 'row-1', foo: 'fresh' }],
      operationVersion: 3,
      sheetSnapshotVersion: 0,
      worksheetSnapshot: null,
      workbookDependencies: {},
      workbookSnapshotVersion: 10
    })
    jest.spyOn(univerSnapshotCache, 'readUniverSnapshotCacheForBootstrap').mockReturnValue({
      version: 8,
      savedAt: Date.now(),
      snapshot: {
        sheetOrder: ['sh1'],
        sheets: {
          sh1: {
            id: 'sh1',
            name: 'Sheet 1',
            cellData: {
              0: { 0: { v: 'cache' } }
            }
          }
        }
      },
      coversVersions: { sh1: 8 }
    } as any)
    jest.spyOn(SpreadsheetApiService, 'getUniverSnapshot').mockResolvedValue({
      appId: 'app-1',
      version: 11,
      snapshot: {
        sheetOrder: ['sh1'],
        sheets: {
          sh1: {
            id: 'sh1',
            name: 'Sheet 1',
            cellData: {
              0: { 0: { v: 'remote' } }
            }
          }
        }
      },
      updatedAt: '2025-01-01T00:00:00.000Z',
      coversVersions: { sh1: 11 }
    })
    const spreadsheetSession = {
      updateWorkbookSnapshot: jest.fn()
    }
    const stableDeps = createStablePipelineDeps()
    const seedActiveSheetState = jest.fn()
    const debugLog = jest.fn()

    const { result } = renderHook(() =>
      useSpreadsheetBootstrapSnapshotPipeline({
        appId: 'app-1',
        activeSheetId: 'sh1',
        activeSheet: minimalSheet(),
        entityEnabled: false,
        preferUniverNativeSheetTabs: false,
        spreadsheetSession: spreadsheetSession as any,
        workbookSnapshotVersionRef: stableDeps.workbookSnapshotVersionRef,
        workbookSnapshotCoversVersionsRef: stableDeps.workbookSnapshotCoversVersionsRef,
        peerSheetDataCacheRef: stableDeps.peerSheetDataCacheRef,
        authoritativePeerSheetDataCacheRef: stableDeps.authoritativePeerSheetDataCacheRef,
        seedActiveSheetState,
        mapSnapshotRowsToViewerRows,
        debugLog
      })
    )

    await waitFor(() => expect(result.current.isBootstrapCanonicalReady).toBe(true))
    await waitFor(() => expect(result.current.isBootstrapWorkbookEnriching).toBe(false))

    expect(result.current.bootstrapSnapshot).toBeNull()
    expect(result.current.bootstrapSnapshotSeed).toBe('rows-hydration-v3')
  })

  it('canonicalizes hydration worksheet snapshot values before first mount', async () => {
    jest.spyOn(SpreadsheetApiService, 'getSheetHydrationSnapshot').mockResolvedValue({
      sheet: minimalSheet(),
      rows: [{ _id: 'row-1', foo: 'fresh' }],
      operationVersion: 2,
      sheetSnapshotVersion: 2,
      worksheetSnapshot: {
        id: 'sh1',
        name: 'Sheet 1',
        cellData: {
          0: { 0: { v: 'stale' } }
        }
      },
      workbookDependencies: {},
      workbookSnapshotVersion: 7
    })
    const spreadsheetSession = { updateWorkbookSnapshot: jest.fn() }
    const stableDeps = createStablePipelineDeps()
    const seedActiveSheetState = jest.fn()
    const debugLog = jest.fn()

    const { result } = renderHook(() =>
      useSpreadsheetBootstrapSnapshotPipeline({
        appId: 'app-1',
        activeSheetId: 'sh1',
        activeSheet: minimalSheet(),
        entityEnabled: false,
        preferUniverNativeSheetTabs: false,
        spreadsheetSession: spreadsheetSession as any,
        workbookSnapshotVersionRef: stableDeps.workbookSnapshotVersionRef,
        workbookSnapshotCoversVersionsRef: stableDeps.workbookSnapshotCoversVersionsRef,
        peerSheetDataCacheRef: stableDeps.peerSheetDataCacheRef,
        authoritativePeerSheetDataCacheRef: stableDeps.authoritativePeerSheetDataCacheRef,
        seedActiveSheetState,
        mapSnapshotRowsToViewerRows,
        debugLog
      })
    )

    await waitFor(() => expect(result.current.isBootstrapCanonicalReady).toBe(true))

    expect(result.current.bootstrapSnapshotSeed).toBe('sheet-hydration-v2')
    expect(result.current.bootstrapSnapshot).toEqual(
      expect.objectContaining({
        sheets: {
          sh1: expect.objectContaining({
            cellData: {
              0: { 0: { v: 'fresh' } }
            }
          })
        }
      })
    )
    expect(debugLog).toHaveBeenCalledWith(
      'bootstrap snapshot candidate selected',
      expect.objectContaining({ source: 'remote', visibleDecision: 'mount_now', formattingSource: 'hydration' })
    )
  })

  it('preserves unresolved hydration snapshot values during the first no-degrade mount', async () => {
    jest.spyOn(SpreadsheetApiService, 'getSheetHydrationSnapshot').mockResolvedValue({
      sheet: minimalSheet(),
      rows: [{ _id: 'row-1', foo: 'fresh' }],
      operationVersion: 4,
      sheetSnapshotVersion: 4,
      worksheetSnapshot: {
        id: 'sh1',
        name: 'Sheet 1',
        cellData: {
          0: { 0: { v: 'stale' } },
          13: { 0: { v: 'snapshot-only', s: 'style-only' } }
        }
      },
      workbookDependencies: {
        styles: { 'style-only': { bg: { rgb: '#ffff00' } } }
      },
      workbookSnapshotVersion: 9
    })
    const spreadsheetSession = { updateWorkbookSnapshot: jest.fn() }
    const stableDeps = createStablePipelineDeps()
    const seedActiveSheetState = jest.fn()
    const debugLog = jest.fn()

    const { result } = renderHook(() =>
      useSpreadsheetBootstrapSnapshotPipeline({
        appId: 'app-1',
        activeSheetId: 'sh1',
        activeSheet: minimalSheet(),
        entityEnabled: false,
        preferUniverNativeSheetTabs: false,
        spreadsheetSession: spreadsheetSession as any,
        workbookSnapshotVersionRef: stableDeps.workbookSnapshotVersionRef,
        workbookSnapshotCoversVersionsRef: stableDeps.workbookSnapshotCoversVersionsRef,
        peerSheetDataCacheRef: stableDeps.peerSheetDataCacheRef,
        authoritativePeerSheetDataCacheRef: stableDeps.authoritativePeerSheetDataCacheRef,
        seedActiveSheetState,
        mapSnapshotRowsToViewerRows,
        debugLog
      })
    )

    await waitFor(() => expect(result.current.isBootstrapCanonicalReady).toBe(true))

    expect(result.current.bootstrapSnapshotSeed).toBe('sheet-hydration-v4')
    expect(result.current.bootstrapSnapshot).toEqual(
      expect.objectContaining({
        sheets: {
          sh1: expect.objectContaining({
            cellData: expect.objectContaining({
              0: { 0: { v: 'fresh' } },
              13: { 0: { v: 'snapshot-only', s: 'style-only' } }
            })
          })
        }
      })
    )
  })

  it('uses the richer safe cache donor for first mount without changing seed again during reconcile', async () => {
    jest.spyOn(SpreadsheetApiService, 'getSheetHydrationSnapshot').mockResolvedValue({
      sheet: minimalSheet(),
      rows: [{ _id: 'row-1', foo: 'fresh' }],
      operationVersion: 5,
      sheetSnapshotVersion: 4,
      worksheetSnapshot: {
        id: 'sh1',
        name: 'Sheet 1',
        cellData: {
          0: { 0: { v: 'fresh' } }
        }
      },
      workbookDependencies: {},
      workbookSnapshotVersion: 12
    })
    jest.spyOn(univerSnapshotCache, 'readUniverSnapshotCacheForBootstrap').mockReturnValue({
      version: 20,
      savedAt: Date.now(),
      snapshot: {
        sheetOrder: ['sh1'],
        sheets: {
          sh1: {
            id: 'sh1',
            name: 'Sheet 1',
            cellData: {
              0: { 0: { s: 'style-only' } }
            }
          }
        },
        styles: { 'style-only': { bg: { rgb: '#ffff00' } } }
      },
      coversVersions: { sh1: 20 }
    } as any)
    jest.spyOn(SpreadsheetApiService, 'getUniverSnapshot').mockResolvedValue({
      appId: 'app-1',
      version: 21,
      snapshot: {
        sheetOrder: ['sh1'],
        sheets: {
          sh1: {
            id: 'sh1',
            name: 'Sheet 1',
            cellData: {
              0: { 0: { s: 'style-only' } }
            }
          }
        },
        styles: { 'style-only': { bg: { rgb: '#ffff00' } } }
      },
      updatedAt: '2025-01-01T00:00:00.000Z',
      coversVersions: { sh1: 21 }
    })
    const spreadsheetSession = { updateWorkbookSnapshot: jest.fn() }
    const stableDeps = createStablePipelineDeps()
    const seedActiveSheetState = jest.fn()
    const debugLog = jest.fn()

    const { result } = renderHook(() =>
      useSpreadsheetBootstrapSnapshotPipeline({
        appId: 'app-1',
        activeSheetId: 'sh1',
        activeSheet: minimalSheet(),
        entityEnabled: false,
        preferUniverNativeSheetTabs: false,
        spreadsheetSession: spreadsheetSession as any,
        workbookSnapshotVersionRef: stableDeps.workbookSnapshotVersionRef,
        workbookSnapshotCoversVersionsRef: stableDeps.workbookSnapshotCoversVersionsRef,
        peerSheetDataCacheRef: stableDeps.peerSheetDataCacheRef,
        authoritativePeerSheetDataCacheRef: stableDeps.authoritativePeerSheetDataCacheRef,
        seedActiveSheetState,
        mapSnapshotRowsToViewerRows,
        debugLog
      })
    )

    await waitFor(() => expect(result.current.bootstrapSnapshotSeed).toBe('cache-cov20-blob20'))
    await waitFor(() => expect(result.current.isBootstrapWorkbookEnriching).toBe(false))

    expect(result.current.bootstrapSnapshotSeed).toBe('cache-cov20-blob20')
    expect(result.current.bootstrapSnapshot).toEqual(
      expect.objectContaining({
        sheets: {
          sh1: expect.objectContaining({
            cellData: {
              0: { 0: { v: 'fresh', s: 'style-only' } }
            }
          })
        },
        styles: { 'style-only': { bg: { rgb: '#ffff00' } } }
      })
    )
    expect(spreadsheetSession.updateWorkbookSnapshot).toHaveBeenLastCalledWith(
      expect.objectContaining({
        styles: { 'style-only': { bg: { rgb: '#ffff00' } } }
      }),
      21
    )
  })

  it('schedules a visible style repair when a richer remote candidate arrives after hydration-first mount', async () => {
    jest.spyOn(SpreadsheetApiService, 'getSheetHydrationSnapshot').mockResolvedValue({
      sheet: minimalSheet(),
      rows: [{ _id: 'row-1', foo: 'fresh' }],
      operationVersion: 6,
      sheetSnapshotVersion: 6,
      worksheetSnapshot: {
        id: 'sh1',
        name: 'Sheet 1',
        cellData: {
          0: { 0: { v: 'fresh', s: 'weak-style' } }
        }
      },
      workbookDependencies: {
        styles: { 'weak-style': { bg: { rgb: '#dddddd' } } }
      },
      workbookSnapshotVersion: 14
    })
    jest.spyOn(SpreadsheetApiService, 'getUniverSnapshot').mockResolvedValue({
      appId: 'app-1',
      version: 15,
      snapshot: {
        sheetOrder: ['sh1'],
        sheets: {
          sh1: {
            id: 'sh1',
            name: 'Sheet 1',
            cellData: {
              0: {
                0: { s: 'rich-style-a' },
                1: { s: 'rich-style-b' }
              }
            }
          }
        },
        styles: {
          'rich-style-a': { bg: { rgb: '#ffff00' } },
          'rich-style-b': { bl: 1 }
        }
      },
      updatedAt: '2025-01-01T00:00:00.000Z',
      coversVersions: { sh1: 15 }
    })
    const spreadsheetSession = { updateWorkbookSnapshot: jest.fn() }
    const stableDeps = createStablePipelineDeps()
    const seedActiveSheetState = jest.fn()
    const debugLog = jest.fn()

    const { result } = renderHook(() =>
      useSpreadsheetBootstrapSnapshotPipeline({
        appId: 'app-1',
        activeSheetId: 'sh1',
        activeSheet: minimalSheet(),
        entityEnabled: false,
        preferUniverNativeSheetTabs: false,
        spreadsheetSession: spreadsheetSession as any,
        workbookSnapshotVersionRef: stableDeps.workbookSnapshotVersionRef,
        workbookSnapshotCoversVersionsRef: stableDeps.workbookSnapshotCoversVersionsRef,
        peerSheetDataCacheRef: stableDeps.peerSheetDataCacheRef,
        authoritativePeerSheetDataCacheRef: stableDeps.authoritativePeerSheetDataCacheRef,
        seedActiveSheetState,
        mapSnapshotRowsToViewerRows,
        debugLog
      })
    )

    await waitFor(() => expect(result.current.isBootstrapWorkbookEnriching).toBe(false))

    expect(result.current.bootstrapSnapshotSeed).toBe('sheet-hydration-v6')
    expect(result.current.pendingBootstrapStyleRepair).toEqual(
      expect.objectContaining({
        sheetId: 'sh1',
        formattingSource: 'remote',
        formattingScore: expect.any(Number)
      })
    )
    expect(result.current.visualBootstrapState).toEqual(
      expect.objectContaining({
        mountKind: 'hydration_snapshot',
        valueSource: 'hydration',
        formattingSource: 'remote',
        visibleDecision: 'visible_style_repair',
        needsVisibleStyleRepair: true
      })
    )
    expect(debugLog).toHaveBeenCalledWith(
      'bootstrap snapshot candidate selected',
      expect.objectContaining({ source: 'remote', visibleDecision: 'visible_style_repair' })
    )
  })
})
