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
  chooseBootstrapWorkbookCandidate,
  computeBootstrapSnapshotMergeOutcome,
  fetchBootstrapSnapshotRemoteComparedToBaseline,
  loadBootstrapSnapshotData,
  tryLoadBootstrapSnapshotFromCache,
  type BootstrapSnapshotLoaderResult,
  validateActiveSheetBootstrapSnapshot
} from '../utils/spreadsheetBootstrapSnapshotHelpers'
import { readUniverSnapshotCacheForBootstrap, writeUniverSnapshotCache } from '../utils/univerSnapshotCache'

export type BootstrapWorkbookReconcileIssuePhase = 'reconcile' | 'fallback' | 'canonical'

export type BootstrapVisualMountKind =
  | 'none'
  | 'hydration_snapshot'
  | 'rows_built'
  | 'cache_enriched'
  | 'remote_enriched'
  | 'preview_fallback'
  | 'entity_data_source'

export type BootstrapVisualValueSource = 'hydration' | 'rows_built' | 'preview_cache' | 'entity'

export type BootstrapVisualFormattingSource = 'hydration' | 'cache' | 'remote' | 'preview_cache' | 'missing' | 'entity'

export type BootstrapVisibleApplyDecision = 'mount_now' | 'visible_style_repair' | 'session_only' | 'reject'

export interface BootstrapVisibleStyleRepair {
  sheetId: string
  snapshot: Record<string, unknown>
  formattingSource: BootstrapVisualFormattingSource
  formattingScore: number
  nonce: number
}

