import type { SpreadsheetColumn, SpreadsheetSheet } from '../../types/spreadsheet'
import { SpreadsheetApiService } from '../../services/SpreadsheetApiService'
import * as univerAdapter from '../univerAdapter'
import * as univerSnapshotCache from '../univerSnapshotCache'
import {
  chooseBootstrapWorkbookCandidate,
  compareSnapshotCandidatesByRecency,
  computeBootstrapSnapshotMergeOutcome,
  enrichBootstrapSnapshotFromOlderCacheFormatting,
  fetchBootstrapSnapshotRemoteComparedToBaseline,
  getBootstrapSnapshotCoverageVersion,
  selectBootstrapWorksheetSnapshotForPipeline,
  validateActiveSheetBootstrapSnapshot
} from '../spreadsheetBootstrapSnapshotHelpers'

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

describe('getBootstrapSnapshotCoverageVersion', () => {
  it('reads the requested sheet coverage watermark from the loader result', () => {
    expect(getBootstrapSnapshotCoverageVersion({ coversVersions: { sh1: 100, sh2: 12 } } as any, 'sh1')).toBe(100)
    expect(getBootstrapSnapshotCoverageVersion({ coversVersions: {} } as any, 'missing')).toBe(0)
  })
})

describe('chooseBootstrapWorkbookCandidate', () => {
  const remoteCandidate = (version: number, coverageVersion: number) => ({
    snapshot: { remote: true } as Record<string, unknown>,
    seed: `remote-v${version}`,
    source: 'remote' as const,
    version,
    updatedAt: null as string | null,
    coversVersions: { sh1: coverageVersion }
  })

  const cacheCandidate = (version: number, coverageVersion: number) => ({
    snapshot: { cache: true } as Record<string, unknown>,
    seed: `cache-v${version}`,
    source: 'cache' as const,
    version,
    updatedAt: null as string | null,
    coversVersions: { sh1: coverageVersion }
  })

  it('when both compatible, prefers higher requested-sheet coverage (cache ahead)', () => {
    const picked = chooseBootstrapWorkbookCandidate({
      activeSheetId: 'sh1',
      minVersion: 100,
      baseline: cacheCandidate(120, 120),
      remoteResult: remoteCandidate(110, 110)
    })
    expect(picked.source).toBe('cache')
    expect(picked.version).toBe(120)
  })

  it('when both compatible, prefers higher requested-sheet coverage (remote ahead)', () => {
    const picked = chooseBootstrapWorkbookCandidate({
      activeSheetId: 'sh1',
      minVersion: 100,
      baseline: cacheCandidate(110, 110),
      remoteResult: remoteCandidate(120, 120)
    })
    expect(picked.source).toBe('remote')
    expect(picked.version).toBe(120)
  })

  it('when cache lags the requested sheet coverage and remote is compatible, chooses remote', () => {
    const picked = chooseBootstrapWorkbookCandidate({
      activeSheetId: 'sh1',
      minVersion: 527,
      baseline: cacheCandidate(999, 400),
      remoteResult: remoteCandidate(100, 527)
    })
    expect(picked.source).toBe('remote')
  })

  it('when remote lags the requested sheet coverage and cache is compatible, chooses cache', () => {
    const picked = chooseBootstrapWorkbookCandidate({
      activeSheetId: 'sh1',
      minVersion: 527,
      baseline: cacheCandidate(600, 600),
      remoteResult: remoteCandidate(999, 400)
    })
    expect(picked.source).toBe('cache')
    expect(picked.version).toBe(600)
  })

  it('when both lag the requested sheet coverage, prefers the higher-coverage checkpoint', () => {
    const picked = chooseBootstrapWorkbookCandidate({
      activeSheetId: 'sh1',
      minVersion: 527,
      baseline: cacheCandidate(500, 500),
      remoteResult: remoteCandidate(400, 400)
    })
    expect(picked.source).toBe('cache')
    expect(picked.version).toBe(500)
  })

  it('prefers the structurally valid candidate over higher coverage', () => {
    const picked = chooseBootstrapWorkbookCandidate({
      activeSheetId: 'sh1',
      minVersion: 100,
      baseline: cacheCandidate(999, 999),
      remoteResult: remoteCandidate(110, 110),
      baselineValidationResult: {
        valid: false,
        safety: 'unsafe',
        reason: 'row_mismatch',
        rowMismatch: true,
        trackingHeaderMatches: true,
        formattingScore: 0
      },
      remoteValidationResult: {
        valid: true,
        safety: 'safe',
        reason: null,
        rowMismatch: false,
        trackingHeaderMatches: true,
        formattingScore: 0
      }
    })
    expect(picked.source).toBe('remote')
  })

  it('prefers the richer-formatting candidate when both are otherwise safe', () => {
    const picked = chooseBootstrapWorkbookCandidate({
      activeSheetId: 'sh1',
      minVersion: 100,
      baseline: cacheCandidate(111, 120),
      remoteResult: remoteCandidate(120, 140),
      baselineValidationResult: {
        valid: true,
        safety: 'safe',
        reason: null,
        rowMismatch: false,
        trackingHeaderMatches: true,
        formattingScore: 8
      },
      remoteValidationResult: {
        valid: true,
        safety: 'safe',
        reason: null,
        rowMismatch: false,
        trackingHeaderMatches: true,
        formattingScore: 2
      }
    })
    expect(picked.source).toBe('cache')
  })
})

