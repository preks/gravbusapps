import type { MutableRefObject } from 'react'
import type { SpreadsheetColumn, SpreadsheetSheet, SpreadsheetApp } from '../types'
import { reconcileTemporarySheetIdReferences } from '../utils/reconcileTemporarySheetId'
import type { SpreadsheetMutationFacade } from './SpreadsheetMutationFacade'
import type { SpreadsheetSession } from './SpreadsheetSession'

type ViewerRow = Record<string, unknown>
type LatestUniverData = { data: ViewerRow[]; sheetId: string } | null
type PendingUniverRows = { data: ViewerRow[]; persistedRows: ViewerRow[] }
type PendingCreatedSheetSelection = { temporarySheetId: string; persistedSheetId: string | null }
type PendingCreatedSheetReconciliation = { temporarySheetId: string; persistedSheetId: string }
type PendingSnapshotCheckpoint = { requestedAt: number }

type SpreadsheetLocalAppUpdater = (updater: (currentApp: SpreadsheetApp) => SpreadsheetApp) => void

export interface PersistSpreadsheetCreatedSheetContext {
  mutationFacade: SpreadsheetMutationFacade
  spreadsheetSession: SpreadsheetSession
  activeSheetIdRef: MutableRefObject<string>
  peerSheetDataCacheRef: MutableRefObject<Map<string, ViewerRow[]>>
  authoritativePeerSheetDataCacheRef: MutableRefObject<Set<string>>
  createdSheetIdAliasesRef: MutableRefObject<Map<string, string>>
  pendingCreatedSheetSelectionRef: MutableRefObject<PendingCreatedSheetSelection | null>
  pendingCreatedSheetReconciliationRef: MutableRefObject<PendingCreatedSheetReconciliation | null>
  pendingUniverRowsBySheetRef: MutableRefObject<Map<string, PendingUniverRows>>
  pendingSnapshotClearCellsRef: MutableRefObject<Map<string, Set<string>>>
  pendingSnapshotCheckpointBySheetRef: MutableRefObject<Map<string, PendingSnapshotCheckpoint>>
  knownSheetVersionsRef: MutableRefObject<Map<string, { version: number; fetchedAt: number }>>
  pendingCellChangesRef: MutableRefObject<Array<{ sheetId?: string }>>
  pendingCellBatchesRef: MutableRefObject<Array<{ targetSheetId: string }>>
  latestUniverDataRef: MutableRefObject<LatestUniverData>
  applyLocalAppUpdate: SpreadsheetLocalAppUpdater
  seedActiveSheetState: (
    sheet: SpreadsheetSheet,
    rows: ViewerRow[],
    options?: { version?: number; setAsActive?: boolean; markPersisted?: boolean; updateProcessedLength?: boolean }
  ) => void
  setActiveSheetId?: (sheetId: string) => void
  rememberKnownSheetVersion?: (sheetId: string, version: number) => void
  ensureRemoteSheetInLiveWorkbook?: (sheet: Record<string, unknown>, index?: number) => void
  /** Invoked after server sheet create completes (persisted id known); flush deferred persistence. */
  onPersistedSheetReady?: () => void
}

export interface PersistSpreadsheetCreatedSheetParams {
  kind: 'create' | 'duplicate'
  requestedSheetId: string
  requestedSheetName: string
  templateColumns: SpreadsheetColumn[]
  sourceSheetId?: string
  visualWorksheetSnapshot?: Record<string, unknown>
  liveWorkbookInsertIndex?: number
  performPrePersist?: () => Promise<void>
  activatePersistedSheet?: boolean
  /** Univer already inserted the worksheet; skip grid materialization. */
  skipLiveWorkbookMaterialization?: boolean
  shouldSeedAsActive: (requestedSheetId: string, createdSheetId: string) => boolean
}

function upsertCreatedSheetInAppSheets(
  sheets: SpreadsheetSheet[],
  requestedSheetId: string,
  createdSheet: SpreadsheetSheet,
  insertIndex?: number
): SpreadsheetSheet[] {
  const matchesCreatedSheet = (sheet: SpreadsheetSheet) => sheet.id === requestedSheetId || sheet.id === createdSheet.id
  const firstMatchIndex = sheets.findIndex(matchesCreatedSheet)
  if (firstMatchIndex >= 0) {
    return sheets.flatMap((sheet, index) => {
      if (!matchesCreatedSheet(sheet)) return [sheet]
      if (index !== firstMatchIndex) return []
      return [{ ...sheet, ...createdSheet, id: createdSheet.id, data: createdSheet.data }]
    })
  }

  const boundedInsertIndex =
    typeof insertIndex === 'number' && Number.isFinite(insertIndex)
      ? Math.min(Math.max(Math.trunc(insertIndex), 0), sheets.length)
      : sheets.length

  return [...sheets.slice(0, boundedInsertIndex), createdSheet, ...sheets.slice(boundedInsertIndex)]
}

