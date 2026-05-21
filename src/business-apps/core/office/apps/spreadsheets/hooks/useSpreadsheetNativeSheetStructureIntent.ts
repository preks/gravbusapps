import { useCallback, type MutableRefObject } from 'react'

import type { SpreadsheetMutationFacade } from '../core/SpreadsheetMutationFacade'
import { structuralWsDedupTtlExpiry, type StructuralWsDedupToken } from '../utils/spreadsheetStructuralWsDedup'
import { resolveReconciledSheetId } from '../utils/reconcileTemporarySheetId'
import type { NativeSheetStructureIntent } from '../utils/nativeSheetStructureIntent'
import type { SpreadsheetColumn, SpreadsheetSheet } from '../types'

type ViewerRow = Record<string, unknown>

export interface UseSpreadsheetNativeSheetStructureIntentParams {
  preferUniverNativeSheetTabs: boolean
  isTrashedApp: boolean
  appSheets: SpreadsheetSheet[]
  activeSheetIdRef: MutableRefObject<string>
  activeSheetColumns: SpreadsheetColumn[]
  createdSheetIdAliasesRef: MutableRefObject<Map<string, string>>
  peerSheetDataCacheRef: MutableRefObject<Map<string, ViewerRow[]>>
  authoritativePeerSheetDataCacheRef: MutableRefObject<Set<string>>
  pendingUniverRowsBySheetRef: MutableRefObject<Map<string, { data: ViewerRow[]; persistedRows: ViewerRow[] }>>
  operationQueueRef: MutableRefObject<Promise<void>>
  socketPersistChainRef: MutableRefObject<Promise<unknown>>
  processUniverDataChangeRef: MutableRefObject<() => Promise<void>>
  flushPendingCellChangesRef: MutableRefObject<() => Promise<void>>
  structuralWsDedupRef: MutableRefObject<StructuralWsDedupToken | null>
  mutationFacade: Pick<SpreadsheetMutationFacade, 'updateSheetMetadata'> | null
  persistSpreadsheetCreatedSheetContext: unknown
  getRichestKnownRowsForSheet: (sheetId: string) => ViewerRow[]
  getActiveSessionRows: () => ViewerRow[]
  applyLocalAppUpdate: (updater: (currentApp: { sheets: SpreadsheetSheet[] }) => { sheets: SpreadsheetSheet[] }) => void
  rememberKnownSheetVersion: (sheetId: string, version: number | undefined) => void
  rememberSheetVersion: (sheetId: string, version: number | undefined) => void
  renameRemoteSheetInLiveWorkbook: (sheetId: string, sheetName: string) => void
  removeRemoteSheetFromLiveWorkbook: (sheetId: string) => void
  queueSnapshotCheckpointForSheet: (sheetId: string) => void
  setActiveSheetId: (sheetId: string) => void
  chainOnOperationQueue: (queueRef: MutableRefObject<Promise<void>>, fn: () => Promise<void>) => Promise<void>
  primeSpreadsheetSheetInsertCaches: (
    previousActiveId: string,
    insertedSheetId: string,
    rowsToPreserve: ViewerRow[],
    currentActiveRows: ViewerRow[],
    context: {
      peerSheetDataCacheRef: MutableRefObject<Map<string, ViewerRow[]>>
      authoritativePeerSheetDataCacheRef: MutableRefObject<Set<string>>
      pendingUniverRowsBySheetRef: MutableRefObject<Map<string, { data: ViewerRow[]; persistedRows: ViewerRow[] }>>
    }
  ) => void
  persistSpreadsheetCreatedSheet: (
    params: Record<string, unknown>,
    context: unknown
  ) => Promise<{ id: string; version?: number }>
  queuePersistSpreadsheetSheetRenameAfterCellFlush: (params: Record<string, unknown>) => Promise<void>
  persistSpreadsheetSheetDelete: (params: Record<string, unknown>) => Promise<boolean>
  buildDuplicateVisualWorksheetSnapshot: (
    workbookSnapshot: Record<string, unknown> | null,
    sourceSheetId: string,
    targetSheetId: string,
    targetSheetName: string
  ) => Record<string, unknown> | null | undefined
  getWorkbookSnapshot: () => Record<string, unknown> | null
}

export interface UseSpreadsheetNativeSheetStructureIntentResult {
  handleNativeSheetStructureIntent: (intent: NativeSheetStructureIntent) => void
}