describe('validateActiveSheetBootstrapSnapshot', () => {
  it('rejects snapshots whose active-sheet cell data mismatches canonical rows', () => {
    const result = validateActiveSheetBootstrapSnapshot({
      snapshot: {
        sheetOrder: ['sh1'],
        sheets: {
          sh1: {
            id: 'sh1',
            name: 'Sheet 1',
            cellData: {
              0: { 0: { v: 'stale' } }
            }
          }
        }
      },
      activeSheetId: 'sh1',
      canonicalSheetMeta: minimalSheet(),
      canonicalRows: [{ _id: 'r1', foo: 'fresh' }]
    })

    expect(result).toEqual({
      valid: false,
      safety: 'unsafe',
      reason: 'row_mismatch',
      rowMismatch: true,
      trackingHeaderMatches: true,
      formattingScore: 0
    })
  })

  it('accepts snapshots whose active sheet matches canonical rows', () => {
    const result = validateActiveSheetBootstrapSnapshot({
      snapshot: {
        sheetOrder: ['sh1'],
        sheets: {
          sh1: {
            id: 'sh1',
            name: 'Sheet 1',
            cellData: {
              0: { 0: { v: 'fresh' } }
            }
          }
        }
      },
      activeSheetId: 'sh1',
      canonicalSheetMeta: minimalSheet(),
      canonicalRows: [{ _id: 'r1', foo: 'fresh' }]
    })

    expect(result).toEqual({
      valid: true,
      safety: 'safe',
      reason: null,
      rowMismatch: false,
      trackingHeaderMatches: true,
      formattingScore: 0
    })
  })

  it('keeps snapshot-only values usable when canonical rows do not positively conflict', () => {
    const result = validateActiveSheetBootstrapSnapshot({
      snapshot: {
        sheetOrder: ['sh1'],
        sheets: {
          sh1: {
            id: 'sh1',
            name: 'Sheet 1',
            cellData: {
              0: { 0: { v: 'fresh' } },
              13: { 0: { v: 'snapshot-only' } }
            }
          }
        }
      },
      activeSheetId: 'sh1',
      canonicalSheetMeta: minimalSheet(),
      canonicalRows: [{ _id: 'r1', foo: 'fresh' }]
    })

    expect(result).toEqual({
      valid: true,
      safety: 'safe',
      reason: null,
      rowMismatch: false,
      trackingHeaderMatches: true,
      formattingScore: 0
    })
  })
})

