import { useCallback, type MutableRefObject } from 'react'

import { applyOptimisticSpreadsheetSheetRenameToLocalApp, prepareUniverSheetInsertLocally } from '../core'
import { resolveReconciledSheetId } from '../utils/reconcileTemporarySheetId'

type ViewerRow = Record<string, unknown>
type SheetLike = {
  id: string
  name: string
  data?: ViewerRow[]
  version?: number | string
  columns: Array<Record<string, unknown>>
}

export interface UseSpreadsheetUniverSheetEventsParams {
  appSheets: SheetLike[]
  activeSheet: SheetLike
  activeSheetId: string
  activeSheetIdRef: MutableRefObject<string>
  createdSheetIdAliasesRef: MutableRefObject<Map<string, string>>
  pendingCreatedSheetSelectionRef: MutableRefObject<{
    temporarySheetId: string
    persistedSheetId: string | null
  } | null>
  peerSheetDataCacheRef: MutableRefObject<Map<string, ViewerRow[]>>
  authoritativePeerSheetDataCacheRef: MutableRefObject<Set<string>>
  pendingUniverRowsBySheetRef: MutableRefObject<Map<string, { data: ViewerRow[]; persistedRows: ViewerRow[] }>>
  pendingCellChangesRef: MutableRefObject<unknown[]>
  pendingCellBatchesRef: MutableRefObject<unknown[]>
  spreadsheetGridRef: MutableRefObject<{ getWorkbookSnapshot?: () => Record<string, unknown> | null } | null>
  socketPersistChainRef: MutableRefObject<Promise<unknown>>
  operationQueueRef: MutableRefObject<Promise<void>>
  processUniverDataChangeRef: MutableRefObject<() => Promise<void>>
  flushPendingCellChangesRef: MutableRefObject<() => Promise<void>>
  mutationFacade: unknown
  persistSpreadsheetCreatedSheetContext: unknown
  setActiveSheetId: (sheetId: string) => void
  applyLocalAppUpdate: (updater: (currentApp: { sheets: SheetLike[] }) => { sheets: SheetLike[] }) => void
  getActiveSessionRows: () => ViewerRow[]
  getRichestKnownRowsForSheet: (sheetId: string) => ViewerRow[]
  onLocalAppUpdate?: unknown
  onAppUpdate?: unknown
  chainOnOperationQueue: (queueRef: MutableRefObject<Promise<void>>, fn: () => Promise<void>) => Promise<void>
  persistSpreadsheetCreatedSheet: (
    params: Record<string, unknown>,
    context: unknown
  ) => Promise<{ id: string; data?: unknown }>
  persistSpreadsheetSheetDelete: (params: Record<string, unknown>) => Promise<boolean>
  queuePersistSpreadsheetSheetRenameAfterCellFlush: (params: Record<string, unknown>) => Promise<void>
  rememberKnownSheetVersion: (sheetId: string, version: number | undefined) => void
  rememberSheetVersion: (sheetId: string, version: number | undefined) => void
  queueSnapshotCheckpointForSheet: (sheetId: string) => void
  debugLog: (message: string, meta?: Record<string, unknown>) => void
  multiSheetDebugLog: (event: string, meta?: Record<string, unknown> | (() => Record<string, unknown>)) => void
  summarizeRowsForDebug: (rows: ViewerRow[] | undefined) => Record<string, unknown>
  summarizeLiveWorksheetSnapshotForDebug: (
    snapshot: Record<string, unknown> | null,
    sheetId?: string
  ) => Record<string, unknown>
}

export interface UseSpreadsheetUniverSheetEventsResult {
  handleUniverSheetInserted: (payload: {
    kind: 'blank' | 'duplicate'
    sheetId: string
    sheetName: string
    index: number
    visualWorksheetSnapshot?: Record<string, unknown>
    sourceSheetId?: string
  }) => void
  handleUniverSheetRemoved: (payload: { sheetId: string }) => void
  handleUniverSheetRenamed: (payload: { sheetId: string; sheetName: string }) => void
}

