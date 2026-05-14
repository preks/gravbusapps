import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'

import type { SpreadsheetApp, SpreadsheetSheet } from '../types'
import { SpreadsheetSessionMutationSources, type SpreadsheetSession } from '../core'
import type { SpreadsheetCollaborationManager } from '../services/SpreadsheetCollaborationManager'
import type { UniverSheetGridHandle } from '../components/UniverSheetGrid.types'
import { sortSpreadsheetRowsBySheetSettings } from '../utils/spreadsheetSheetRowSort'
import type { AuthoritativeGridRegion } from '../utils/spreadsheetAuthoritativeRegion'
import { reconcilePeerSheetCachesFromAppSheets } from '../utils/spreadsheetViewerPeerCacheReconcile'

import type { CommitLocalSheetDataOptions } from './spreadsheetViewerSessionTypes'
import { useSpreadsheetActiveSheetPeerRestore } from './useSpreadsheetActiveSheetPeerRestore'
import { useSpreadsheetViewerRowResolution } from './useSpreadsheetViewerRowResolution'

export type { CommitLocalSheetDataOptions } from './spreadsheetViewerSessionTypes'

export interface UseSpreadsheetViewerSessionModelParams {
  app: Pick<SpreadsheetApp, 'id' | 'sheets'>
  spreadsheetSession: SpreadsheetSession
  activeSheet: SpreadsheetSheet
  activeSheetId: string
  activeSheetIdRef: MutableRefObject<string>
  appSheetsRef: MutableRefObject<SpreadsheetSheet[]>
  sheetVersionRef: MutableRefObject<number>
  rememberSheetVersion: (sheetId: string, version: number | undefined) => void
  updateActiveSheetVersion: (version: number | undefined, strategy?: 'set' | 'max') => void
  resolveKnownSheetVersion: (sheetId: string) => number
  getActiveSessionRows: () => Record<string, unknown>[]
  applyLocalAppUpdate: (updater: (currentApp: SpreadsheetApp) => SpreadsheetApp) => void
  onDataChange?: (sheetId: string, rows: Record<string, unknown>[]) => void
  collaborationManagerRef: MutableRefObject<SpreadsheetCollaborationManager | null>
  preferUniverNativeSheetTabs: boolean
  spreadsheetGridRef: MutableRefObject<UniverSheetGridHandle | null>
  pendingUniverRowsBySheetRef: MutableRefObject<
    Map<string, { data: Record<string, unknown>[]; persistedRows: Record<string, unknown>[] }>
  >
  latestUniverDataRef: MutableRefObject<{ data: Record<string, unknown>[]; sheetId: string } | null>
  setActiveSheetId: (nextId: string) => void
  onRowsStateUpdated?: (
    sheetId: string,
    rows: Record<string, unknown>[],
    meta: {
      persisted: boolean
      activeSheet: boolean
      source: 'commit_local' | 'sync_sheet_rows'
      version?: number
    }
  ) => void
}