export const persistSpreadsheetCreatedSheet = async (
  params: PersistSpreadsheetCreatedSheetParams,
  ctx: PersistSpreadsheetCreatedSheetContext
): Promise<SpreadsheetSheet> => {
  await params.performPrePersist?.()

  const created =
    params.kind === 'duplicate' && params.sourceSheetId
      ? await ctx.mutationFacade.duplicateSheet({
          sourceSheetId: params.sourceSheetId,
          targetSheetId: params.requestedSheetId,
          name: params.requestedSheetName,
          visualWorksheetSnapshot: params.visualWorksheetSnapshot
        })
      : await ctx.mutationFacade.createSheet({
          id: params.requestedSheetId,
          name: params.requestedSheetName,
          columns: params.templateColumns,
          data: []
        })

  const createdRows = Array.isArray(created.data) ? created.data : []
  const createdVersion = Number(created.version ?? 0)
  const seedAsActive = params.shouldSeedAsActive(params.requestedSheetId, created.id)
  ctx.rememberKnownSheetVersion?.(created.id, createdVersion)
  ctx.peerSheetDataCacheRef.current.set(created.id, [...createdRows])
  ctx.authoritativePeerSheetDataCacheRef.current.add(created.id)

  if (seedAsActive) {
    ctx.seedActiveSheetState(created, createdRows, {
      version: createdVersion,
      setAsActive: true,
      markPersisted: true,
      updateProcessedLength: true
    })
  } else {
    ctx.spreadsheetSession.replaceSheetState(created, createdRows, createdVersion)
    ctx.spreadsheetSession.capturePersistedBaseline(created.id)
  }

  const createdSheetForApp: SpreadsheetSheet = {
    ...created,
    id: created.id,
    data: createdRows
  }
  ctx.applyLocalAppUpdate(currentApp => ({
    ...currentApp,
    sheets: upsertCreatedSheetInAppSheets(
      currentApp.sheets,
      params.requestedSheetId,
      createdSheetForApp,
      params.liveWorkbookInsertIndex
    )
  }))

  if (params.activatePersistedSheet || (created.id !== params.requestedSheetId && seedAsActive)) {
    ctx.setActiveSheetId?.(created.id)
  }

  ctx.pendingCreatedSheetSelectionRef.current = {
    temporarySheetId: params.requestedSheetId,
    persistedSheetId: created.id
  }

  if (created.id !== params.requestedSheetId) {
    ctx.createdSheetIdAliasesRef.current.set(params.requestedSheetId, created.id)
    ctx.pendingCreatedSheetReconciliationRef.current = {
      temporarySheetId: params.requestedSheetId,
      persistedSheetId: created.id
    }
    ctx.latestUniverDataRef.current = reconcileTemporarySheetIdReferences({
      temporarySheetId: params.requestedSheetId,
      persistedSheetId: created.id,
      peerSheetDataCache: ctx.peerSheetDataCacheRef.current,
      pendingUniverRowsBySheet: ctx.pendingUniverRowsBySheetRef.current,
      pendingSnapshotClearCells: ctx.pendingSnapshotClearCellsRef.current,
      pendingSnapshotCheckpoints: ctx.pendingSnapshotCheckpointBySheetRef.current,
      knownSheetVersions: ctx.knownSheetVersionsRef.current,
      pendingCellChanges: ctx.pendingCellChangesRef.current,
      pendingCellBatches: ctx.pendingCellBatchesRef.current,
      latestUniverData: ctx.latestUniverDataRef.current
    })
  }

  if (ctx.ensureRemoteSheetInLiveWorkbook && !params.skipLiveWorkbookMaterialization) {
    const rawSheet = {
      ...(created as unknown as Record<string, unknown>),
      ...(created.worksheetSnapshot ? { worksheetSnapshot: created.worksheetSnapshot } : {})
    }
    ctx.ensureRemoteSheetInLiveWorkbook(rawSheet, params.liveWorkbookInsertIndex)
  }

  ctx.onPersistedSheetReady?.()

  return created
}

export interface PersistSpreadsheetSheetRenameParams {
  sheetId: string
  sheetName: string
  currentSheetVersion?: number
  mutationFacade: SpreadsheetMutationFacade
  getRowsToPreserve: (sheetId: string) => ViewerRow[]
  peerSheetDataCacheRef: MutableRefObject<Map<string, ViewerRow[]>>
  authoritativePeerSheetDataCacheRef: MutableRefObject<Set<string>>
  applyLocalAppUpdate: SpreadsheetLocalAppUpdater
  rememberKnownSheetVersion?: (sheetId: string, version: number) => void
  rememberSheetVersion?: (sheetId: string, version: number) => void
  renameRemoteSheetInLiveWorkbook?: (sheetId: string, sheetName: string) => void
  queueSnapshotCheckpoint?: (sheetId: string) => void
}