export function useSpreadsheetUniverSheetEvents(
  params: UseSpreadsheetUniverSheetEventsParams
): UseSpreadsheetUniverSheetEventsResult {
  const {
    appSheets,
    activeSheet,
    activeSheetId,
    activeSheetIdRef,
    createdSheetIdAliasesRef,
    pendingCreatedSheetSelectionRef,
    peerSheetDataCacheRef,
    authoritativePeerSheetDataCacheRef,
    pendingUniverRowsBySheetRef,
    pendingCellChangesRef,
    pendingCellBatchesRef,
    spreadsheetGridRef,
    socketPersistChainRef,
    operationQueueRef,
    processUniverDataChangeRef,
    flushPendingCellChangesRef,
    mutationFacade,
    persistSpreadsheetCreatedSheetContext,
    setActiveSheetId,
    applyLocalAppUpdate,
    getActiveSessionRows,
    getRichestKnownRowsForSheet,
    onLocalAppUpdate,
    onAppUpdate,
    chainOnOperationQueue,
    persistSpreadsheetCreatedSheet,
    persistSpreadsheetSheetDelete,
    queuePersistSpreadsheetSheetRenameAfterCellFlush,
    rememberKnownSheetVersion,
    rememberSheetVersion,
    queueSnapshotCheckpointForSheet,
    debugLog,
    multiSheetDebugLog,
    summarizeRowsForDebug,
    summarizeLiveWorksheetSnapshotForDebug
  } = params

  const handleUniverSheetInserted = useCallback(
    (payload: {
      kind: 'blank' | 'duplicate'
      sheetId: string
      sheetName: string
      index: number
      visualWorksheetSnapshot?: Record<string, unknown>
      sourceSheetId?: string
    }) => {
      const alreadyExists = appSheets.some(sheet => sheet.id === payload.sheetId)
      if (alreadyExists) return

      const liveSnapshotBeforeCreate = spreadsheetGridRef.current?.getWorkbookSnapshot?.()
      multiSheetDebugLog('sheet_insert_start', () => ({
        requestedSheetId: payload.sheetId,
        requestedSheetName: payload.sheetName,
        activeSheetId,
        localSheetData: summarizeRowsForDebug(getActiveSessionRows()),
        peerCacheActiveRows: summarizeRowsForDebug(peerSheetDataCacheRef.current.get(activeSheetId)),
        pendingUniverRows: summarizeRowsForDebug(pendingUniverRowsBySheetRef.current.get(activeSheetId)?.data),
        liveSnapshot: summarizeLiveWorksheetSnapshotForDebug(
          (liveSnapshotBeforeCreate as Record<string, unknown> | null | undefined) ?? null,
          activeSheetId
        )
      }))

      const { templateColumns, sourceSheetId } = prepareUniverSheetInsertLocally(
        {
          payload: {
            kind: payload.kind,
            sheetId: payload.sheetId,
            sheetName: payload.sheetName,
            sourceSheetId: payload.sourceSheetId
          },
          appSheets: appSheets as any,
          activeTemplateSheet: activeSheet as any,
          previousActiveSheetId: activeSheetId,
          getActiveSessionRows,
          getRichestKnownRowsForSheet,
          shouldPreseedPlaceholder: Boolean(onLocalAppUpdate || onAppUpdate),
          onWillPrimeCaches: ({ rowsToPreserve, currentActiveRows }) => {
            multiSheetDebugLog('sheet_insert_preserve_rows', () => ({
              requestedSheetId: payload.sheetId,
              previousActiveSheetId: activeSheetId,
              rowsToPreserve: summarizeRowsForDebug(rowsToPreserve),
              localSheetDataBeforeClear: summarizeRowsForDebug(currentActiveRows)
            }))
          }
        },
        {
          pendingCreatedSheetSelectionRef,
          applyLocalAppUpdate,
          peerSheetDataCacheRef,
          authoritativePeerSheetDataCacheRef,
          pendingUniverRowsBySheetRef
        }
      )

      setActiveSheetId(payload.sheetId)

      void (async () => {
        const created = await persistSpreadsheetCreatedSheet(
          {
            kind: payload.kind === 'duplicate' ? 'duplicate' : 'create',
            requestedSheetId: payload.sheetId,
            requestedSheetName: payload.sheetName,
            templateColumns,
            sourceSheetId,
            visualWorksheetSnapshot: payload.visualWorksheetSnapshot,
            skipLiveWorkbookMaterialization: true,
            performPrePersist:
              payload.kind === 'duplicate'
                ? async () => {
                    await socketPersistChainRef.current.catch(() => {})
                    await chainOnOperationQueue(operationQueueRef, async () => {
                      await processUniverDataChangeRef.current()
                      await flushPendingCellChangesRef.current()
                    })
                  }
                : undefined,
            shouldSeedAsActive: (requestedSheetId: string, createdSheetId: string) =>
              activeSheetIdRef.current === requestedSheetId || activeSheetIdRef.current === createdSheetId
          },
          persistSpreadsheetCreatedSheetContext
        )
        debugLog('sheet add returned from backend', {
          requestedSheetId: payload.sheetId,
          persistedSheetId: created?.id ?? null,
          requestedSheetName: payload.sheetName,
          activeSheetId: activeSheetIdRef.current
        })
        const createdRows = Array.isArray(created.data) ? created.data : []
        if (payload.kind === 'duplicate' && createdRows.length === 0) {
          console.warn('[SpreadsheetAppViewer] Copied sheet create returned without persisted rows', {
            sheetId: created.id
          })
        }
        if (created.id === payload.sheetId) return
        debugLog('sheet id aliases updated after backend reconciliation', {
          requestedSheetId: payload.sheetId,
          persistedSheetId: created.id,
          aliasEntries: Array.from(createdSheetIdAliasesRef.current.entries()),
          pendingCellChanges: pendingCellChangesRef.current.length,
          pendingCellBatches: pendingCellBatchesRef.current.length,
          peerCacheSheetIds: Array.from(peerSheetDataCacheRef.current.keys())
        })
      })()
    },
    [
      activeSheet,
      activeSheetId,
      activeSheetIdRef,
      appSheets,
      applyLocalAppUpdate,
      authoritativePeerSheetDataCacheRef,
      chainOnOperationQueue,
      createdSheetIdAliasesRef,
      debugLog,
      flushPendingCellChangesRef,
      getActiveSessionRows,
      getRichestKnownRowsForSheet,
      multiSheetDebugLog,
      onAppUpdate,
      onLocalAppUpdate,
      operationQueueRef,
      peerSheetDataCacheRef,
      pendingCellBatchesRef,
      pendingCellChangesRef,
      pendingCreatedSheetSelectionRef,
      pendingUniverRowsBySheetRef,
      persistSpreadsheetCreatedSheet,
      persistSpreadsheetCreatedSheetContext,
      processUniverDataChangeRef,
      setActiveSheetId,
      socketPersistChainRef,
      spreadsheetGridRef,
      summarizeLiveWorksheetSnapshotForDebug,
      summarizeRowsForDebug
    ]
  )

  const handleUniverSheetRemoved = useCallback(
    (payload: { sheetId: string }) => {
      if (appSheets.length <= 1) return
      const canonicalSheetId = resolveReconciledSheetId(payload.sheetId, createdSheetIdAliasesRef.current)
      void persistSpreadsheetSheetDelete({
        sheetId: canonicalSheetId,
        activeSheetId: activeSheetIdRef.current,
        mutationFacade
      })
    },
    [activeSheetIdRef, appSheets.length, createdSheetIdAliasesRef, mutationFacade, persistSpreadsheetSheetDelete]
  )

  const handleUniverSheetRenamed = useCallback(
    (payload: { sheetId: string; sheetName: string }) => {
      const canonicalSheetId = resolveReconciledSheetId(payload.sheetId, createdSheetIdAliasesRef.current)
      const current = appSheets.find(sheet => sheet.id === canonicalSheetId)
      if (!current || current.name === payload.sheetName) return
      applyOptimisticSpreadsheetSheetRenameToLocalApp(
        canonicalSheetId,
        payload.sheetName,
        getRichestKnownRowsForSheet,
        {
          peerSheetDataCacheRef,
          authoritativePeerSheetDataCacheRef,
          applyLocalAppUpdate
        }
      )
      void queuePersistSpreadsheetSheetRenameAfterCellFlush({
        operationQueueRef,
        chainOnOperationQueue,
        processUniverDataChange: () => processUniverDataChangeRef.current(),
        flushPendingCellChanges: () => flushPendingCellChangesRef.current(),
        rename: {
          sheetId: canonicalSheetId,
          sheetName: payload.sheetName,
          mutationFacade,
          getRowsToPreserve: getRichestKnownRowsForSheet,
          peerSheetDataCacheRef,
          authoritativePeerSheetDataCacheRef,
          applyLocalAppUpdate,
          rememberKnownSheetVersion,
          rememberSheetVersion,
          queueSnapshotCheckpoint: queueSnapshotCheckpointForSheet
        },
        onError: (error: unknown) => {
          console.error('[SpreadsheetAppViewer] Failed to persist sheet rename:', error)
        }
      })
    },
    [
      appSheets,
      applyLocalAppUpdate,
      authoritativePeerSheetDataCacheRef,
      chainOnOperationQueue,
      createdSheetIdAliasesRef,
      flushPendingCellChangesRef,
      getRichestKnownRowsForSheet,
      mutationFacade,
      operationQueueRef,
      peerSheetDataCacheRef,
      processUniverDataChangeRef,
      queuePersistSpreadsheetSheetRenameAfterCellFlush,
      queueSnapshotCheckpointForSheet,
      rememberKnownSheetVersion,
      rememberSheetVersion
    ]
  )

  return { handleUniverSheetInserted, handleUniverSheetRemoved, handleUniverSheetRenamed }
}
