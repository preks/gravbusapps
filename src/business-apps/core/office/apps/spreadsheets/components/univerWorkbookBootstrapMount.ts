import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US'
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets'
import {
  buildWorkbookSnapshot,
  createUniverConversionContext,
  transformAvatarFormulasInSnapshot,
  type UniverWorkbookSnapshot
} from '../utils/univerAdapter'
import { sanitizeUniverWorkbookSnapshotForBootstrap } from '../utils/sanitizeUniverWorkbookSnapshot'
import { debugUniverInit } from './univerGridDebug'
import { buildAuthoritativeCellSignatureMap, getAuthoritativeGridRowExtent } from './univerGridAuthoritativeHelpers'
import { consumeSpreadsheetAutofillIntent, peekSpreadsheetAutofillIntent } from './univerAutofillIntent'
import {
  registerUniverMountSheetValueAndEditListeners,
  resolveEmitSerializationKey,
  runDetectedCellMutationThroughCoordinator,
  type DeferredDirtyCell
} from './univerMountSheetValueAndEditListeners'
import { deriveCellMatrixFromRanges } from '../utils/univerWorksheetCellRead'
import { isCurrentFacadeWorksheet } from './univerGridWorkbookMutationModule'
import { registerUniverMountBeforeCommandSheetStructure } from './univerMountBeforeCommandSheetStructure'
import { registerUniverMountCommandExecuted } from './univerMountCommandExecuted'
import { attachUniverMountSnapshotCheckpointHandlers } from './univerMountSnapshotCheckpoint'
import { registerUniverMountCursorEmit } from './univerMountCursorEmit'
import { registerUniverMountScrollSync } from './univerMountScrollSync'
import { createUniverMountWorksheetSelectionChrome } from './univerMountWorksheetSelectionChrome'
import { createUniverMountHandleDetectedCellMutation } from './univerMountHandleDetectedCellMutation'
import type { UniverWorkbookBootstrapMountContext } from './univerWorkbookBootstrapMountContext'
import { UNIVER_DE_LOCALE, scheduleApplyGermanNumfmtLocale } from './univerGridLocaleChrome'
import type { SnapshotDimensions } from './univerGridInternalTypes'
import {
  areSnapshotDimensionsEqual,
  extractDimensionsFromSnapshot,
  extractWorkbookStylesFromSnapshot
} from './univerGridSnapshotDimensions'
import { stripWorksheetValueKeys, worksheetHasCopyPayload } from './univerGridWorkbookMutationModule'