export function useSpreadsheetNativeSheetStructureIntent(
  params: UseSpreadsheetNativeSheetStructureIntentParams
): UseSpreadsheetNativeSheetStructureIntentResult {
  const {
    preferUniverNativeSheetTabs,
    isTrashedApp,
    appSheets,
    activeSheetIdRef,
    activeSheetColumns,
    createdSheetIdAliasesRef,
    peerSheetDataCacheRef,
    authoritativePeerSheetDataCacheRef,
    pendingUniverRowsBySheetRef,
    operationQueueRef,
    socketPersistChainRef,
    processUniverDataChangeRef,
    flushPendingCellChangesRef,
    structuralWsDedupRef,
    mutationFacade,
    persistSpreadsheetCreatedSheetContext,
    getRichestKnownRowsForSheet,
    getActiveSessionRows,
    applyLocalAppUpdate,
    rememberKnownSheetVersion,
    rememberSheetVersion,
    renameRemoteSheetInLiveWorkbook,
    removeRemoteSheetFromLiveWorkbook,
    queueSnapshotCheckpointForSheet,
    setActiveSheetId,
    chainOnOperationQueue,
    primeSpreadsheetSheetInsertCaches,
    persistSpreadsheetCreatedSheet,
    queuePersistSpreadsheetSheetRenameAfterCellFlush,
    persistSpreadsheetSheetDelete,
    buildDuplicateVisualWorksheetSnapshot,
    getWorkbookSnapshot
  } = params

  const handleNativeSheetStructureIntent = useCallback(
    (intent: NativeSheetStructureIntent) => {
      if (!preferUniverNativeSheetTabs || isTrashedApp) return

      void (async () => {
        try {
          if (intent.type === 'insert') {
            if (appSheets.some(sheet => sheet.id === intent.sheetId)) return
            const templateColumns = activeSheetColumns.map(column => ({ ...column }))
            const previousActiveId = activeSheetIdRef.current
            const rowsToPreserve = getRichestKnownRowsForSheet(previousActiveId)
            const currentActiveRows = getActiveSessionRows()
            primeSpreadsheetSheetInsertCaches(previousActiveId, intent.sheetId, rowsToPreserve, currentActiveRows, {
              peerSheetDataCacheRef,
              authoritativePeerSheetDataCacheRef,
              pendingUniverRowsBySheetRef
            })
            const created = await persistSpreadsheetCreatedSheet(
              {
                kind: 'create',
                requestedSheetId: intent.sheetId,
                requestedSheetName: intent.sheetName,
                templateColumns,
                liveWorkbookInsertIndex: intent.index,
                activatePersistedSheet: true,
                shouldSeedAsActive: () => true
              },
              persistSpreadsheetCreatedSheetContext
            )
            const version = Number(created.version ?? 0)
            structuralWsDedupRef.current = {
              kind: 'sheet_created',
              sheetId: created.id,
              version,
              expiresAt: structuralWsDedupTtlExpiry(Date.now())
            }
            return
          }

          if (intent.type === 'duplicate') {
            if (appSheets.some(sheet => sheet.id === intent.targetSheetId)) return
            const visualWorksheetSnapshot = buildDuplicateVisualWorksheetSnapshot(
              getWorkbookSnapshot() ?? null,
              intent.sourceSheetId,
              intent.targetSheetId,
              intent.sheetName
            )
            const previousActiveId = activeSheetIdRef.current
            const rowsToPreserve = getRichestKnownRowsForSheet(previousActiveId)
            const currentActiveRows = getActiveSessionRows()
            primeSpreadsheetSheetInsertCaches(
              previousActiveId,
              intent.targetSheetId,
              rowsToPreserve,
              currentActiveRows,
              {
                peerSheetDataCacheRef,
                authoritativePeerSheetDataCacheRef,
                pendingUniverRowsBySheetRef
              }
            )
            const created = await persistSpreadsheetCreatedSheet(
              {
                kind: 'duplicate',
                requestedSheetId: intent.targetSheetId,
                requestedSheetName: intent.sheetName,
                sourceSheetId: intent.sourceSheetId,
                templateColumns: activeSheetColumns,
                visualWorksheetSnapshot: visualWorksheetSnapshot ?? null,
                liveWorkbookInsertIndex: intent.index,
                activatePersistedSheet: true,
                shouldSeedAsActive: () => true,
                performPrePersist: async () => {
                  await socketPersistChainRef.current.catch(() => {})
                  await chainOnOperationQueue(operationQueueRef, async () => {
                    await processUniverDataChangeRef.current()
                    await flushPendingCellChangesRef.current()
                  })
                }
              },
              persistSpreadsheetCreatedSheetContext
            )
            const version = Number(created.version ?? 0)
            structuralWsDedupRef.current = {
              kind: 'sheet_created',
              sheetId: created.id,
              version,
              expiresAt: structuralWsDedupTtlExpiry(Date.now())
            }
            return
          }

          if (intent.type === 'rename') {
            const canonicalSheetId = resolveReconciledSheetId(intent.sheetId, createdSheetIdAliasesRef.current)
            const currentSheet = appSheets.find(sheet => sheet.id === canonicalSheetId)
            if (!currentSheet || currentSheet.name === intent.sheetName) return
            await queuePersistSpreadsheetSheetRenameAfterCellFlush({
              operationQueueRef,
              chainOnOperationQueue,
              processUniverDataChange: () => processUniverDataChangeRef.current(),
              flushPendingCellChanges: () => flushPendingCellChangesRef.current(),
              rename: {
                sheetId: canonicalSheetId,
                sheetName: intent.sheetName,
                currentSheetVersion: Number(currentSheet.version ?? 0),
                mutationFacade,
                getRowsToPreserve: getRichestKnownRowsForSheet,
                peerSheetDataCacheRef,
                authoritativePeerSheetDataCacheRef,
                applyLocalAppUpdate,
                rememberKnownSheetVersion,
                rememberSheetVersion,
                renameRemoteSheetInLiveWorkbook,
                queueSnapshotCheckpoint: queueSnapshotCheckpointForSheet
              },
              onSuccess: ({ updatedVersion }: { updatedVersion: number }) => {
                structuralWsDedupRef.current = {
                  kind: 'sheet_renamed',
                  sheetId: canonicalSheetId,
                  version: updatedVersion,
                  name: intent.sheetName.trim(),
                  expiresAt: structuralWsDedupTtlExpiry(Date.now())
                }
              },
              onError: (error: unknown) => {
                console.error('[SpreadsheetAppViewer] Failed to persist sheet rename:', error)
              }
            })
            return
          }

          if (intent.type === 'delete') {
            if (appSheets.length <= 1) return
            const canonicalSheetId = resolveReconciledSheetId(intent.sheetId, createdSheetIdAliasesRef.current)
            const nextActiveSheetId = appSheets.filter(sheet => sheet.id !== canonicalSheetId)[0]?.id
            const deleted = await persistSpreadsheetSheetDelete({
              sheetId: canonicalSheetId,
              activeSheetId: activeSheetIdRef.current,
              nextActiveSheetId,
              mutationFacade,
              removeRemoteSheetFromLiveWorkbook,
              setActiveSheetId
            })
            if (!deleted) return
            structuralWsDedupRef.current = {
              kind: 'sheet_deleted',
              sheetId: canonicalSheetId,
              expiresAt: structuralWsDedupTtlExpiry(Date.now())
            }
            return
          }

          if (intent.type === 'visibility') {
            const canonicalSheetId = resolveReconciledSheetId(intent.sheetId, createdSheetIdAliasesRef.current)
            const currentSheet = appSheets.find(sheet => sheet.id === canonicalSheetId)
            const visibleSheetCount = appSheets.filter(
              sheet => sheet.id === canonicalSheetId || sheet.hidden !== true
            ).length
            if (!currentSheet || currentSheet.hidden === intent.hidden) return
            if (intent.hidden) {
              if (visibleSheetCount <= 1) return
            }
            applyLocalAppUpdate(currentApp => ({
              ...currentApp,
              sheets: currentApp.sheets.map(sheet =>
                sheet.id === canonicalSheetId ? { ...sheet, hidden: intent.hidden } : sheet
              )
            }))
            const updated = await mutationFacade?.updateSheetMetadata?.(canonicalSheetId, {
              hidden: intent.hidden,
              settings: {
                ...currentSheet.settings,
                univerSheetHidden: intent.hidden
              }
            })
            const updatedVersion = Number(updated?.version ?? currentSheet.version ?? 0)
            rememberKnownSheetVersion(canonicalSheetId, Number.isFinite(updatedVersion) ? updatedVersion : undefined)
            rememberSheetVersion(canonicalSheetId, Number.isFinite(updatedVersion) ? updatedVersion : undefined)
            queueSnapshotCheckpointForSheet(canonicalSheetId)
            if (intent.hidden && activeSheetIdRef.current === canonicalSheetId) {
              const nextActiveSheetId = appSheets.find(
                sheet => sheet.id !== canonicalSheetId && sheet.hidden !== true
              )?.id
              if (nextActiveSheetId) setActiveSheetId(nextActiveSheetId)
            }
            structuralWsDedupRef.current = {
              kind: 'sheet_visibility',
              sheetId: canonicalSheetId,
              version: Number.isFinite(updatedVersion) ? updatedVersion : 0,
              hidden: intent.hidden,
              expiresAt: structuralWsDedupTtlExpiry(Date.now())
            }
          }
        } catch (error) {
          console.error('[SpreadsheetAppViewer] Native sheet structure intent failed:', error)
        }
      })()
    },
    [
      activeSheetColumns,
      activeSheetIdRef,
      appSheets,
      applyLocalAppUpdate,
      authoritativePeerSheetDataCacheRef,
      buildDuplicateVisualWorksheetSnapshot,
      chainOnOperationQueue,
      createdSheetIdAliasesRef,
      flushPendingCellChangesRef,
      getActiveSessionRows,
      getRichestKnownRowsForSheet,
      getWorkbookSnapshot,
      isTrashedApp,
      mutationFacade,
      operationQueueRef,
      peerSheetDataCacheRef,
      pendingUniverRowsBySheetRef,
      persistSpreadsheetCreatedSheet,
      persistSpreadsheetCreatedSheetContext,
      persistSpreadsheetSheetDelete,
      preferUniverNativeSheetTabs,
      primeSpreadsheetSheetInsertCaches,
      processUniverDataChangeRef,
      queuePersistSpreadsheetSheetRenameAfterCellFlush,
      queueSnapshotCheckpointForSheet,
      rememberKnownSheetVersion,
      rememberSheetVersion,
      removeRemoteSheetFromLiveWorkbook,
      renameRemoteSheetInLiveWorkbook,
      setActiveSheetId,
      socketPersistChainRef,
      structuralWsDedupRef
    ]
  )

  return { handleNativeSheetStructureIntent }
}
