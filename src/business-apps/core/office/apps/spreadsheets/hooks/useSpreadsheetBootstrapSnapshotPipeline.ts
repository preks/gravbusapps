import { useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import { SpreadsheetApiService } from '../services/SpreadsheetApiService'
import type { SpreadsheetSheet } from '../types'
import type { SpreadsheetSession } from '../core'
import { sortSpreadsheetRowsBySheetSettings } from '../utils/spreadsheetSheetRowSort'
import { stripWorkbookSnapshotValuesPreservingFormatting } from '../utils/univerAdapter'
import {
  attachSnapshotCoversVersions,
  getSheetCoverageVersion,
  mergeSnapshotCoversVersions,
  snapshotHasFormattingSignal,
  type SpreadsheetSnapshotCoversVersions
} from '../utils/spreadsheetSnapshotCoverage'
import {
  computeBootstrapSnapshotMergeOutcome,
  fetchBootstrapSnapshotRemoteComparedToBaseline,
  loadBootstrapSnapshotData,
  tryLoadBootstrapSnapshotFromCache,
  type BootstrapSnapshotLoaderResult
} from '../utils/spreadsheetBootstrapSnapshotHelpers'
import { readUniverSnapshotCacheForBootstrap, writeUniverSnapshotCache } from '../utils/univerSnapshotCache'

export type BootstrapWorkbookReconcileIssuePhase = 'reconcile' | 'fallback' | 'canonical'

export interface UseSpreadsheetBootstrapSnapshotPipelineParams {
  appId: string
  /** Full tab list for workbook normalization against canonical sheet ids (optional). */
  appSheets?: SpreadsheetSheet[]
  activeSheetId: string
  activeSheet: SpreadsheetSheet
  entityEnabled: boolean
  preferUniverNativeSheetTabs: boolean
  spreadsheetSession: Pick<SpreadsheetSession, 'updateWorkbookSnapshot'>
  workbookSnapshotVersionRef: MutableRefObject<number>
  workbookSnapshotCoversVersionsRef: MutableRefObject<SpreadsheetSnapshotCoversVersions>
  peerSheetDataCacheRef: MutableRefObject<Map<string, Record<string, unknown>[]>>
  authoritativePeerSheetDataCacheRef: MutableRefObject<Set<string>>
  /**
   * Bootstrap path when establishing sheet/version selection without collab side-effects:
   * intentionally bypasses `commitLocalSheetData` so we do not bump peer caches, publish `onDataChange`,
   * increment authoritative sync tokens, or apply dirty markers meant for live edits.
   * Session still receives `replaceSheetState` + baseline capture here.
   */
  seedActiveSheetState: (
    sheet: SpreadsheetSheet,
    rows: Record<string, unknown>[],
    options?: {
      version?: number
      setAsActive?: boolean
      markPersisted?: boolean
      updateProcessedLength?: boolean
    }
  ) => void
  mapSnapshotRowsToViewerRows: (snapshotRows: unknown[]) => Record<string, unknown>[]
  debugLog: (message: string, meta?: Record<string, unknown>) => void
  /** Invoked when workbook bootstrap cannot fully reconcile with remote or canonical sheet fetch fails. */
  onBootstrapWorkbookReconcileIssue?: (detail: { phase: BootstrapWorkbookReconcileIssuePhase; error: unknown }) => void
}

export interface UseSpreadsheetBootstrapSnapshotPipelineResult {
  bootstrapSnapshot: Record<string, unknown> | null
  setBootstrapSnapshot: Dispatch<SetStateAction<Record<string, unknown> | null>>
  bootstrapSnapshotSeed: string
  setBootstrapSnapshotSeed: Dispatch<SetStateAction<string>>
  isBootstrapSnapshotLoading: boolean
  setIsBootstrapSnapshotLoading: Dispatch<SetStateAction<boolean>>
  /** Canonical rows + version seeded from `getSheetSnapshot` — safe for edits / delta catch-up. */
  isBootstrapCanonicalReady: boolean
  /** Remote workbook snapshot is still catching up after a cache-first paint. */
  isBootstrapWorkbookEnriching: boolean
  /** True after reconcile + remote fallback both failed, or canonical sheet snapshot failed. */
  isBootstrapWorkbookSyncFailed: boolean
  hasBootstrappedForAppIdRef: MutableRefObject<{ appId: string | null; done: boolean }>
}

export function useSpreadsheetBootstrapSnapshotPipeline(
  params: UseSpreadsheetBootstrapSnapshotPipelineParams
): UseSpreadsheetBootstrapSnapshotPipelineResult {
  const {
    appId,
    appSheets,
    activeSheetId,
    activeSheet,
    entityEnabled,
    preferUniverNativeSheetTabs,
    spreadsheetSession,
    workbookSnapshotVersionRef,
    workbookSnapshotCoversVersionsRef,
    peerSheetDataCacheRef,
    authoritativePeerSheetDataCacheRef,
    seedActiveSheetState,
    mapSnapshotRowsToViewerRows,
    debugLog,
    onBootstrapWorkbookReconcileIssue
  } = params

  const [bootstrapSnapshot, setBootstrapSnapshot] = useState<Record<string, unknown> | null>(null)
  const [bootstrapSnapshotSeed, setBootstrapSnapshotSeed] = useState<string>('none')
  const [isBootstrapSnapshotLoading, setIsBootstrapSnapshotLoading] = useState<boolean>(true)
  const [isBootstrapCanonicalReady, setIsBootstrapCanonicalReady] = useState(false)
  const [isBootstrapWorkbookEnriching, setIsBootstrapWorkbookEnriching] = useState(false)
  const [isBootstrapWorkbookSyncFailed, setIsBootstrapWorkbookSyncFailed] = useState(false)
  const hasBootstrappedForAppIdRef = useRef<{ appId: string | null; done: boolean }>({
    appId: null,
    done: false
  })
  const activeSheetVersion = activeSheet.version

  useEffect(() => {
    hasBootstrappedForAppIdRef.current = { appId, done: false }
  }, [appId])

  useEffect(() => {
    let cancelled = false

    const setBootstrapState = (snapshot: Record<string, unknown> | null, seed: string) => {
      if (cancelled) return
      setBootstrapSnapshot(snapshot)
      setBootstrapSnapshotSeed(seed)
      setIsBootstrapSnapshotLoading(false)
    }

    const loadBootstrapSnapshot = async () => {
      setIsBootstrapCanonicalReady(false)
      setIsBootstrapWorkbookEnriching(false)
      setIsBootstrapWorkbookSyncFailed(false)

      if (entityEnabled) {
        setBootstrapState(null, 'entity-data-source')
        setIsBootstrapCanonicalReady(true)
        return
      }
      if (!activeSheetId) {
        setBootstrapState(null, 'no-sheet')
        return
      }

      if (
        preferUniverNativeSheetTabs &&
        hasBootstrappedForAppIdRef.current.appId === appId &&
        hasBootstrappedForAppIdRef.current.done
      ) {
        setIsBootstrapSnapshotLoading(false)
        setIsBootstrapCanonicalReady(true)
        return
      }

      setIsBootstrapSnapshotLoading(true)

      let minVersion = Number(activeSheetVersion ?? 0)

      const previewCache = readUniverSnapshotCacheForBootstrap(appId, activeSheetId, minVersion)

      const applyBootstrapLoaderResult = (
        canonicalSheetMeta: SpreadsheetSheet,
        canonicalRows: Record<string, unknown>[],
        result: BootstrapSnapshotLoaderResult,
        activeSheetIdLocal: string
      ): void => {
        workbookSnapshotVersionRef.current = Math.max(workbookSnapshotVersionRef.current, result.version)
        workbookSnapshotCoversVersionsRef.current = mergeSnapshotCoversVersions(
          workbookSnapshotCoversVersionsRef.current,
          result.coversVersions
        )

        const canonicalMin = Math.trunc(minVersion)
        const loaderCoverageVersion = getSheetCoverageVersion(result.coversVersions, activeSheetIdLocal)
        const loaderMeetsCanonicalSheet =
          Number.isFinite(canonicalMin) &&
          Number.isFinite(loaderCoverageVersion) &&
          loaderCoverageVersion >= canonicalMin
        const formattingDonorMinWorkbookVersion = loaderMeetsCanonicalSheet ? result.version : undefined

        const mergeOutcome = computeBootstrapSnapshotMergeOutcome({
          preferUniverNativeSheetTabs,
          loaderSnapshot: result.snapshot,
          canonicalSheetMeta,
          canonicalRows,
          appId,
          activeSheetId: activeSheetIdLocal,
          appSheets,
          formattingDonorMinWorkbookVersion
        })
        const { snapshotForBootstrap, rowOverlayChanged, formattingEnriched } = mergeOutcome
        const snapshotWithCoverage =
          snapshotForBootstrap && typeof snapshotForBootstrap === 'object'
            ? attachSnapshotCoversVersions(snapshotForBootstrap as Record<string, unknown>, result.coversVersions)
            : null

        spreadsheetSession.updateWorkbookSnapshot(snapshotWithCoverage, result.version)
        if (cancelled) return
        setBootstrapSnapshot(snapshotWithCoverage)
        setBootstrapSnapshotSeed(result.seed)

        if (snapshotWithCoverage && (rowOverlayChanged || formattingEnriched)) {
          writeUniverSnapshotCache(
            appId,
            result.version,
            stripWorkbookSnapshotValuesPreservingFormatting(snapshotWithCoverage)
          )
          debugLog('bootstrap snapshot merge applied', {
            appId,
            sheetId: activeSheetIdLocal,
            source: result.source,
            rowOverlayChanged,
            formattingEnriched,
            canonicalVersion: canonicalMin,
            checkpointCoverageVersion: loaderCoverageVersion,
            workbookSnapshotVersion: result.version,
            hasCoverageForSheet: Object.prototype.hasOwnProperty.call(result.coversVersions, activeSheetIdLocal),
            snapshotHasFormatting: snapshotHasFormattingSignal(snapshotWithCoverage)
          })
        }
        debugLog('bootstrap snapshot candidate selected', {
          appId,
          sheetId: activeSheetIdLocal,
          source: result.source,
          canonicalVersion: canonicalMin,
          checkpointCoverageVersion: loaderCoverageVersion,
          workbookSnapshotVersion: result.version,
          hasCoverageForSheet: Object.prototype.hasOwnProperty.call(result.coversVersions, activeSheetIdLocal),
          snapshotHasFormatting: snapshotHasFormattingSignal(snapshotWithCoverage),
          formattingEnriched,
          rowOverlayChanged,
          cacheStored: result.cacheWrite?.stored,
          cacheReason: result.cacheWrite?.reason,
          minVersion
        })
      }

      try {
        const canonicalSnapshot = await SpreadsheetApiService.getSheetSnapshot(appId, activeSheetId)
        if (cancelled) return

        const canonicalSheetMeta = (canonicalSnapshot.sheet as unknown as SpreadsheetSheet | undefined) ?? activeSheet
        const canonicalRows = sortSpreadsheetRowsBySheetSettings(
          mapSnapshotRowsToViewerRows(canonicalSnapshot.rows || []),
          canonicalSheetMeta
        )
        const canonicalVersion = Number(canonicalSnapshot.version ?? minVersion)
        minVersion = Number.isFinite(canonicalVersion) ? canonicalVersion : minVersion

        seedActiveSheetState(canonicalSheetMeta, canonicalRows, {
          version: minVersion,
          setAsActive: true,
          markPersisted: true
        })
        peerSheetDataCacheRef.current.set(activeSheetId, canonicalRows)
        authoritativePeerSheetDataCacheRef.current.add(activeSheetId)

        setIsBootstrapCanonicalReady(true)

        const cacheFirst = tryLoadBootstrapSnapshotFromCache(appId, activeSheetId, minVersion)

        if (cacheFirst) {
          applyBootstrapLoaderResult(canonicalSheetMeta, canonicalRows, cacheFirst, activeSheetId)
          if (!cancelled) {
            setIsBootstrapSnapshotLoading(false)
            setIsBootstrapWorkbookEnriching(true)
          }
          try {
            const reconciled = await fetchBootstrapSnapshotRemoteComparedToBaseline(
              appId,
              activeSheetId,
              minVersion,
              cacheFirst
            )
            if (cancelled) return
            if (reconciled !== cacheFirst) {
              applyBootstrapLoaderResult(canonicalSheetMeta, canonicalRows, reconciled, activeSheetId)
            }
          } catch (reconcileErr) {
            console.error('[SpreadsheetAppViewer] Background Univer snapshot reconcile failed:', reconcileErr)
            onBootstrapWorkbookReconcileIssue?.({ phase: 'reconcile', error: reconcileErr })
            try {
              const fallbackRemote = await fetchBootstrapSnapshotRemoteComparedToBaseline(
                appId,
                activeSheetId,
                minVersion,
                null
              )
              if (cancelled) return
              if (fallbackRemote !== cacheFirst) {
                applyBootstrapLoaderResult(canonicalSheetMeta, canonicalRows, fallbackRemote, activeSheetId)
              }
            } catch (fallbackErr) {
              console.error(
                '[SpreadsheetAppViewer] Univer snapshot remote fallback after reconcile failed:',
                fallbackErr
              )
              onBootstrapWorkbookReconcileIssue?.({ phase: 'fallback', error: fallbackErr })
              if (!cancelled) setIsBootstrapWorkbookSyncFailed(true)
            }
          } finally {
            if (!cancelled) setIsBootstrapWorkbookEnriching(false)
          }
        } else {
          const result = await loadBootstrapSnapshotData(appId, activeSheetId, minVersion)
          if (cancelled) return
          applyBootstrapLoaderResult(canonicalSheetMeta, canonicalRows, result, activeSheetId)
          setIsBootstrapSnapshotLoading(false)
        }

        if (preferUniverNativeSheetTabs) {
          hasBootstrappedForAppIdRef.current = { appId, done: true }
        }
      } catch (error) {
        if (cancelled) return
        onBootstrapWorkbookReconcileIssue?.({ phase: 'canonical', error })
        if (!cancelled) setIsBootstrapWorkbookSyncFailed(true)
        const previewSnapshot =
          previewCache?.snapshot && typeof previewCache.snapshot === 'object'
            ? stripWorkbookSnapshotValuesPreservingFormatting(previewCache.snapshot as Record<string, unknown>)
            : null
        if (previewSnapshot) {
          setBootstrapState(previewSnapshot, `preview-fallback-v${previewCache?.version ?? minVersion}`)
        } else {
          setBootstrapState(null, `rows-fallback-error-v${minVersion}`)
        }
        setIsBootstrapCanonicalReady(true)
        setIsBootstrapWorkbookEnriching(false)
        console.error('[SpreadsheetAppViewer] Failed to load backend Univer snapshot:', error)
      }
    }

    void loadBootstrapSnapshot()
    return () => {
      cancelled = true
    }
  }, [
    activeSheetId,
    activeSheetVersion,
    appId,
    appSheets,
    authoritativePeerSheetDataCacheRef,
    debugLog,
    entityEnabled,
    mapSnapshotRowsToViewerRows,
    peerSheetDataCacheRef,
    preferUniverNativeSheetTabs,
    seedActiveSheetState,
    spreadsheetSession,
    workbookSnapshotVersionRef,
    onBootstrapWorkbookReconcileIssue
  ])

  return {
    bootstrapSnapshot,
    setBootstrapSnapshot,
    bootstrapSnapshotSeed,
    setBootstrapSnapshotSeed,
    isBootstrapSnapshotLoading,
    setIsBootstrapSnapshotLoading,
    isBootstrapCanonicalReady,
    isBootstrapWorkbookEnriching,
    isBootstrapWorkbookSyncFailed,
    hasBootstrappedForAppIdRef
  }
}
