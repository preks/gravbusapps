import { SpreadsheetApiService } from '../services/SpreadsheetApiService'
import type { SpreadsheetSheet } from '../types'
import {
  isolateWorkbookSnapshotToSingleSheet,
  mergeAuthoritativeViewerRowsIntoWorkbookSnapshot,
  mergeWorkbookFormattingFromDonor,
  normalizeWorkbookSnapshotToAppSheets,
  snapshotTrackingHeaderMatchesColumnLabels,
  stripWorkbookSnapshotValuesPreservingFormatting,
  workbookFormattingRichnessScore,
  workbookSnapshotConflictsWithViewerRows
} from './univerAdapter'
import {
  listValidUniverSnapshotCacheEntries,
  readUniverSnapshotCacheForBootstrap,
  writeUniverSnapshotCache
} from './univerSnapshotCache'
import {
  getSheetCoverageVersion,
  hasSheetCoverageVersion,
  normalizeSnapshotCoversVersions,
  type SpreadsheetSnapshotCoversVersions
} from './spreadsheetSnapshotCoverage'

export const SNAPSHOT_FETCH_TIMEOUT_MS = 15000

export const fetchUniverSnapshotWithTimeout = async (
  appId: string,
  timeoutMs: number
): Promise<{
  version?: number
  snapshot?: unknown
  updatedAt?: string | null
  coversVersions?: SpreadsheetSnapshotCoversVersions
}> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Snapshot fetch timed out')), timeoutMs)
  })
  return Promise.race([SpreadsheetApiService.getUniverSnapshot(appId), timeoutPromise])
}

/**
 * Rank snapshot candidates by ISO `updatedAt`, then numeric `version`.
 * Used only as a tie-break after workbook snapshot **version** comparison.
 */
export const compareSnapshotCandidatesByRecency = (
  a: { updatedAt?: string | null; version?: number | null } | null | undefined,
  b: { updatedAt?: string | null; version?: number | null } | null | undefined
): number => {
  const toTime = (c: { updatedAt?: string | null; version?: number | null } | null | undefined): number => {
    if (!c) return -1
    if (typeof c.updatedAt === 'string' && c.updatedAt.length > 0) {
      const parsed = Date.parse(c.updatedAt)
      if (Number.isFinite(parsed)) return parsed
    }
    return Number(c.version ?? 0)
  }
  return toTime(a) - toTime(b)
}

export type BootstrapSnapshotLoaderResult = {
  snapshot: Record<string, unknown> | null
  seed: string
  source: 'cache' | 'remote' | 'rows_fallback'
  version: number
  updatedAt: string | null
  coversVersions: SpreadsheetSnapshotCoversVersions
  cacheWrite?: ReturnType<typeof writeUniverSnapshotCache>
}

export type BootstrapSnapshotValidationReason =
  | 'missing_snapshot'
  | 'missing_active_sheet'
  | 'row_mismatch'
  | 'tracking_header_mismatch'

export type BootstrapSnapshotValidationResult = {
  valid: boolean
  safety: 'unsafe' | 'repairable' | 'safe'
  reason: BootstrapSnapshotValidationReason | null
  rowMismatch: boolean
  trackingHeaderMatches: boolean
  formattingScore: number
}

export const validateActiveSheetBootstrapSnapshot = (params: {
  snapshot: Record<string, unknown> | null
  activeSheetId: string
  canonicalSheetMeta: SpreadsheetSheet
  canonicalRows: Record<string, unknown>[]
}): BootstrapSnapshotValidationResult => {
  const { snapshot, activeSheetId, canonicalSheetMeta, canonicalRows } = params
  const formattingScore =
    snapshot && typeof snapshot === 'object' ? workbookFormattingRichnessScore(snapshot, activeSheetId) : 0
  if (!snapshot || typeof snapshot !== 'object') {
    return {
      valid: false,
      safety: 'unsafe',
      reason: 'missing_snapshot',
      rowMismatch: false,
      trackingHeaderMatches: true,
      formattingScore
    }
  }

  const sheets = snapshot.sheets as Record<string, unknown> | undefined
  const worksheet = sheets?.[activeSheetId]
  if (!worksheet || typeof worksheet !== 'object' || Array.isArray(worksheet)) {
    return {
      valid: false,
      safety: 'unsafe',
      reason: 'missing_active_sheet',
      rowMismatch: false,
      trackingHeaderMatches: true,
      formattingScore
    }
  }

  const rowMismatch = workbookSnapshotConflictsWithViewerRows(
    snapshot,
    activeSheetId,
    canonicalRows,
    canonicalSheetMeta.columns
  )
  if (rowMismatch) {
    return {
      valid: false,
      safety: 'unsafe',
      reason: 'row_mismatch',
      rowMismatch: true,
      trackingHeaderMatches: true,
      formattingScore
    }
  }

  const trackingHeaderMatches = snapshotTrackingHeaderMatchesColumnLabels(
    snapshot,
    activeSheetId,
    canonicalRows,
    canonicalSheetMeta.columns
  )
  if (!trackingHeaderMatches) {
    return {
      valid: true,
      safety: 'repairable',
      reason: 'tracking_header_mismatch',
      rowMismatch: false,
      trackingHeaderMatches: false,
      formattingScore
    }
  }

  return {
    valid: true,
    safety: 'safe',
    reason: null,
    rowMismatch: false,
    trackingHeaderMatches: true,
    formattingScore
  }
}