export const persistSpreadsheetSheetRename = async (
  params: PersistSpreadsheetSheetRenameParams
): Promise<{ updatedSheet: SpreadsheetSheet; updatedVersion: number; latestRowsToPreserve: ViewerRow[] }> => {
  const trimmedName = params.sheetName.trim()
  const updatedSheet = await params.mutationFacade.renameSheet(params.sheetId, params.sheetName)
  const updatedVersion = Number(updatedSheet?.version ?? params.currentSheetVersion ?? 0)
  if (Number.isFinite(updatedVersion) && updatedVersion >= 0) {
    params.rememberKnownSheetVersion?.(params.sheetId, updatedVersion)
    params.rememberSheetVersion?.(params.sheetId, updatedVersion)
  }
  params.renameRemoteSheetInLiveWorkbook?.(params.sheetId, trimmedName)

  const latestRowsToPreserve = params.getRowsToPreserve(params.sheetId)
  params.peerSheetDataCacheRef.current.set(params.sheetId, [...latestRowsToPreserve])
  params.authoritativePeerSheetDataCacheRef.current.add(params.sheetId)
  params.applyLocalAppUpdate(currentApp => ({
    ...currentApp,
    sheets: currentApp.sheets.map(sheet =>
      sheet.id === params.sheetId
        ? {
            ...sheet,
            ...(updatedSheet ?? {}),
            name: trimmedName,
            data: latestRowsToPreserve
          }
        : sheet
    )
  }))
  params.queueSnapshotCheckpoint?.(params.sheetId)

  return { updatedSheet, updatedVersion, latestRowsToPreserve }
}

export function applyOptimisticSpreadsheetSheetRenameToLocalApp(
  sheetId: string,
  displayName: string,
  getRowsToPreserve: (sheetId: string) => ViewerRow[],
  ctx: Pick<
    PersistSpreadsheetSheetRenameParams,
    'peerSheetDataCacheRef' | 'authoritativePeerSheetDataCacheRef' | 'applyLocalAppUpdate'
  >
): void {
  const latestRowsToPreserve = getRowsToPreserve(sheetId)
  ctx.peerSheetDataCacheRef.current.set(sheetId, [...latestRowsToPreserve])
  ctx.authoritativePeerSheetDataCacheRef.current.add(sheetId)
  ctx.applyLocalAppUpdate(currentApp => ({
    ...currentApp,
    sheets: currentApp.sheets.map(sheet =>
      sheet.id === sheetId ? { ...sheet, name: displayName, data: latestRowsToPreserve } : sheet
    )
  }))
}

export interface QueuePersistSpreadsheetSheetRenameAfterCellFlushParams {
  operationQueueRef: MutableRefObject<Promise<void>>
  chainOnOperationQueue: (queueRef: MutableRefObject<Promise<void>>, fn: () => Promise<void>) => Promise<void>
  processUniverDataChange: () => Promise<void>
  flushPendingCellChanges: () => Promise<void>
  rename: PersistSpreadsheetSheetRenameParams
  onSuccess?: (result: Awaited<ReturnType<typeof persistSpreadsheetSheetRename>>) => void
  onError?: (error: unknown) => void
}

export function queuePersistSpreadsheetSheetRenameAfterCellFlush(
  params: QueuePersistSpreadsheetSheetRenameAfterCellFlushParams
): Promise<void> {
  return params.chainOnOperationQueue(params.operationQueueRef, async () => {
    try {
      await params.processUniverDataChange()
      await params.flushPendingCellChanges()
      const result = await persistSpreadsheetSheetRename(params.rename)
      params.onSuccess?.(result)
    } catch (error) {
      params.onError?.(error)
    }
  })
}

export interface PersistSpreadsheetSheetDeleteParams {
  sheetId: string
  activeSheetId: string
  nextActiveSheetId?: string
  mutationFacade: SpreadsheetMutationFacade
  removeRemoteSheetFromLiveWorkbook?: (sheetId: string) => void
  setActiveSheetId?: (sheetId: string) => void
}

export const persistSpreadsheetSheetDelete = async (params: PersistSpreadsheetSheetDeleteParams): Promise<boolean> => {
  try {
    await params.mutationFacade.deleteSheet(params.sheetId)
  } catch {
    return false
  }

  params.removeRemoteSheetFromLiveWorkbook?.(params.sheetId)
  if (params.sheetId === params.activeSheetId && params.nextActiveSheetId) {
    params.setActiveSheetId?.(params.nextActiveSheetId)
  }
  return true
}