describe('fetchBootstrapSnapshotRemoteComparedToBaseline', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('when both remote and cache meet minVersion, prefers higher workbook snapshot version', async () => {
    jest.spyOn(SpreadsheetApiService, 'getUniverSnapshot').mockResolvedValue({
      version: 527,
      snapshot: { wb: true },
      updatedAt: '2020-01-01T00:00:00.000Z',
      coversVersions: { sh1: 527 }
    })
    const baseline = {
      snapshot: { cache: true },
      seed: 'cache-v999',
      source: 'cache' as const,
      version: 999,
      updatedAt: new Date().toISOString(),
      coversVersions: { sh1: 999 }
    }
    const result = await fetchBootstrapSnapshotRemoteComparedToBaseline('app-1', 'sh1', 527, baseline)
    expect(result.source).toBe('cache')
    expect(result.version).toBe(999)
    expect(result.snapshot).toEqual(expect.objectContaining({ cache: true }))
  })

  it('when remote lags minVersion but cache workbook meets minVersion, prefers cache', async () => {
    jest.spyOn(SpreadsheetApiService, 'getUniverSnapshot').mockResolvedValue({
      version: 400,
      snapshot: { remote: true },
      updatedAt: null,
      coversVersions: { sh1: 400 }
    })
    const baseline = {
      snapshot: { cache: true },
      seed: 'cache-v600',
      source: 'cache' as const,
      version: 600,
      updatedAt: null,
      coversVersions: { sh1: 600 }
    }
    const result = await fetchBootstrapSnapshotRemoteComparedToBaseline('app-1', 'sh1', 527, baseline)
    expect(result.source).toBe('cache')
    expect(result.version).toBe(600)
  })

  it('when both remote and cache checkpoints lag minVersion, prefers the higher-coverage checkpoint', async () => {
    jest.spyOn(SpreadsheetApiService, 'getUniverSnapshot').mockResolvedValue({
      version: 400,
      snapshot: { remoteShell: true },
      updatedAt: null,
      coversVersions: { sh1: 400 }
    })
    const baseline = {
      snapshot: { cache: true },
      seed: 'cache-v500',
      source: 'cache' as const,
      version: 500,
      updatedAt: null,
      coversVersions: { sh1: 500 }
    }
    const result = await fetchBootstrapSnapshotRemoteComparedToBaseline('app-1', 'sh1', 527, baseline)
    expect(result.source).toBe('cache')
    expect(result.version).toBe(500)
  })

  it('drops unsafe unwatermarked remote snapshots instead of trusting them', async () => {
    jest.spyOn(SpreadsheetApiService, 'getUniverSnapshot').mockResolvedValue({
      version: 400,
      snapshot: { remoteShell: true },
      updatedAt: null,
      coversVersions: {}
    })

    const result = await fetchBootstrapSnapshotRemoteComparedToBaseline('app-1', 'sh1', 527, null)
    expect(result.source).toBe('rows_fallback')
    expect(result.snapshot).toBeNull()
  })
})

describe('compareSnapshotCandidatesByRecency', () => {
  it('prefers newer updatedAt when both are ISO strings', () => {
    const older = { updatedAt: '2024-01-01T00:00:00.000Z', version: 99 }
    const newer = { updatedAt: '2025-06-01T12:00:00.000Z', version: 1 }
    expect(compareSnapshotCandidatesByRecency(newer, older)).toBeGreaterThan(0)
    expect(compareSnapshotCandidatesByRecency(older, newer)).toBeLessThan(0)
  })

  it('falls back to version when updatedAt is missing', () => {
    const low = { updatedAt: null, version: 2 }
    const high = { updatedAt: null, version: 10 }
    expect(compareSnapshotCandidatesByRecency(high, low)).toBeGreaterThan(0)
  })

  it('treats missing candidates as older than any dated candidate', () => {
    expect(
      compareSnapshotCandidatesByRecency({ updatedAt: '2024-01-01T00:00:00.000Z', version: 1 }, null)
    ).toBeGreaterThan(0)
  })
})

describe('selectBootstrapWorksheetSnapshotForPipeline', () => {
  it('returns the workbook snapshot unchanged when native multi-sheet tabs are preferred', () => {
    const snap = { sheets: {} }
    expect(selectBootstrapWorksheetSnapshotForPipeline(true, snap, minimalSheet())).toBe(snap)
  })
})