export const getBootstrapSnapshotCoverageVersion = (
  result: Pick<BootstrapSnapshotLoaderResult, 'coversVersions'>,
  sheetId: string
): number => getSheetCoverageVersion(result.coversVersions, sheetId)

/**
 * Decide cache vs remote workbook for bootstrap.
 * The requested sheet's op-log coverage watermark is the source of truth; the blob version is only a tie-breaker.
 */
export const chooseBootstrapWorkbookCandidate = (params: {
  activeSheetId: string
  minVersion: number
  baseline: BootstrapSnapshotLoaderResult
  remoteResult: BootstrapSnapshotLoaderResult
  baselineValidationResult?: BootstrapSnapshotValidationResult
  remoteValidationResult?: BootstrapSnapshotValidationResult
}): BootstrapSnapshotLoaderResult => {
  const { activeSheetId, minVersion, baseline, remoteResult, baselineValidationResult, remoteValidationResult } = params
  const remoteCoverage = getBootstrapSnapshotCoverageVersion(remoteResult, activeSheetId)
  const cacheCoverage = getBootstrapSnapshotCoverageVersion(baseline, activeSheetId)
  const remoteCompatible = remoteCoverage >= minVersion
  const cacheCompatible = cacheCoverage >= minVersion
  const getSafetyRank = (result?: BootstrapSnapshotValidationResult): number => {
    if (!result) return -1
    if (result.safety === 'safe') return 2
    if (result.safety === 'repairable') return 1
    return 0
  }
  const remoteSafetyRank = getSafetyRank(remoteValidationResult)
  const cacheSafetyRank = getSafetyRank(baselineValidationResult)

  if (baselineValidationResult && remoteValidationResult && remoteSafetyRank !== cacheSafetyRank) {
    return remoteSafetyRank > cacheSafetyRank ? remoteResult : baseline
  }

  if (
    baselineValidationResult &&
    remoteValidationResult &&
    remoteValidationResult.formattingScore !== baselineValidationResult.formattingScore
  ) {
    return remoteValidationResult.formattingScore > baselineValidationResult.formattingScore ? remoteResult : baseline
  }

  if (remoteCompatible && !cacheCompatible) return remoteResult
  if (!remoteCompatible && cacheCompatible) return baseline
  if (remoteCoverage !== cacheCoverage) {
    return remoteCoverage > cacheCoverage ? remoteResult : baseline
  }
  return compareSnapshotCandidatesByRecency(remoteResult, baseline) >= 0 ? remoteResult : baseline
}

export const tryLoadBootstrapSnapshotFromCache = (
  appId: string,
  activeSheetId: string,
  minVersion: number
): BootstrapSnapshotLoaderResult | null => {
  const cached = readUniverSnapshotCacheForBootstrap(appId, activeSheetId, minVersion)
  if (!cached?.snapshot || typeof cached.snapshot !== 'object') return null
  const cachedUpdatedAt = Number.isFinite(cached.savedAt) ? new Date(cached.savedAt).toISOString() : null
  const coverageVersion = getSheetCoverageVersion(cached.coversVersions, activeSheetId)
  return {
    snapshot: stripWorkbookSnapshotValuesPreservingFormatting(cached.snapshot),
    seed: `cache-cov${coverageVersion}-blob${cached.version}`,
    source: 'cache',
    version: cached.version,
    updatedAt: cachedUpdatedAt,
    coversVersions: cached.coversVersions
  }
}

/**
 * Fetches the remote workbook snapshot and picks the fresher of `baseline` (typically cache)
 * vs remote. Used for progressive bootstrap: paint cache first, then reconcile in background.
 */
