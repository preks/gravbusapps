import { SpreadsheetApiService } from '../services/SpreadsheetApiService'
import type { SpreadsheetSheet } from '../types'
import {
  isolateWorkbookSnapshotToSingleSheet,
  mergeAuthoritativeViewerRowsIntoWorkbookSnapshot,
  mergeWorkbookFormattingFromDonor,
  normalizeWorkbookSnapshotToAppSheets,
  stripWorkbookSnapshotValuesPreservingFormatting,
  workbookFormattingRichnessScore
} from './univerAdapter'
import {
  listValidUniverSnapshotCacheEntries,
  readUniverSnapshotCacheForBootstrap,
  writeUniverSnapshotCache
} from './univerSnapshotCache'

export const SNAPSHOT_FETCH_TIMEOUT_MS = 15000

export const fetchUniverSnapshotWithTimeout = async (
  appId: string,
  timeoutMs: number
): Promise<{ version?: number; snapshot?: unknown; updatedAt?: string | null }> => {
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

/**
 * Prefer higher workbook snapshot version first; then recency (`updatedAt` / version tie-break).
 * Ensures backend checkpoints at >= canonical sheet `minVersion` win over fresher local cache timestamps.
 */
export const compareBootstrapSnapshotAuthority = (
  a: { updatedAt?: string | null; version?: number | null } | null | undefined,
  b: { updatedAt?: string | null; version?: number | null } | null | undefined
): number => {
  const va = Number(a?.version ?? 0)
  const vb = Number(b?.version ?? 0)
  if (va !== vb) return va - vb
  return compareSnapshotCandidatesByRecency(a, b)
}

export type BootstrapSnapshotLoaderResult = {
  snapshot: Record<string, unknown> | null
  seed: string
  source: 'cache' | 'remote' | 'rows_fallback'
  version: number
  updatedAt: string | null
  cacheWrite?: ReturnType<typeof writeUniverSnapshotCache>
}

/** Workbook snapshot generation is at or ahead of canonical sheet `minVersion`. */
export const isWorkbookSnapshotCanonicalCompatible = (workbookSnapshotVersion: number, minVersion: number): boolean =>
  Number.isFinite(workbookSnapshotVersion) && Number.isFinite(minVersion) && workbookSnapshotVersion >= minVersion

/**
 * Decide cache vs remote workbook for bootstrap when both payloads exist.
 * Uses canonical sheet `minVersion` vs each candidate's workbook snapshot version.
 */
export const chooseBootstrapWorkbookCandidate = (params: {
  minVersion: number
  baseline: BootstrapSnapshotLoaderResult
  remoteResult: BootstrapSnapshotLoaderResult
}): BootstrapSnapshotLoaderResult => {
  const { minVersion, baseline, remoteResult } = params
  const remoteCompatible = isWorkbookSnapshotCanonicalCompatible(remoteResult.version, minVersion)
  const cacheCompatible = isWorkbookSnapshotCanonicalCompatible(baseline.version, minVersion)

  if (remoteCompatible && cacheCompatible) {
    return compareBootstrapSnapshotAuthority(remoteResult, baseline) >= 0 ? remoteResult : baseline
  }
  if (remoteCompatible && !cacheCompatible) {
    return remoteResult
  }
  if (!remoteCompatible && cacheCompatible) {
    return baseline
  }
  return remoteResult
}

export const tryLoadBootstrapSnapshotFromCache = (
  appId: string,
  minVersion: number
): BootstrapSnapshotLoaderResult | null => {
  const cached = readUniverSnapshotCacheForBootstrap(appId, minVersion)
  if (!cached?.snapshot || typeof cached.snapshot !== 'object') return null
  const cachedUpdatedAt = Number.isFinite(cached.savedAt) ? new Date(cached.savedAt).toISOString() : null
  return {
    snapshot: stripWorkbookSnapshotValuesPreservingFormatting(cached.snapshot),
    seed: `cache-v${cached.version}`,
    source: 'cache',
    version: cached.version,
    updatedAt: cachedUpdatedAt
  }
}

/**
 * Fetches the remote workbook snapshot and picks the fresher of `baseline` (typically cache)
 * vs remote. Used for progressive bootstrap: paint cache first, then reconcile in background.
 */
export const fetchBootstrapSnapshotRemoteComparedToBaseline = async (
  appId: string,
  minVersion: number,
  baseline: BootstrapSnapshotLoaderResult | null
): Promise<BootstrapSnapshotLoaderResult> => {
  const remote = await fetchUniverSnapshotWithTimeout(appId, SNAPSHOT_FETCH_TIMEOUT_MS)
  const remoteVersionRaw = Number(remote?.version ?? 0)
  const remoteVersion = Number.isFinite(remoteVersionRaw) && remoteVersionRaw >= 0 ? Math.trunc(remoteVersionRaw) : 0
  const remoteUpdatedAt = typeof remote?.updatedAt === 'string' ? remote.updatedAt : null

  if (remote?.snapshot && typeof remote.snapshot === 'object') {
    const visualSnapshot = stripWorkbookSnapshotValuesPreservingFormatting(remote.snapshot as Record<string, unknown>)
    const cacheWrite = writeUniverSnapshotCache(appId, remoteVersion, visualSnapshot)
    const remoteResult: BootstrapSnapshotLoaderResult = {
      snapshot: visualSnapshot,
      seed:
        remoteVersion >= minVersion
          ? `remote-v${remoteVersion}`
          : `remote-v${remoteVersion}-lagging-sheet-v${minVersion}`,
      source: 'remote',
      version: remoteVersion,
      updatedAt: remoteUpdatedAt,
      cacheWrite
    }
    if (!baseline) return remoteResult
    return chooseBootstrapWorkbookCandidate({ minVersion, baseline, remoteResult })
  }

  const cacheOnly = baseline ?? tryLoadBootstrapSnapshotFromCache(appId, minVersion)
  if (cacheOnly) return cacheOnly

  return {
    snapshot: null,
    seed: `rows-fallback-v${minVersion}`,
    source: 'rows_fallback',
    version: remoteVersion,
    updatedAt: remoteUpdatedAt
  }
}

export const loadBootstrapSnapshotData = async (
  appId: string,
  minVersion: number
): Promise<BootstrapSnapshotLoaderResult> => {
  const cachedResult = tryLoadBootstrapSnapshotFromCache(appId, minVersion)
  return fetchBootstrapSnapshotRemoteComparedToBaseline(appId, minVersion, cachedResult)
}

export const mergeBootstrapSnapshotWithCanonicalRows = (
  snapshot: Record<string, unknown>,
  sheet: SpreadsheetSheet,
  rows: Record<string, unknown>[]
): Record<string, unknown> => mergeAuthoritativeViewerRowsIntoWorkbookSnapshot(snapshot, sheet.id, rows, sheet.columns)

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