export interface VisualBootstrapState {
  sheetId: string
  mountKind: BootstrapVisualMountKind
  valueSource: BootstrapVisualValueSource
  formattingSource: BootstrapVisualFormattingSource
  formattingScore: number
  validationSafety: 'unsafe' | 'repairable' | 'safe' | null
  visibleDecision: BootstrapVisibleApplyDecision
  needsVisibleStyleRepair: boolean
  hasMountedSnapshot: boolean
}

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
  visualBootstrapState: VisualBootstrapState
  pendingBootstrapStyleRepair: BootstrapVisibleStyleRepair | null
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
  const [visualBootstrapState, setVisualBootstrapState] = useState<VisualBootstrapState>({
    sheetId: activeSheetId,
    mountKind: 'none',
    valueSource: entityEnabled ? 'entity' : 'rows_built',
    formattingSource: entityEnabled ? 'entity' : 'missing',
    formattingScore: 0,
    validationSafety: null,
    visibleDecision: 'session_only',
    needsVisibleStyleRepair: false,
    hasMountedSnapshot: false
  })
  const [pendingBootstrapStyleRepair, setPendingBootstrapStyleRepair] = useState<BootstrapVisibleStyleRepair | null>(
    null
  )
  const hasBootstrappedForAppIdRef = useRef<{ appId: string | null; done: boolean }>({
    appId: null,
    done: false
  })
  const visualBootstrapStateRef = useRef<VisualBootstrapState>(visualBootstrapState)
  visualBootstrapStateRef.current = visualBootstrapState
  const visibleSnapshotRemountCounterRef = useRef(0)
  const bootstrapStyleRepairNonceRef = useRef(0)
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
      setPendingBootstrapStyleRepair(null)

      if (entityEnabled) {
        setBootstrapState(null, 'entity-data-source')
        setVisualBootstrapState({
          sheetId: activeSheetId,
          mountKind: 'entity_data_source',
          valueSource: 'entity',
          formattingSource: 'entity',
          formattingScore: 0,
          validationSafety: null,
          visibleDecision: 'mount_now',
          needsVisibleStyleRepair: false,
          hasMountedSnapshot: false
        })
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

      const applyVisualBootstrapState = (nextState: VisualBootstrapState): void => {
        if (cancelled) return
        visualBootstrapStateRef.current = nextState
        setVisualBootstrapState(nextState)
        debugLog('bootstrap visual state decided', {
          sheetId: nextState.sheetId,
          mountKind: nextState.mountKind,
          valueSource: nextState.valueSource,
          formattingSource: nextState.formattingSource,
          formattingScore: nextState.formattingScore,
          validationSafety: nextState.validationSafety,
          visibleDecision: nextState.visibleDecision,
          needsVisibleStyleRepair: nextState.needsVisibleStyleRepair,
          hasMountedSnapshot: nextState.hasMountedSnapshot
        })
      }

      const safetyRank = (safety: VisualBootstrapState['validationSafety']): number => {
        if (safety === 'safe') return 2
        if (safety === 'repairable') return 1
        if (safety === 'unsafe') return 0
        return -1
      }

      const previewCache = readUniverSnapshotCacheForBootstrap(appId, activeSheetId, minVersion)

      const prepareBootstrapLoaderCandidate = (
        canonicalSheetMeta: SpreadsheetSheet,
        canonicalRows: Record<string, unknown>[],
        result: BootstrapSnapshotLoaderResult,
        activeSheetIdLocal: string,
        formattingSourceOverride?: BootstrapVisualFormattingSource
      ) => {
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
        const validation = validateActiveSheetBootstrapSnapshot({
          snapshot: snapshotWithCoverage,
          activeSheetId: activeSheetIdLocal,
          canonicalSheetMeta,
          canonicalRows
        })

        return {
          result,
          activeSheetIdLocal,
          formattingSource:
            formattingSourceOverride ??
            (result.source === 'cache' ? 'cache' : result.source === 'remote' ? 'remote' : 'missing'),
          canonicalMin,
          loaderCoverageVersion,
          rowOverlayChanged,
          formattingEnriched,
          snapshotWithCoverage,
          validation
        }
      }

      const choosePreferredPreparedCandidate = (
        current: ReturnType<typeof prepareBootstrapLoaderCandidate> | null,
        candidate: ReturnType<typeof prepareBootstrapLoaderCandidate> | null
      ): ReturnType<typeof prepareBootstrapLoaderCandidate> | null => {
        if (!candidate || !candidate.validation.valid) return current
        if (!current || !current.validation.valid) return candidate
        const candidateSafety = safetyRank(candidate.validation.safety)
        const currentSafety = safetyRank(current.validation.safety)
        if (candidateSafety !== currentSafety) {
          return candidateSafety > currentSafety ? candidate : current
        }
        if (candidate.validation.formattingScore !== current.validation.formattingScore) {
          return candidate.validation.formattingScore > current.validation.formattingScore ? candidate : current
        }
        if (current.formattingSource === 'hydration' && candidate.formattingSource !== 'hydration') {
          return current
        }
        if (candidate.formattingSource === 'hydration' && current.formattingSource !== 'hydration') {
          return candidate
        }
        if (candidate.loaderCoverageVersion !== current.loaderCoverageVersion) {
          return candidate.loaderCoverageVersion > current.loaderCoverageVersion ? candidate : current
        }
        if (candidate.result.version !== current.result.version) {
          return candidate.result.version > current.result.version ? candidate : current
        }
        return current
      }

      const decidePreparedBootstrapCandidateApplication = (
        prepared: ReturnType<typeof prepareBootstrapLoaderCandidate>,
        options: {
          currentVisualState: VisualBootstrapState
          initialMount: boolean
          valueSource: BootstrapVisualValueSource
        }
      ): {
        decision: BootstrapVisibleApplyDecision
        mountKind: BootstrapVisualMountKind
        formattingSource: BootstrapVisualFormattingSource
      } => {
        if (!prepared.validation.valid || !prepared.snapshotWithCoverage) {
          return {
            decision: 'reject',
            mountKind: options.currentVisualState.mountKind,
            formattingSource: options.currentVisualState.formattingSource
          }
        }

        const nextFormattingSource = prepared.formattingSource
        const nextFormattingScore = prepared.validation.formattingScore
        if (options.initialMount) {
          if (nextFormattingSource !== 'hydration' && nextFormattingScore <= 0) {
            return {
              decision: 'session_only',
              mountKind: options.currentVisualState.mountKind,
              formattingSource: options.currentVisualState.formattingSource
            }
          }
          const mountKind =
            nextFormattingSource === 'hydration'
              ? 'hydration_snapshot'
              : nextFormattingSource === 'cache'
                ? 'cache_enriched'
                : 'remote_enriched'
          return {
            decision: 'mount_now',
            mountKind,
            formattingSource: nextFormattingSource
          }
        }

        if (!options.currentVisualState.hasMountedSnapshot && nextFormattingScore > 0) {
          return {
            decision: 'mount_now',
            mountKind: nextFormattingSource === 'cache' ? 'cache_enriched' : 'remote_enriched',
            formattingSource: nextFormattingSource
          }
        }

        if (
          nextFormattingScore > options.currentVisualState.formattingScore &&
          safetyRank(prepared.validation.safety) >= safetyRank(options.currentVisualState.validationSafety)
        ) {
          return {
            decision: 'visible_style_repair',
            mountKind: options.currentVisualState.mountKind,
            formattingSource: nextFormattingSource
          }
        }

        return {
          decision: 'session_only',
          mountKind: options.currentVisualState.mountKind,
          formattingSource: options.currentVisualState.formattingSource
        }
      }

      const acceptPreparedBootstrapCandidate = (
        prepared: ReturnType<typeof prepareBootstrapLoaderCandidate>,
        options: {
          decision: BootstrapVisibleApplyDecision
          mountKind: BootstrapVisualMountKind
          valueSource: BootstrapVisualValueSource
          formattingSource: BootstrapVisualFormattingSource
          initialMount?: boolean
        }
      ): void => {
        const {
          result,
          activeSheetIdLocal,
          canonicalMin,
          loaderCoverageVersion,
          rowOverlayChanged,
          formattingEnriched,
          snapshotWithCoverage,
          validation
        } = prepared
        if (!snapshotWithCoverage || !validation.valid || options.decision === 'reject') return

        workbookSnapshotVersionRef.current = Math.max(workbookSnapshotVersionRef.current, result.version)
        workbookSnapshotCoversVersionsRef.current = mergeSnapshotCoversVersions(
          workbookSnapshotCoversVersionsRef.current,
          result.coversVersions
        )

        spreadsheetSession.updateWorkbookSnapshot(snapshotWithCoverage, result.version)
        if (cancelled) return
        if (options.decision === 'mount_now') {
          const nextSeed =
            options.initialMount === true
              ? result.seed
              : `${result.seed}-visible-${(visibleSnapshotRemountCounterRef.current += 1)}`
          setBootstrapSnapshot(snapshotWithCoverage)
          setBootstrapSnapshotSeed(nextSeed)
        } else if (options.decision === 'visible_style_repair') {
          setBootstrapSnapshot(snapshotWithCoverage)
          setPendingBootstrapStyleRepair({
            sheetId: activeSheetIdLocal,
            snapshot: snapshotWithCoverage,
            formattingSource: options.formattingSource,
            formattingScore: validation.formattingScore,
            nonce: ++bootstrapStyleRepairNonceRef.current
          })
        }

        if (options.decision !== 'session_only') {
          applyVisualBootstrapState({
            sheetId: activeSheetIdLocal,
            mountKind: options.mountKind,
            valueSource: options.valueSource,
            formattingSource: options.formattingSource,
            formattingScore: validation.formattingScore,
            validationSafety: validation.safety,
            visibleDecision: options.decision,
            needsVisibleStyleRepair: options.decision === 'visible_style_repair',
            hasMountedSnapshot:
              options.decision === 'mount_now' ? true : visualBootstrapStateRef.current.hasMountedSnapshot
          })
        }

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
          validationSafety: validation.safety,
          validationReason: validation.reason,
          visibleDecision: options.decision,
          valueSource: options.valueSource,
          formattingSource: options.formattingSource,
          cacheStored: result.cacheWrite?.stored,
          cacheReason: result.cacheWrite?.reason,
          minVersion
        })
      }

      const rejectPreparedBootstrapCandidate = (
        prepared: ReturnType<typeof prepareBootstrapLoaderCandidate>,
        activeSheetIdLocal: string
      ): void => {
        debugLog('bootstrap snapshot candidate rejected', {
          appId,
          sheetId: activeSheetIdLocal,
          source: prepared.result.source,
          canonicalVersion: prepared.canonicalMin,
          checkpointCoverageVersion: prepared.loaderCoverageVersion,
          workbookSnapshotVersion: prepared.result.version,
          validationSafety: prepared.validation.safety,
          validationReason: prepared.validation.reason,
          hasCoverageForSheet: Object.prototype.hasOwnProperty.call(prepared.result.coversVersions, activeSheetIdLocal),
          minVersion
        })
      }

      const buildValidatedCandidateSelector =
        (canonicalSheetMeta: SpreadsheetSheet, canonicalRows: Record<string, unknown>[], activeSheetIdLocal: string) =>
        ({
          activeSheetId: selectorSheetId,
          minVersion: selectorMinVersion,
          baseline,
          remoteResult
        }: {
          activeSheetId: string
          minVersion: number
          baseline: BootstrapSnapshotLoaderResult
          remoteResult: BootstrapSnapshotLoaderResult
        }): BootstrapSnapshotLoaderResult => {
          const baselinePrepared = prepareBootstrapLoaderCandidate(
            canonicalSheetMeta,
            canonicalRows,
            baseline,
            activeSheetIdLocal
          )
          const remotePrepared = prepareBootstrapLoaderCandidate(
            canonicalSheetMeta,
            canonicalRows,
            remoteResult,
            activeSheetIdLocal
          )
          return chooseBootstrapWorkbookCandidate({
            activeSheetId: selectorSheetId,
            minVersion: selectorMinVersion,
            baseline,
            remoteResult,
            baselineValidationResult: baselinePrepared.validation,
            remoteValidationResult: remotePrepared.validation
          })
        }

      try {
        const canonicalSnapshot = await SpreadsheetApiService.getSheetHydrationSnapshot(appId, activeSheetId)
        if (cancelled) return

        const canonicalSheetMeta = (canonicalSnapshot.sheet as unknown as SpreadsheetSheet | undefined) ?? activeSheet
        const canonicalRows = sortSpreadsheetRowsBySheetSettings(
          mapSnapshotRowsToViewerRows(canonicalSnapshot.rows || []),
          canonicalSheetMeta
        )
        const canonicalVersion = Number(canonicalSnapshot.operationVersion ?? minVersion)
        minVersion = Number.isFinite(canonicalVersion) ? canonicalVersion : minVersion
        const validatedCandidateSelector = buildValidatedCandidateSelector(
          canonicalSheetMeta,
          canonicalRows,
          activeSheetId
        )

        seedActiveSheetState(canonicalSheetMeta, canonicalRows, {
          version: minVersion,
          setAsActive: true,
          markPersisted: true
        })
        peerSheetDataCacheRef.current.set(activeSheetId, canonicalRows)
        authoritativePeerSheetDataCacheRef.current.add(activeSheetId)

        setIsBootstrapCanonicalReady(true)
        let establishedInitialMount = false
        const cacheFirst = tryLoadBootstrapSnapshotFromCache(appId, activeSheetId, minVersion)
        let prefetchedBootstrapResult: BootstrapSnapshotLoaderResult | null = null
        let bestInitialPrepared: ReturnType<typeof prepareBootstrapLoaderCandidate> | null = null
        if (canonicalSnapshot.worksheetSnapshot) {
          const hydratedBootstrapSnapshot = attachSnapshotCoversVersions(
            {
              sheetOrder: (appSheets ?? [canonicalSheetMeta]).map(sheet => sheet.id),
              sheets: {
                [activeSheetId]: canonicalSnapshot.worksheetSnapshot
              },
              ...(canonicalSnapshot.workbookDependencies ?? {}),
              __meta: {
                workbookSnapshotVersion: canonicalSnapshot.workbookSnapshotVersion,
                sheetSnapshots: {
                  [activeSheetId]: {
                    snapshotVersion: canonicalSnapshot.sheetSnapshotVersion,
                    coversOperationVersion: canonicalVersion,
                    persistedInWorkbookSnapshotVersion: canonicalSnapshot.workbookSnapshotVersion
                  }
                }
              }
            } as Record<string, unknown>,
            { [activeSheetId]: canonicalVersion }
          )
          if (hydratedBootstrapSnapshot) {
            const hydrationPrepared = prepareBootstrapLoaderCandidate(
              canonicalSheetMeta,
              canonicalRows,
              {
                snapshot: hydratedBootstrapSnapshot,
                seed: `sheet-hydration-v${canonicalVersion}`,
                source: 'remote',
                version: Math.trunc(Number(canonicalSnapshot.workbookSnapshotVersion ?? 0)),
                updatedAt: null,
                coversVersions: { [activeSheetId]: canonicalVersion }
              },
              activeSheetId,
              'hydration'
            )
            if (hydrationPrepared.validation.valid) {
              bestInitialPrepared = choosePreferredPreparedCandidate(bestInitialPrepared, hydrationPrepared)
            } else {
              rejectPreparedBootstrapCandidate(hydrationPrepared, activeSheetId)
            }
          }
        }

        if (cacheFirst) {
          const preparedCacheFirst = prepareBootstrapLoaderCandidate(
            canonicalSheetMeta,
            canonicalRows,
            cacheFirst,
            activeSheetId
          )
          if (preparedCacheFirst.validation.valid) {
            bestInitialPrepared = choosePreferredPreparedCandidate(bestInitialPrepared, preparedCacheFirst)
          }
        }

        if (!bestInitialPrepared || bestInitialPrepared.validation.formattingScore === 0) {
          prefetchedBootstrapResult = await loadBootstrapSnapshotData(appId, activeSheetId, minVersion, {
            selectCandidate: validatedCandidateSelector
          })
          if (cancelled) return
          const preparedPrefetched = prepareBootstrapLoaderCandidate(
            canonicalSheetMeta,
            canonicalRows,
            prefetchedBootstrapResult,
            activeSheetId
          )
          if (preparedPrefetched.validation.valid) {
            bestInitialPrepared = choosePreferredPreparedCandidate(bestInitialPrepared, preparedPrefetched)
          } else {
            rejectPreparedBootstrapCandidate(preparedPrefetched, activeSheetId)
          }
        }

        if (bestInitialPrepared) {
          const initialDecision = decidePreparedBootstrapCandidateApplication(bestInitialPrepared, {
            currentVisualState: visualBootstrapStateRef.current,
            initialMount: true,
            valueSource: 'hydration'
          })
          if (initialDecision.decision === 'mount_now') {
            acceptPreparedBootstrapCandidate(bestInitialPrepared, {
              decision: initialDecision.decision,
              mountKind: initialDecision.mountKind,
              valueSource: 'hydration',
              formattingSource: initialDecision.formattingSource,
              initialMount: true
            })
            if (!cancelled) {
              setIsBootstrapSnapshotLoading(false)
              establishedInitialMount = true
            }
          }
        }

        if (!establishedInitialMount && !cancelled) {
          setBootstrapState(null, `rows-hydration-v${canonicalVersion}`)
          applyVisualBootstrapState({
            sheetId: activeSheetId,
            mountKind: 'rows_built',
            valueSource: 'hydration',
            formattingSource: 'missing',
            formattingScore: 0,
            validationSafety: null,
            visibleDecision: 'mount_now',
            needsVisibleStyleRepair: false,
            hasMountedSnapshot: false
          })
          establishedInitialMount = true
        }

        if (!cancelled) {
          setIsBootstrapWorkbookEnriching(true)
        }

        if (cacheFirst) {
          try {
            const reconciled =
              prefetchedBootstrapResult ??
              (await fetchBootstrapSnapshotRemoteComparedToBaseline(appId, activeSheetId, minVersion, cacheFirst, {
                selectCandidate: validatedCandidateSelector
              }))
            if (cancelled) return
            const preparedReconciled = prepareBootstrapLoaderCandidate(
              canonicalSheetMeta,
              canonicalRows,
              reconciled,
              activeSheetId
            )
            if (preparedReconciled.validation.valid) {
              const decision = decidePreparedBootstrapCandidateApplication(preparedReconciled, {
                currentVisualState: visualBootstrapStateRef.current,
                initialMount: false,
                valueSource: 'hydration'
              })
              acceptPreparedBootstrapCandidate(preparedReconciled, {
                decision: decision.decision,
                mountKind: decision.mountKind,
                valueSource: 'hydration',
                formattingSource: decision.formattingSource
              })
            } else {
              rejectPreparedBootstrapCandidate(preparedReconciled, activeSheetId)
            }
          } catch (reconcileErr) {
            console.error('[SpreadsheetAppViewer] Background Univer snapshot reconcile failed:', reconcileErr)
            onBootstrapWorkbookReconcileIssue?.({ phase: 'reconcile', error: reconcileErr })
            try {
              const fallbackRemote = await fetchBootstrapSnapshotRemoteComparedToBaseline(
                appId,
                activeSheetId,
                minVersion,
                null,
                { selectCandidate: validatedCandidateSelector }
              )
              if (cancelled) return
              const preparedFallback = prepareBootstrapLoaderCandidate(
                canonicalSheetMeta,
                canonicalRows,
                fallbackRemote,
                activeSheetId
              )
              if (preparedFallback.validation.valid) {
                const decision = decidePreparedBootstrapCandidateApplication(preparedFallback, {
                  currentVisualState: visualBootstrapStateRef.current,
                  initialMount: false,
                  valueSource: 'hydration'
                })
                acceptPreparedBootstrapCandidate(preparedFallback, {
                  decision: decision.decision,
                  mountKind: decision.mountKind,
                  valueSource: 'hydration',
                  formattingSource: decision.formattingSource
                })
              } else {
                rejectPreparedBootstrapCandidate(preparedFallback, activeSheetId)
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
          const result =
            prefetchedBootstrapResult ??
            (await loadBootstrapSnapshotData(appId, activeSheetId, minVersion, {
              selectCandidate: validatedCandidateSelector
            }))
          if (cancelled) return
          const preparedResult = prepareBootstrapLoaderCandidate(
            canonicalSheetMeta,
            canonicalRows,
            result,
            activeSheetId
          )
          if (preparedResult.validation.valid) {
            const decision = decidePreparedBootstrapCandidateApplication(preparedResult, {
              currentVisualState: visualBootstrapStateRef.current,
              initialMount: false,
              valueSource: 'hydration'
            })
            acceptPreparedBootstrapCandidate(preparedResult, {
              decision: decision.decision,
              mountKind: decision.mountKind,
              valueSource: 'hydration',
              formattingSource: decision.formattingSource
            })
          } else {
            rejectPreparedBootstrapCandidate(preparedResult, activeSheetId)
          }
          setIsBootstrapWorkbookEnriching(false)
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
          applyVisualBootstrapState({
            sheetId: activeSheetId,
            mountKind: 'preview_fallback',
            valueSource: 'preview_cache',
            formattingSource: 'preview_cache',
            formattingScore: snapshotHasFormattingSignal(previewSnapshot) ? 1 : 0,
            validationSafety: null,
            visibleDecision: 'mount_now',
            needsVisibleStyleRepair: false,
            hasMountedSnapshot: true
          })
        } else {
          setBootstrapState(null, `rows-fallback-error-v${minVersion}`)
          applyVisualBootstrapState({
            sheetId: activeSheetId,
            mountKind: 'rows_built',
            valueSource: 'rows_built',
            formattingSource: 'missing',
            formattingScore: 0,
            validationSafety: null,
            visibleDecision: 'mount_now',
            needsVisibleStyleRepair: false,
            hasMountedSnapshot: false
          })
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
    visualBootstrapState,
    pendingBootstrapStyleRepair,
    hasBootstrappedForAppIdRef
  }
}