export const fetchBootstrapSnapshotRemoteComparedToBaseline = async (
  appId: string,
  activeSheetId: string,
  minVersion: number,
  baseline: BootstrapSnapshotLoaderResult | null,
  options?: {
    selectCandidate?: (params: {
      activeSheetId: string
      minVersion: number
      baseline: BootstrapSnapshotLoaderResult
      remoteResult: BootstrapSnapshotLoaderResult
    }) => BootstrapSnapshotLoaderResult
  }
): Promise<BootstrapSnapshotLoaderResult> => {
  const remote = await fetchUniverSnapshotWithTimeout(appId, SNAPSHOT_FETCH_TIMEOUT_MS)
  const remoteVersionRaw = Number(remote?.version ?? 0)
  const remoteVersion = Number.isFinite(remoteVersionRaw) && remoteVersionRaw >= 0 ? Math.trunc(remoteVersionRaw) : 0
  const remoteUpdatedAt = typeof remote?.updatedAt === 'string' ? remote.updatedAt : null

  if (remote?.snapshot && typeof remote.snapshot === 'object') {
    const visualSnapshot = stripWorkbookSnapshotValuesPreservingFormatting(remote.snapshot as Record<string, unknown>)
    const coversVersions = normalizeSnapshotCoversVersions(remote?.coversVersions)
    const coverageVersion = getSheetCoverageVersion(coversVersions, activeSheetId)
    const isCoverageSafe = hasSheetCoverageVersion(coversVersions, activeSheetId)
    if (!isCoverageSafe) {
      return (
        baseline ?? {
          snapshot: null,
          seed: `rows-fallback-unsafe-remote-cov0-blob${remoteVersion}`,
          source: 'rows_fallback',
          version: remoteVersion,
          updatedAt: remoteUpdatedAt,
          coversVersions: {}
        }
      )
    }

    const cacheWrite = writeUniverSnapshotCache(appId, remoteVersion, visualSnapshot)
    const remoteResult: BootstrapSnapshotLoaderResult = {
      snapshot: visualSnapshot,
      seed: `remote-cov${coverageVersion}-blob${remoteVersion}`,
      source: 'remote',
      version: remoteVersion,
      updatedAt: remoteUpdatedAt,
      coversVersions,
      cacheWrite
    }
    if (!baseline) return remoteResult
    return (
      options?.selectCandidate?.({ activeSheetId, minVersion, baseline, remoteResult }) ??
      chooseBootstrapWorkbookCandidate({ activeSheetId, minVersion, baseline, remoteResult })
    )
  }

  const cacheOnly = baseline ?? tryLoadBootstrapSnapshotFromCache(appId, activeSheetId, minVersion)
  if (cacheOnly) return cacheOnly

  return {
    snapshot: null,
    seed: `rows-fallback-cov${minVersion}`,
    source: 'rows_fallback',
    version: remoteVersion,
    updatedAt: remoteUpdatedAt,
    coversVersions: {}
  }
}

export const loadBootstrapSnapshotData = async (
  appId: string,
  activeSheetId: string,
  minVersion: number,
  options?: {
    selectCandidate?: (params: {
      activeSheetId: string
      minVersion: number
      baseline: BootstrapSnapshotLoaderResult
      remoteResult: BootstrapSnapshotLoaderResult
    }) => BootstrapSnapshotLoaderResult
  }
): Promise<BootstrapSnapshotLoaderResult> => {
  const cachedResult = tryLoadBootstrapSnapshotFromCache(appId, activeSheetId, minVersion)
  return fetchBootstrapSnapshotRemoteComparedToBaseline(appId, activeSheetId, minVersion, cachedResult, options)
}

export const mergeBootstrapSnapshotWithCanonicalRows = (
  snapshot: Record<string, unknown>,
  sheet: SpreadsheetSheet,
  rows: Record<string, unknown>[]
): Record<string, unknown> =>
  mergeAuthoritativeViewerRowsIntoWorkbookSnapshot(snapshot, sheet.id, rows, sheet.columns, {
    preserveUnresolvedSnapshotValues: true
  })

/**
 * When the chosen bootstrap workbook is value-only or stale (e.g. bad remote payload) but an older
 * localStorage generation still has `styles` / cell `s` refs from a prior successful save, merge that
 * formatting in so reopen is not completely unstyled.
 *
 * When `donorMinWorkbookVersion` is set, the selected loader is already canonical/current, so do not
 * scan older cache blobs. Pulling formatting from stale snapshots on that path is both expensive and
 * can resurrect outdated visual state. Donor search is reserved for lagging/fallback loaders only.
 */