export function useSpreadsheetViewerSessionModel(params: UseSpreadsheetViewerSessionModelParams) {
  const peerSheetDataCacheRef = useRef<Map<string, Record<string, unknown>[]>>(new Map())
  const authoritativePeerSheetDataCacheRef = useRef<Set<string>>(new Set())
  const commitLocalSheetDataRef = useRef<
    ((next: Record<string, unknown>[], options?: CommitLocalSheetDataOptions) => void) | null
  >(null)

  const [authoritativeDataSyncToken, setAuthoritativeDataSyncToken] = useState(0)

  const canonicalActiveSheetRowsSourceRef = useRef<() => Record<string, unknown>[]>(() => [])
  canonicalActiveSheetRowsSourceRef.current = () => {
    const sheetState = params.spreadsheetSession.getSheetState(params.activeSheetId)
    if (sheetState) return sheetState.rows
    const sheetMeta = params.appSheetsRef.current.find(sheet => sheet.id === params.activeSheetId)
    return sortSpreadsheetRowsBySheetSettings(sheetMeta?.data ?? [], sheetMeta)
  }

  const getActiveSessionVersion = useCallback(
    (): number => params.spreadsheetSession.getActiveSheetState()?.version ?? params.sheetVersionRef.current,
    [params.spreadsheetSession]
  )

  const setActiveSheetIdWithPeerCache = useCallback(
    (nextId: string) => {
      if (!params.preferUniverNativeSheetTabs) {
        params.setActiveSheetId(nextId)
        return
      }
      if (params.activeSheetId === nextId) return
      peerSheetDataCacheRef.current.set(params.activeSheetId, [...params.getActiveSessionRows()])
      authoritativePeerSheetDataCacheRef.current.add(params.activeSheetId)
      params.setActiveSheetId(nextId)
    },
    [params.activeSheetId, params.getActiveSessionRows, params.preferUniverNativeSheetTabs, params.setActiveSheetId]
  )

  useEffect(() => {
    reconcilePeerSheetCachesFromAppSheets({
      sheets: params.app.sheets,
      activeSheetId: params.activeSheetIdRef.current,
      getActiveSessionRows: params.getActiveSessionRows,
      pendingUniverRowsBySheet: params.pendingUniverRowsBySheetRef.current,
      peerSheetDataCache: peerSheetDataCacheRef.current,
      authoritativePeerSheetDataCache: authoritativePeerSheetDataCacheRef.current
    })
  }, [params.app.sheets, params.getActiveSessionRows])

  useEffect(() => {
    authoritativePeerSheetDataCacheRef.current.clear()
  }, [params.app.id])

  const { getKnownRowsForSheet, getSessionBackedRowsForSheet, getRichestKnownRowsForSheet } =
    useSpreadsheetViewerRowResolution({
      spreadsheetSession: params.spreadsheetSession,
      appSheets: params.app.sheets,
      activeSheetIdRef: params.activeSheetIdRef,
      peerSheetDataCacheRef,
      authoritativePeerSheetDataCacheRef,
      pendingUniverRowsBySheetRef: params.pendingUniverRowsBySheetRef,
      latestUniverDataRef: params.latestUniverDataRef
    })

  const applyActiveSheetRowsToSession = useCallback(
    (
      next: Record<string, unknown>[],
      options?: {
        persisted?: boolean
        replaceSheetVersion?: number
      }
    ) => {
      const resolvedReplaceVersion =
        typeof options?.replaceSheetVersion === 'number' &&
        Number.isFinite(options.replaceSheetVersion) &&
        options.replaceSheetVersion >= 0
          ? Math.trunc(options.replaceSheetVersion)
          : getActiveSessionVersion()
      params.spreadsheetSession.replaceSheetState(params.activeSheet, next, resolvedReplaceVersion)
      if (options?.persisted) {
        params.spreadsheetSession.clearDirty(params.activeSheetId)
        params.spreadsheetSession.capturePersistedBaseline(params.activeSheetId)
      } else {
        params.spreadsheetSession.applyMutation({
          sheetId: params.activeSheetId,
          operations: [],
          source: SpreadsheetSessionMutationSources.LocalEdit
        })
      }
    },
    [params.activeSheet, params.activeSheetId, getActiveSessionVersion, params.spreadsheetSession]
  )

  const mirrorActiveSheetRowsToViewerUi = useCallback(
    (
      next: Record<string, unknown>[],
      options?: {
        persisted?: boolean
        syncGrid?: boolean
        publishParent?: boolean
        peerAuthoritative?: boolean
      }
    ) => {
      peerSheetDataCacheRef.current.set(params.activeSheetId, [...next])
      if (options?.persisted || options?.peerAuthoritative) {
        authoritativePeerSheetDataCacheRef.current.add(params.activeSheetId)
      }
      if (options?.syncGrid) {
        setAuthoritativeDataSyncToken(prev => prev + 1)
      }
      if (options?.publishParent !== false) {
        params.onDataChange?.(params.activeSheetId, next)
      }
    },
    [params.activeSheetId, params.onDataChange]
  )

  const commitLocalSheetData = useCallback(
    (next: Record<string, unknown>[], options?: CommitLocalSheetDataOptions) => {
      applyActiveSheetRowsToSession(next, {
        persisted: options?.persisted,
        replaceSheetVersion: options?.replaceSheetVersion
      })
      mirrorActiveSheetRowsToViewerUi(next, {
        persisted: options?.persisted,
        syncGrid: options?.syncGrid,
        publishParent: options?.publishParent,
        peerAuthoritative: options?.peerAuthoritative
      })
      params.onRowsStateUpdated?.(params.activeSheetId, next, {
        persisted: Boolean(options?.persisted),
        activeSheet: true,
        source: 'commit_local'
      })
      queueMicrotask(() => params.collaborationManagerRef.current?.tryFlushDeferredCellEmits())
    },
    [
      applyActiveSheetRowsToSession,
      mirrorActiveSheetRowsToViewerUi,
      params.activeSheetId,
      params.collaborationManagerRef,
      params.onRowsStateUpdated
    ]
  )
  commitLocalSheetDataRef.current = commitLocalSheetData

  const commitOptimisticActiveSheetRows = useCallback(
    (next: Record<string, unknown>[]) => {
      commitLocalSheetData(next, { persisted: false, syncGrid: false, publishParent: false })
    },
    [commitLocalSheetData]
  )

  useSpreadsheetActiveSheetPeerRestore({
    activeSheet: params.activeSheet,
    activeSheetId: params.activeSheetId,
    preferUniverNativeSheetTabs: params.preferUniverNativeSheetTabs,
    spreadsheetGridRef: params.spreadsheetGridRef,
    peerSheetDataCacheRef,
    authoritativePeerSheetDataCacheRef,
    resolveKnownSheetVersion: params.resolveKnownSheetVersion,
    commitLocalSheetData,
    setAuthoritativeDataSyncToken
  })

  const syncSheetRowsIntoLocalState = useCallback(
    (
      targetSheetId: string,
      rows: Record<string, unknown>[],
      options?: {
        persisted?: boolean
        syncGrid?: boolean
        version?: number
        recoveredSheetMeta?: SpreadsheetSheet
        /** When set with syncGrid, limits authoritative Univer re-sync to this row/col bounding box. */
        authoritativeGridRegion?: AuthoritativeGridRegion | null
      }
    ) => {
      const recoveredSheetMeta = options?.recoveredSheetMeta
      if (typeof options?.version === 'number') {
        params.rememberSheetVersion(targetSheetId, options.version)
        if (targetSheetId === params.activeSheetIdRef.current) {
          params.updateActiveSheetVersion(options.version, 'set')
        }
      }
      peerSheetDataCacheRef.current.set(targetSheetId, rows)
      if (options?.persisted || typeof options?.version === 'number') {
        authoritativePeerSheetDataCacheRef.current.add(targetSheetId)
      }
      params.applyLocalAppUpdate(currentApp => ({
        ...currentApp,
        sheets: currentApp.sheets.map(sheet =>
          sheet.id !== targetSheetId
            ? sheet
            : {
                ...sheet,
                ...(recoveredSheetMeta ?? {}),
                data: rows,
                version: typeof options?.version === 'number' ? options.version : sheet.version,
                columns: Array.isArray(recoveredSheetMeta?.columns) ? recoveredSheetMeta.columns : sheet.columns
              }
        )
      }))
      const targetSheet =
        recoveredSheetMeta ??
        params.appSheetsRef.current.find(sheet => sheet.id === targetSheetId) ??
        params.activeSheet
      params.spreadsheetSession.replaceSheetState(targetSheet, rows, options?.version)
      if (options?.persisted) {
        params.spreadsheetSession.clearDirty(targetSheetId)
        if (targetSheetId !== params.activeSheetIdRef.current) {
          params.spreadsheetSession.capturePersistedBaseline(targetSheetId)
        }
      }
      if (targetSheetId === params.activeSheetIdRef.current) {
        if (options?.syncGrid && options.authoritativeGridRegion) {
          params.spreadsheetGridRef.current?.prepareAuthoritativeRegionSync?.(options.authoritativeGridRegion)
        }
        mirrorActiveSheetRowsToViewerUi(rows, {
          persisted: options?.persisted,
          syncGrid: options?.syncGrid,
          publishParent: true,
          peerAuthoritative: Boolean(options?.persisted || typeof options?.version === 'number')
        })
        queueMicrotask(() => params.collaborationManagerRef.current?.tryFlushDeferredCellEmits())
      }
      params.onRowsStateUpdated?.(targetSheetId, rows, {
        persisted: Boolean(options?.persisted || typeof options?.version === 'number'),
        activeSheet: targetSheetId === params.activeSheetIdRef.current,
        source: 'sync_sheet_rows',
        version: options?.version
      })
    },
    [
      params.activeSheet,
      params.applyLocalAppUpdate,
      mirrorActiveSheetRowsToViewerUi,
      params.rememberSheetVersion,
      params.spreadsheetSession,
      params.updateActiveSheetVersion,
      params.activeSheetIdRef,
      params.appSheetsRef,
      params.collaborationManagerRef,
      params.onRowsStateUpdated,
      params.spreadsheetGridRef
    ]
  )

  return {
    peerSheetDataCacheRef,
    authoritativePeerSheetDataCacheRef,
    commitLocalSheetDataRef,
    canonicalActiveSheetRowsSourceRef,
    authoritativeDataSyncToken,
    setActiveSheetIdWithPeerCache,
    getKnownRowsForSheet,
    getActiveSessionVersion,
    getSessionBackedRowsForSheet,
    getRichestKnownRowsForSheet,
    commitLocalSheetData,
    commitOptimisticActiveSheetRows,
    syncSheetRowsIntoLocalState
  }
}