describe('enrichBootstrapSnapshotFromOlderCacheFormatting', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('only searches older formatting donors for lagging fallback snapshots', () => {
    const merged: Record<string, unknown> = {
      sheetOrder: ['sh1'],
      sheets: {
        sh1: {
          id: 'sh1',
          name: 'S',
          cellData: {
            0: { 0: { v: 'x' } }
          }
        }
      },
      styles: {}
    }
    const richStaleDonor: Record<string, unknown> = {
      sheetOrder: ['sh1'],
      sheets: {
        sh1: {
          id: 'sh1',
          cellData: {
            0: {
              0: { s: 'stale-style' },
              1: { s: 'stale-style' },
              2: { s: 'stale-style' }
            }
          }
        }
      },
      styles: { 'stale-style': { bg: { rgb: '#ffff00' } } }
    }
    const newerDonor: Record<string, unknown> = {
      sheetOrder: ['sh1'],
      sheets: {
        sh1: {
          id: 'sh1',
          cellData: {
            0: { 0: { s: 'new-style' } }
          }
        }
      },
      styles: { 'new-style': { bg: { rgb: '#cccccc' } } }
    }

    jest.spyOn(univerSnapshotCache, 'listValidUniverSnapshotCacheEntries').mockReturnValue([
      { version: 263, savedAt: 1, snapshot: richStaleDonor },
      { version: 554, savedAt: 2, snapshot: newerDonor }
    ])

    jest.spyOn(univerAdapter, 'mergeWorkbookFormattingFromDonor').mockImplementation((_into, donor) => donor)

    expect(enrichBootstrapSnapshotFromOlderCacheFormatting('app-1', 'sh1', merged)).toBe(richStaleDonor)
    expect(
      enrichBootstrapSnapshotFromOlderCacheFormatting('app-1', 'sh1', merged, {
        donorMinWorkbookVersion: 554
      })
    ).toBe(merged)
  })

  it('does not scan stale donors when the selected snapshot already meets canonical version', () => {
    const styles: Record<string, unknown> = {}
    const cellData: Record<number, Record<number, { s: string }>> = {}
    for (let r = 0; r < 5; r += 1) {
      cellData[r] = {}
      for (let c = 0; c < 5; c += 1) {
        const id = `stable-${r}-${c}`
        styles[id] = {}
        cellData[r][c] = { s: id }
      }
    }
    const mergedRich: Record<string, unknown> = {
      sheetOrder: ['sh1'],
      sheets: {
        sh1: {
          id: 'sh1',
          cellData
        }
      },
      styles
    }
    const stalePlus: Record<string, unknown> = {
      sheetOrder: ['sh1'],
      sheets: {
        sh1: {
          id: 'sh1',
          cellData: {
            9: { 9: { s: 'extra-stale' } }
          }
        }
      },
      styles: { 'extra-stale': { bg: { rgb: '#ff00ff' } } }
    }

    jest
      .spyOn(univerSnapshotCache, 'listValidUniverSnapshotCacheEntries')
      .mockReturnValue([{ version: 263, savedAt: 1, snapshot: stalePlus }])

    const mergeSpy = jest.spyOn(univerAdapter, 'mergeWorkbookFormattingFromDonor').mockImplementation(into => into)

    const out = enrichBootstrapSnapshotFromOlderCacheFormatting('app-1', 'sh1', mergedRich, {
      donorMinWorkbookVersion: 554
    })
    expect(out).toBe(mergedRich)
    expect(mergeSpy).not.toHaveBeenCalled()
  })
})

describe('computeBootstrapSnapshotMergeOutcome', () => {
  it('flags row overlay when canonical merge mutates the workbook snapshot object identity', () => {
    const loaderSnapshot: Record<string, unknown> = {
      sheetOrder: ['sh1'],
      sheets: {
        sh1: {
          id: 'sh1',
          name: 'Sheet 1',
          cellData: {}
        }
      }
    }
    const outcome = computeBootstrapSnapshotMergeOutcome({
      preferUniverNativeSheetTabs: true,
      loaderSnapshot,
      canonicalSheetMeta: minimalSheet(),
      canonicalRows: [{ _id: 'r1', foo: 'bar' }],
      appId: 'app',
      activeSheetId: 'sh1'
    })
    expect(outcome.normalizedSnapshot).toBeDefined()
    expect(outcome.normalizedSnapshot).not.toBe(loaderSnapshot)
    expect(outcome.rowOverlayChanged).toBe(true)
  })
})