export const enrichBootstrapSnapshotFromOlderCacheFormatting = (
  appId: string,
  sheetId: string,
  mergedSnapshot: Record<string, unknown>,
  options?: { donorMinWorkbookVersion?: number }
): Record<string, unknown> => {
  if (options?.donorMinWorkbookVersion != null && Number.isFinite(options.donorMinWorkbookVersion)) {
    return mergedSnapshot
  }

  const primaryScore = workbookFormattingRichnessScore(mergedSnapshot, sheetId)
  const candidates = listValidUniverSnapshotCacheEntries(appId)
  let bestDonor: Record<string, unknown> | null = null
  let bestScore = primaryScore
  for (const entry of candidates) {
    const s = workbookFormattingRichnessScore(entry.snapshot, sheetId)
    if (s > bestScore) {
      bestScore = s
      bestDonor = entry.snapshot
    }
  }

  if (!bestDonor) return mergedSnapshot
  return mergeWorkbookFormattingFromDonor(mergedSnapshot, bestDonor, sheetId)
}

/** Single-sheet viewers isolate the active worksheet from the app-level workbook blob. */
export const selectBootstrapWorksheetSnapshotForPipeline = (
  preferUniverNativeSheetTabs: boolean,
  snapshot: Record<string, unknown> | null,
  canonicalSheetMeta: SpreadsheetSheet
): Record<string, unknown> | null => {
  if (!snapshot || typeof snapshot !== 'object') return snapshot
  if (!preferUniverNativeSheetTabs) {
    return (
      isolateWorkbookSnapshotToSingleSheet(snapshot, canonicalSheetMeta.id, canonicalSheetMeta.name) ??
      normalizeWorkbookSnapshotToAppSheets(snapshot, [canonicalSheetMeta])
    )
  }
  return snapshot
}

export type BootstrapSnapshotMergeParams = {
  preferUniverNativeSheetTabs: boolean
  loaderSnapshot: Record<string, unknown> | null
  canonicalSheetMeta: SpreadsheetSheet
  canonicalRows: Record<string, unknown>[]
  appId: string
  activeSheetId: string
  /** When set, workbook JSON is normalized to canonical tab ids before isolate/overlay (ghost-key safety). */
  appSheets?: SpreadsheetSheet[]
  /**
   * When set, formatting donors from localStorage must be at least this workbook snapshot version.
   * Used when the loader workbook already meets canonical sheet generation so older cache cannot override styling.
   */
  formattingDonorMinWorkbookVersion?: number
}

export type BootstrapSnapshotMergeOutcome = {
  singleSheetSnapshot: Record<string, unknown> | null
  normalizedSnapshot: Record<string, unknown> | null | undefined
  snapshotForBootstrap: Record<string, unknown> | null | undefined
  rowOverlayChanged: boolean
  formattingEnriched: boolean
}

/** Pure merge steps shared with the bootstrap pipeline (test seam). */
export const computeBootstrapSnapshotMergeOutcome = (
  params: BootstrapSnapshotMergeParams
): BootstrapSnapshotMergeOutcome => {
  const {
    preferUniverNativeSheetTabs,
    loaderSnapshot,
    canonicalSheetMeta,
    canonicalRows,
    appId,
    activeSheetId,
    appSheets,
    formattingDonorMinWorkbookVersion
  } = params
  const loaderNormalized =
    loaderSnapshot && typeof loaderSnapshot === 'object' && appSheets && appSheets.length > 0
      ? normalizeWorkbookSnapshotToAppSheets(loaderSnapshot, appSheets)
      : loaderSnapshot
  const singleSheetSnapshot = selectBootstrapWorksheetSnapshotForPipeline(
    preferUniverNativeSheetTabs,
    loaderNormalized,
    canonicalSheetMeta
  )
  const normalizedSnapshot =
    singleSheetSnapshot && typeof singleSheetSnapshot === 'object'
      ? mergeBootstrapSnapshotWithCanonicalRows(singleSheetSnapshot, canonicalSheetMeta, canonicalRows)
      : singleSheetSnapshot
  const snapshotForBootstrap =
    normalizedSnapshot && typeof normalizedSnapshot === 'object'
      ? enrichBootstrapSnapshotFromOlderCacheFormatting(appId, activeSheetId, normalizedSnapshot, {
          donorMinWorkbookVersion: formattingDonorMinWorkbookVersion
        })
      : normalizedSnapshot
  const rowOverlayChanged = Boolean(normalizedSnapshot && loaderSnapshot && normalizedSnapshot !== loaderSnapshot)
  const formattingEnriched = Boolean(
    snapshotForBootstrap && normalizedSnapshot && snapshotForBootstrap !== normalizedSnapshot
  )
  return {
    singleSheetSnapshot,
    normalizedSnapshot,
    snapshotForBootstrap,
    rowOverlayChanged,
    formattingEnriched
  }
}