export function mountUniverWorkbookBootstrap(ctx: UniverWorkbookBootstrapMountContext): (() => void) | undefined {
  const {
    gridHostEl,
    gridHostReady,
    props,
    sheet,
    appLocale,
    supportedUniverFonts,
    flushQueuedSnapshotRequest,
    isMountAlive,
    containerRef,
    getWorkbookSnapshotRef,
    toCellDimensionsPayload,
    univerAPIRef,
    remoteEchoSuppressionRef,
    isApplyingRemoteUpdateRef,
    isDirtyRef,
    hasEditedRef,
    lastCellValueMutationAtRef,
    snapshotRequestInFlightRef,
    snapshotRequestQueuedRef,
    snapshotCheckpointTimerRef,
    snapshotCheckpointScheduledAtRef,
    snapshotFirstDirtyAtRef,
    snapshotLastRequestedAtRef,
    snapshotLifecycleOriginRef,
    snapshotDirtyVersionRef,
    requestSnapshotCheckpointRef,
    scheduleSnapshotCheckpointRef,
    lastSyncedGridCellSignaturesRef,
    collabPersistedBulkApplyDepthRef,
    bulkApplyClearDeferredDirtyCellsRef,
    flushDeferredDirtyCellsRef,
    lastSyncedGridRowCountRef,
    lastSyncedGridColumnCountRef,
    lastProcessedAuthoritativeDataSyncTokenRef,
    skipNextAuthoritativeSyncAfterSnapshotInitRef,
    newRowClientIdByIndexRef,
    recentLocalMutationSignaturesRef,
    lastClearAllEmitAtBySignatureRef,
    lastClearFormatEmitAtBySignatureRef,
    lastFeatureEmitAtBySignatureRef,
    pendingFreezeClearEmitTimeoutBySheetRef,
    activeSelectionRef,
    copiedSelectionAnchorRef,
    pendingCutCellRangeRef,
    cutPasteCollabSuppressUntilMsRef,
    mergeGestureSuppressBySheetRef,
    pendingFormattingPasteIntentRef,
    pendingAutofillIntentRef,
    contextRef,
    propsRef,
    lastUniverInitDepsRef,
    callbacksRef,
    readOnlyRef,
    lastEmittedCursorPathRef,
    lastEmittedWorksheetIdRef,
    univerBootstrapCompleteRef,
    recentSheetMutationIdsRef,
    recentlyDuplicatedWorksheetIdsRef,
    rewrittenWorksheetIdsRef,
    cellDimensionsRef,
    sheetScrollRef,
    refreshCursorRectsRef,
    refreshCommentRectsRef,
    updateCellDimensionsRef,
    mutationEmitTailCoordinator
  } = ctx

  if (!gridHostEl || !gridHostReady) return
  let disposed = false
  const isBootstrapAlive = () => !disposed && isMountAlive()
  const emitInitLifecycle = (
    phase:
      | 'bootstrap_started'
      | 'bootstrap_succeeded'
      | 'bootstrap_failed'
      | 'canvas_ready'
      | 'canvas_timeout'
      | 'disposed',
    detail?: { reason?: string; message?: string; width?: number; height?: number }
  ): void => {
    const box = gridHostEl.getBoundingClientRect()
    props.onInitLifecycle?.({
      phase,
      sheetId: sheet.id,
      workbookInstanceKey: props.workbookInstanceKey,
      snapshotSeed: props.snapshotSeed,
      width: detail?.width ?? box.width,
      height: detail?.height ?? box.height,
      reason: detail?.reason,
      message: detail?.message
    })
  }
  const initDeps = {
    workbookInstanceKey: props.workbookInstanceKey,
    snapshotSeed: props.snapshotSeed,
    isReadOnly: props.isReadOnly,
    gridHostElConnected: gridHostEl.isConnected,
    appLocale
  }
  const previousInitDeps = lastUniverInitDepsRef.current
  lastUniverInitDepsRef.current = initDeps
  debugUniverInit('create_requested', {
    sheetId: sheet.id,
    changedDeps: previousInitDeps
      ? Object.keys(initDeps).filter(
          key => initDeps[key as keyof typeof initDeps] !== previousInitDeps[key as keyof typeof previousInitDeps]
        )
      : ['initial'],
    workbookInstanceKey: initDeps.workbookInstanceKey,
    snapshotSeed: initDeps.snapshotSeed,
    isReadOnly: initDeps.isReadOnly,
    gridHostElConnected: initDeps.gridHostElConnected,
    appLocale: initDeps.appLocale
  })
  emitInitLifecycle('bootstrap_started')
  newRowClientIdByIndexRef.current.clear()
  lastEmittedWorksheetIdRef.current = ''
  const { sheet: s, data: d, columns: c, initialSnapshot: initialSnapshotForSheet } = propsRef.current
  let snapshotForInit: UniverWorkbookSnapshot
  let initializedFromProvidedSnapshot = Boolean(initialSnapshotForSheet && typeof initialSnapshotForSheet === 'object')
  const sanitizeSnapshotForBootstrap = (
    candidateSnapshot: Record<string, unknown>,
    source: 'provided' | 'row-built'
  ): UniverWorkbookSnapshot | null => {
    // Validate untrusted workbook snapshots before passing them into Univer so SAST sees
    // a standards-based sanitization boundary at the createWorkbook() sink.
    const sanitized = sanitizeUniverWorkbookSnapshotForBootstrap(candidateSnapshot)
    if (!sanitized.snapshot) {
      console.warn('[UniverSheetGrid] rejected workbook snapshot before bootstrap', {
        sheetId: s.id,
        source
      })
      return null
    }
    if (sanitized.changed) {
      debugUniverInit('snapshot_sanitized_before_bootstrap', {
        sheetId: s.id,
        source
      })
    }
    return sanitized.snapshot as unknown as UniverWorkbookSnapshot
  }
  const buildSafeRowSnapshot = (): UniverWorkbookSnapshot => {
    const rowBuiltSnapshot = buildWorkbookSnapshot(s, d, c) as unknown as Record<string, unknown>
    return (
      sanitizeSnapshotForBootstrap(rowBuiltSnapshot, 'row-built') ??
      (rowBuiltSnapshot as unknown as UniverWorkbookSnapshot)
    )
  }
  try {
    if (initializedFromProvidedSnapshot) {
      const providedSnapshot = initialSnapshotForSheet as Record<string, unknown>
      transformAvatarFormulasInSnapshot(providedSnapshot, c)
      const sanitizedProvidedSnapshot = sanitizeSnapshotForBootstrap(providedSnapshot, 'provided')
      if (sanitizedProvidedSnapshot) {
        snapshotForInit = sanitizedProvidedSnapshot
      } else {
        snapshotForInit = buildSafeRowSnapshot()
        initializedFromProvidedSnapshot = false
      }
    } else {
      snapshotForInit = buildSafeRowSnapshot()
    }
  } catch (e) {
    console.error('[UniverSheetGrid] buildWorkbookSnapshot error:', e)
    emitInitLifecycle('bootstrap_failed', {
      reason: 'build_workbook_snapshot',
      message: e instanceof Error ? e.message : 'unknown'
    })
    return
  }
  contextRef.current = createUniverConversionContext(c, d)
  lastSyncedGridCellSignaturesRef.current = buildAuthoritativeCellSignatureMap(d, c)
  lastSyncedGridRowCountRef.current = getAuthoritativeGridRowExtent(d)
  lastSyncedGridColumnCountRef.current = c.filter(column => column.isVisible !== false).length
  lastProcessedAuthoritativeDataSyncTokenRef.current = props.authoritativeDataSyncToken ?? 0

  const univerLocaleData =
    appLocale === 'de-DE'
      ? mergeLocales(UniverPresetSheetsCoreEnUS, UNIVER_DE_LOCALE)
      : mergeLocales(UniverPresetSheetsCoreEnUS)

  /** `FR_FR` maps the numfmt plugin's default currency symbol to € (see `localeCurrencySymbolMap` in `@univerjs/sheets-numfmt`). Locale bundles still ship merged English strings under this key. */
  const spreadsheetUniverLocale = LocaleType.FR_FR

  const createUniverApi = () =>
    createUniver({
      locale: spreadsheetUniverLocale,
      locales: {
        [spreadsheetUniverLocale]: univerLocaleData
      },
      presets: [
        UniverSheetsCorePreset({
          container: gridHostEl,
          customFontFamily: {
            override: true,
            list: [...supportedUniverFonts]
          }
        })
      ]
    }).univerAPI

  const initDims = extractDimensionsFromSnapshot(snapshotForInit as unknown as Record<string, unknown>, s.id)
  if (initDims) cellDimensionsRef.current = initDims

  let univerAPI = createUniverApi()
  univerAPIRef.current = univerAPI
  try {
    univerAPI.createWorkbook(snapshotForInit as unknown as Record<string, unknown>)
    scheduleApplyGermanNumfmtLocale(univerAPI, isBootstrapAlive)
  } catch (error) {
    console.error('[UniverSheetGrid] createWorkbook error:', error)
    if (initialSnapshotForSheet && initializedFromProvidedSnapshot) {
      console.warn('[UniverSheetGrid] Falling back to row-built snapshot after createWorkbook failure')
      try {
        univerAPI.dispose()
      } catch {
        /* ignore failed partial bootstrap cleanup */
      }
      try {
        snapshotForInit = buildSafeRowSnapshot()
        initializedFromProvidedSnapshot = false
        univerAPI = createUniverApi()
        univerAPIRef.current = univerAPI
        univerAPI.createWorkbook(snapshotForInit as unknown as Record<string, unknown>)
        scheduleApplyGermanNumfmtLocale(univerAPI, isBootstrapAlive)
      } catch (fallbackError) {
        console.error('[UniverSheetGrid] row-built createWorkbook fallback failed:', fallbackError)
        try {
          univerAPI.dispose()
        } catch {}
        univerAPIRef.current = null
        contextRef.current = null
        lastSyncedGridCellSignaturesRef.current = new Map()
        lastSyncedGridRowCountRef.current = 0
        lastSyncedGridColumnCountRef.current = 0
        lastProcessedAuthoritativeDataSyncTokenRef.current = props.authoritativeDataSyncToken ?? 0
        skipNextAuthoritativeSyncAfterSnapshotInitRef.current = false
        emitInitLifecycle('bootstrap_failed', {
          reason: 'row_built_create_workbook_fallback',
          message: fallbackError instanceof Error ? fallbackError.message : 'unknown'
        })
        return
      }
    } else {
      univerAPI.dispose()
      univerAPIRef.current = null
      contextRef.current = null
      lastSyncedGridCellSignaturesRef.current = new Map()
      lastSyncedGridRowCountRef.current = 0
      lastSyncedGridColumnCountRef.current = 0
      lastProcessedAuthoritativeDataSyncTokenRef.current = props.authoritativeDataSyncToken ?? 0
      skipNextAuthoritativeSyncAfterSnapshotInitRef.current = false
      emitInitLifecycle('bootstrap_failed', {
        reason: 'create_workbook',
        message: error instanceof Error ? error.message : 'unknown'
      })
      return
    }
  }
  emitInitLifecycle('bootstrap_succeeded')
  skipNextAuthoritativeSyncAfterSnapshotInitRef.current = initializedFromProvidedSnapshot

  const {
    getActiveWorksheetIdFromUniver,
    captureCopiedSelectionAnchor,
    markFormattingPasteIntent,
    peekPasteFormattingReplaceIntent,
    emitWorksheetFromUniver
  } = createUniverMountWorksheetSelectionChrome({
    univerAPIRef,
    activeSelectionRef,
    copiedSelectionAnchorRef,
    pendingFormattingPasteIntentRef,
    lastEmittedWorksheetIdRef,
    callbacksRef
  })

  univerBootstrapCompleteRef.current = false
  queueMicrotask(() => {
    if (!isBootstrapAlive()) return
    try {
      const wb = univerAPI.getActiveWorkbook?.() as { setActiveSheet?: (id: string) => void } | undefined
      wb?.setActiveSheet?.(s.id)
    } catch {
      /* ignore */
    }
    emitWorksheetFromUniver()
  })
  // Short delay: swallow any insert-sheet/set-worksheet-name mutations that
  // fire during Univer's bootstrap before we start forwarding them to the
  // backend. 500ms is generous; user sheet creation happens only on click.
  const bootstrapSettleTimer = globalThis.setTimeout(() => {
    if (!isBootstrapAlive()) return
    univerBootstrapCompleteRef.current = true
  }, 500)
  const canvasHealthTimeout = globalThis.setTimeout(() => {
    if (!isBootstrapAlive()) return
    const host = containerRef.current
    const hasCanvas = Boolean(host?.querySelector('canvas'))
    if (hasCanvas) {
      emitInitLifecycle('canvas_ready')
      return
    }
    emitInitLifecycle('canvas_timeout', {
      reason: initializedFromProvidedSnapshot ? 'snapshot_bootstrap_no_canvas' : 'row_built_bootstrap_no_canvas'
    })
    if (!initialSnapshotForSheet || !initializedFromProvidedSnapshot) return
    console.warn('[UniverSheetGrid] No canvas after snapshot bootstrap; row-built fallback was already bounded', {
      sheetId: s.id,
      columns: c.length,
      rows: d.length
    })
  }, 1500)

  // Re-read from Univer after it hydrates (handles column/row resizes, Excel imports, etc.)
  const updateCellDimensions = (): {
    changed: boolean
    dimensions: SnapshotDimensions | null
    sheetId: string | null
  } => {
    try {
      const wb = univerAPIRef.current?.getActiveWorkbook() as unknown as {
        save?: () => Record<string, unknown>
        getSnapshot?: () => Record<string, unknown>
        getActiveSheet?: () => { getSheetId?: () => string } | null
      } | null
      const snap = wb?.save?.() ?? wb?.getSnapshot?.()
      const activeSheetId = wb?.getActiveSheet?.()?.getSheetId?.() ?? propsRef.current.sheet.id ?? s.id
      const d = snap ? extractDimensionsFromSnapshot(snap, activeSheetId) : null
      if (!d) return { changed: false, dimensions: null, sheetId: activeSheetId }
      const changed = !areSnapshotDimensionsEqual(cellDimensionsRef.current, d)
      cellDimensionsRef.current = d
      if (changed) {
        refreshCursorRectsRef.current?.()
        refreshCommentRectsRef.current?.()
      }
      return { changed, dimensions: d, sheetId: activeSheetId }
    } catch {
      return { changed: false, dimensions: null, sheetId: null }
    }
  }
  updateCellDimensionsRef.current = updateCellDimensions
  const updateCellDimensionsTimeout = globalThis.setTimeout(() => {
    if (isBootstrapAlive()) updateCellDimensions()
  }, 200)

  const { markDirtyAndScheduleSnapshot } = attachUniverMountSnapshotCheckpointHandlers({
    flushQueuedSnapshotRequest,
    callbacksRef,
    isDirtyRef,
    hasEditedRef,
    snapshotRequestInFlightRef,
    snapshotRequestQueuedRef,
    snapshotCheckpointTimerRef,
    snapshotCheckpointScheduledAtRef,
    snapshotFirstDirtyAtRef,
    snapshotLastRequestedAtRef,
    snapshotLifecycleOriginRef,
    snapshotDirtyVersionRef,
    requestSnapshotCheckpointRef,
    scheduleSnapshotCheckpointRef
  })
  const peekAutofillApplyType = (
    sheetId: string,
    ranges?: import('./cellMatrixUtils').SheetRangeShape[],
    consume = false
  ): import('./univerAutofillIntent').SpreadsheetAutofillApplyType | null =>
    consume
      ? consumeSpreadsheetAutofillIntent(pendingAutofillIntentRef, sheetId, { ranges })
      : peekSpreadsheetAutofillIntent(pendingAutofillIntentRef, sheetId, { ranges })

  const handleDetectedCellMutation = createUniverMountHandleDetectedCellMutation({
    univerAPIRef,
    propsRef,
    callbacksRef,
    contextRef,
    recentlyDuplicatedWorksheetIdsRef,
    remoteEchoSuppressionRef,
    lastSyncedGridCellSignaturesRef,
    lastCellValueMutationAtRef,
    newRowClientIdByIndexRef,
    recentLocalMutationSignaturesRef,
    pendingFormattingPasteIntentRef,
    pendingAutofillIntentRef,
    mergeGestureSuppressBySheetRef,
    getWorkbookSnapshotRef,
    peekPasteFormattingReplaceIntent,
    peekAutofillApplyType,
    flushUnmaterializedRowsBeforePersist: async (targetSheetId: string, finalize?: () => Promise<void>) => {
      await propsRef.current.flushUnmaterializedRowsBeforePersistRef?.current?.(targetSheetId, finalize)
    },
    getPersistSheetRowsSnapshot: (targetSheetId: string) =>
      propsRef.current.getPersistSheetRowsSnapshot?.(targetSheetId) ?? propsRef.current.data,
    getPersistedBaselineRowsSnapshot: (targetSheetId: string) =>
      propsRef.current.getPersistedBaselineRowsSnapshot?.(targetSheetId) ?? null
  })
  const reconcileSingleCell = (
    row: number | undefined,
    col: number | undefined,
    source: 'selection-reconcile' | 'deferred-reconcile',
    worksheetId?: string | null
  ): void => {
    if (typeof row !== 'number' || typeof col !== 'number') return
    void (async () => {
      const resolvedWorksheetId = worksheetId ?? getActiveWorksheetIdFromUniver()
      const tailKey = resolveEmitSerializationKey(
        resolvedWorksheetId,
        resolvedWorksheetId,
        resolvedWorksheetId,
        getActiveWorksheetIdFromUniver()
      ).key
      await mutationEmitTailCoordinator.awaitTail(tailKey)
      const result = handleDetectedCellMutation({
        source,
        payloadCellValue: undefined,
        ranges: [
          {
            startRow: row,
            endRow: row,
            startColumn: col,
            endColumn: col
          }
        ],
        worksheetId: resolvedWorksheetId
      })
      if (result && typeof (result as Promise<boolean>).then === 'function') {
        await (result as Promise<boolean>).catch(() => undefined)
      }
    })().catch(() => undefined)
  }
  const { scrollEventDisposable, worksheetScrollDisposable, scrollPollIntervalId, activeWorksheetPollIntervalId } =
    registerUniverMountScrollSync({
      univerAPI,
      cellDimensionsRef,
      sheetScrollRef,
      refreshCursorRectsRef,
      refreshCommentRectsRef,
      propsRef,
      emitWorksheetFromUniver
    })

  // Insert-sheet / sheet bar: UUID injection and api-first structure intents run in
  // `registerUniverMountBeforeCommandSheetStructure` (BeforeCommandExecute).
  const insertSheetSourceIds = new Map<string, string>()
  const latestNativeSheetCopySourceIdRef = { current: null as string | null }
  const resolveInsertedWorksheetSnapshot = (
    sheetId: string,
    payloadSheet: Record<string, unknown> | undefined
  ): Record<string, unknown> | undefined => {
    const workbookSnapshot = getWorkbookSnapshotRef.current?.()
    const workbookSheets =
      workbookSnapshot?.sheets && typeof workbookSnapshot.sheets === 'object' && !Array.isArray(workbookSnapshot.sheets)
        ? (workbookSnapshot.sheets as Record<string, unknown>)
        : {}
    const liveWorksheet = workbookSheets[sheetId]
    if (liveWorksheet && typeof liveWorksheet === 'object' && !Array.isArray(liveWorksheet)) {
      const liveWorksheetRecord = liveWorksheet as Record<string, unknown>
      const payloadHasCopyPayload = worksheetHasCopyPayload(payloadSheet)
      const liveHasCopyPayload = worksheetHasCopyPayload(liveWorksheetRecord)
      return {
        ...payloadSheet,
        ...liveWorksheetRecord,
        ...(payloadHasCopyPayload && !liveHasCopyPayload
          ? {
              cellData: payloadSheet?.cellData,
              mergeData: payloadSheet?.mergeData,
              rowData: payloadSheet?.rowData,
              columnData: payloadSheet?.columnData
            }
          : {}),
        id: sheetId,
        name:
          (typeof payloadSheet?.name === 'string' && payloadSheet.name) ||
          (typeof liveWorksheetRecord.name === 'string' ? (liveWorksheetRecord.name as string) : undefined)
      }
    }
    if (payloadSheet) {
      return { ...payloadSheet, id: sheetId }
    }
    return undefined
  }
  const emitInsertedWorksheet = (
    sheetId: string,
    payloadSheet: (Record<string, unknown> & { id?: string; name?: string }) | undefined,
    index: number,
    sourceSheetId: string | undefined
  ): void => {
    if (!univerBootstrapCompleteRef.current || recentSheetMutationIdsRef.current.has(`ins:${sheetId}`)) return
    recentSheetMutationIdsRef.current.add(`ins:${sheetId}`)
    const sheetName = payloadSheet?.name ?? 'Sheet'
    const worksheetSnapshot = resolveInsertedWorksheetSnapshot(sheetId, payloadSheet)
    const isDuplicate = Boolean(sourceSheetId && worksheetHasCopyPayload(worksheetSnapshot))
    if (isDuplicate) {
      recentlyDuplicatedWorksheetIdsRef.current.set(sheetId, Date.now())
    }
    const workbookStyles = extractWorkbookStylesFromSnapshot(getWorkbookSnapshotRef.current?.() ?? null)
    callbacksRef.current.onUniverSheetInserted?.({
      kind: isDuplicate ? 'duplicate' : 'blank',
      sheetId,
      sheetName,
      index,
      visualWorksheetSnapshot: worksheetSnapshot
        ? stripWorksheetValueKeys(worksheetSnapshot, sheetId, sheetName, workbookStyles)
        : undefined,
      sourceSheetId: isDuplicate ? sourceSheetId : undefined
    })
  }
  const detectUnreportedInsertedWorksheets = (): void => {
    if (!univerBootstrapCompleteRef.current || !propsRef.current.multiSheetWorkbookMode) return
    const workbookSnapshot = getWorkbookSnapshotRef.current?.()
    const workbookSheets =
      workbookSnapshot?.sheets && typeof workbookSnapshot.sheets === 'object' && !Array.isArray(workbookSnapshot.sheets)
        ? (workbookSnapshot.sheets as Record<string, unknown>)
        : {}
    const orderedSheetIds = Array.isArray(workbookSnapshot?.sheetOrder)
      ? (workbookSnapshot.sheetOrder as unknown[]).filter((id): id is string => typeof id === 'string')
      : Object.keys(workbookSheets)
    orderedSheetIds.forEach((sheetId, index) => {
      if (propsRef.current.getSheetContext?.(sheetId)) return
      const worksheet = workbookSheets[sheetId]
      const payloadSheet =
        worksheet && typeof worksheet === 'object' && !Array.isArray(worksheet)
          ? ({ ...(worksheet as Record<string, unknown>), id: sheetId } as Record<string, unknown> & {
              id?: string
              name?: string
            })
          : ({ id: sheetId } as Record<string, unknown> & { id?: string; name?: string })
      const sourceSheetId =
        latestNativeSheetCopySourceIdRef.current && latestNativeSheetCopySourceIdRef.current !== sheetId
          ? latestNativeSheetCopySourceIdRef.current
          : undefined
      emitInsertedWorksheet(sheetId, payloadSheet, index, sourceSheetId)
    })
  }
  const { beforeCommandDisposable } = registerUniverMountBeforeCommandSheetStructure({
    univerAPI,
    rewrittenWorksheetIdsRef,
    propsRef,
    callbacksRef,
    readOnlyRef,
    recentSheetMutationIdsRef,
    pendingAutofillIntentRef,
    insertSheetSourceIds,
    latestNativeSheetCopySourceIdRef,
    markFormattingPasteIntent,
    getActiveWorksheetIdFromUniver
  })

  const { commandDisposable } = registerUniverMountCommandExecuted({
    univerAPI,
    univerAPIRef,
    propsRef,
    callbacksRef,
    readOnlyRef,
    recentSheetMutationIdsRef,
    univerBootstrapCompleteRef,
    isApplyingRemoteUpdateRef,
    collabPersistedBulkApplyDepthRef,
    lastFeatureEmitAtBySignatureRef,
    pendingFreezeClearEmitTimeoutBySheetRef,
    lastClearAllEmitAtBySignatureRef,
    lastClearFormatEmitAtBySignatureRef,
    lastCellValueMutationAtRef,
    pendingCutCellRangeRef,
    cutPasteCollabSuppressUntilMsRef,
    mergeGestureSuppressBySheetRef,
    pendingAutofillIntentRef,
    insertSheetSourceIds,
    latestNativeSheetCopySourceIdRef,
    getActiveWorksheetIdFromUniver,
    captureCopiedSelectionAnchor,
    emitWorksheetFromUniver,
    detectUnreportedInsertedWorksheets,
    emitInsertedWorksheet,
    handleDetectedCellMutation,
    updateCellDimensions,
    toCellDimensionsPayload,
    markDirtyAndScheduleSnapshot
  })
  const replayDeferredSingleCell = async (cell: DeferredDirtyCell): Promise<void> => {
    const { row, col, worksheetId, deferredPayload, commandId, origin } = cell
    const resolvedWorksheetId = worksheetId ?? getActiveWorksheetIdFromUniver()
    const activeWorksheetIdAtHandlingTime = getActiveWorksheetIdFromUniver()
    const { key: tailKey } = resolveEmitSerializationKey(
      resolvedWorksheetId,
      resolvedWorksheetId,
      resolvedWorksheetId,
      activeWorksheetIdAtHandlingTime
    )
    const range = {
      startRow: row,
      endRow: row,
      startColumn: col,
      endColumn: col
    }
    let payloadCellValue = deferredPayload
    if (!payloadCellValue) {
      const workbook = univerAPIRef.current?.getActiveWorkbook()
      const activeWorksheet = workbook?.getActiveSheet()
      const worksheet =
        resolvedWorksheetId && typeof workbook?.getSheetBySheetId === 'function'
          ? (workbook.getSheetBySheetId(resolvedWorksheetId) ?? activeWorksheet)
          : activeWorksheet
      const currentWorksheet =
        isCurrentFacadeWorksheet(activeWorksheet, worksheet, resolvedWorksheetId) &&
        worksheet &&
        typeof (worksheet as { getRange?: unknown }).getRange === 'function'
          ? worksheet
          : undefined
      payloadCellValue = deriveCellMatrixFromRanges(currentWorksheet, [range]) ?? undefined
    }
    if (!payloadCellValue) {
      return
    }
    await runDetectedCellMutationThroughCoordinator(mutationEmitTailCoordinator, tailKey, handleDetectedCellMutation, {
      source: origin === 'local_user' ? 'deferred-replay' : 'deferred-reconcile',
      commandId,
      payloadCellValue,
      ranges: [range],
      worksheetId: resolvedWorksheetId
    })
  }

  const { valueChangeDisposable, sheetEditEndedDisposable, flushDeferredDirtyCells, clearDeferredDirtyCellsInRegion } =
    registerUniverMountSheetValueAndEditListeners({
      univerAPI,
      readOnlyRef,
      isApplyingRemoteUpdateRef,
      collabPersistedBulkApplyDepthRef,
      remoteEchoSuppressionRef,
      univerAPIRef,
      callbacksRef,
      propsRef,
      handleDetectedCellMutation,
      mutationEmitTailCoordinator,
      replayDeferredSingleCell
    })
  bulkApplyClearDeferredDirtyCellsRef.current = clearDeferredDirtyCellsInRegion
  flushDeferredDirtyCellsRef.current = flushDeferredDirtyCells
  if (propsRef.current.flushDeferredDirtyCellsRef) {
    propsRef.current.flushDeferredDirtyCellsRef.current = flushDeferredDirtyCells
  }
  const {
    selectionDisposable,
    selectionChangeDisposable,
    currentSelectionChangeDisposable,
    captureCopyFromDomEvent,
    captureCutFromDomEvent,
    capturePasteFromDomEvent,
    cursorPollIntervalId,
    clearPendingCursorTimeouts
  } = registerUniverMountCursorEmit({
    univerAPI,
    univerAPIRef,
    propsRef,
    callbacksRef,
    activeSelectionRef,
    lastEmittedCursorPathRef,
    pendingCutCellRangeRef,
    reconcileSingleCell,
    captureCopiedSelectionAnchor,
    markFormattingPasteIntent,
    getActiveWorksheetIdFromUniver
  })

  const dispose = () => {
    disposed = true
    emitInitLifecycle('disposed')
    requestSnapshotCheckpointRef.current = null
    scheduleSnapshotCheckpointRef.current = null
    snapshotRequestQueuedRef.current = false
    clearTimeout(canvasHealthTimeout)
    clearTimeout(bootstrapSettleTimer)
    clearTimeout(updateCellDimensionsTimeout)
    univerBootstrapCompleteRef.current = false
    recentSheetMutationIdsRef.current = new Set()
    recentlyDuplicatedWorksheetIdsRef.current.clear()
    if (snapshotCheckpointTimerRef.current) {
      clearTimeout(snapshotCheckpointTimerRef.current)
      snapshotCheckpointTimerRef.current = null
    }
    snapshotCheckpointScheduledAtRef.current = null
    snapshotFirstDirtyAtRef.current = null
    snapshotDirtyVersionRef.current = 0
    try {
      valueChangeDisposable?.dispose()
    } catch {}
    try {
      sheetEditEndedDisposable?.dispose()
    } catch {}
    try {
      selectionDisposable?.dispose()
    } catch {}
    try {
      selectionChangeDisposable?.dispose()
    } catch {}
    try {
      currentSelectionChangeDisposable?.dispose()
    } catch {}
    document.removeEventListener('copy', captureCopyFromDomEvent, true)
    document.removeEventListener('cut', captureCutFromDomEvent, true)
    document.removeEventListener('paste', capturePasteFromDomEvent, true)
    clearPendingCursorTimeouts()
    try {
      scrollEventDisposable?.dispose?.()
    } catch {}
    try {
      worksheetScrollDisposable?.dispose?.()
    } catch {}
    clearInterval(scrollPollIntervalId)
    if (activeWorksheetPollIntervalId) {
      clearInterval(activeWorksheetPollIntervalId)
    }
    clearInterval(cursorPollIntervalId)
    insertSheetSourceIds.clear()
    try {
      commandDisposable?.dispose?.()
    } catch {}
    try {
      beforeCommandDisposable?.dispose?.()
    } catch {}
    sheetScrollRef.current = { scrollLeft: 0, scrollTop: 0 }
    univerAPI.dispose()
    univerAPIRef.current = null
    contextRef.current = null
    lastSyncedGridCellSignaturesRef.current = new Map()
    lastSyncedGridRowCountRef.current = 0
    lastSyncedGridColumnCountRef.current = 0
    lastProcessedAuthoritativeDataSyncTokenRef.current = props.authoritativeDataSyncToken ?? 0
  }

  return dispose
}
