import { useCallback, useEffect, useRef, type MutableRefObject } from 'react'

import type { SpreadsheetSession } from '../core'
import { SpreadsheetApiService } from '../services/SpreadsheetApiService'
import type { CollaborationOperation } from '../services/SpreadsheetCollaborationManager'
import type { SpreadsheetSheet } from '../types'

export interface UseSpreadsheetSheetVersionModelParams {
  appId: string
  spreadsheetSessionRef: MutableRefObject<SpreadsheetSession | null>
  activeSheetIdRef: MutableRefObject<string>
  appSheetsRef: MutableRefObject<SpreadsheetSheet[]>
  /** Used to seed per-sheet versions when `app.sheets` updates. */
  sheets: SpreadsheetSheet[]
  activeSheetId: string
  /** Triggers active-sheet version reconciliation when metadata changes. */
  activeSheetVersion: number | undefined
}

/**
 * Centralizes sheet version bookkeeping: session-backed versions, known-version cache,
 * API refresh before writes, and short-lived maps that suppress collaboration echoes for
 * locally committed ops.
 */
export function useSpreadsheetSheetVersionModel(params: UseSpreadsheetSheetVersionModelParams) {
  const sheetVersionRef = useRef<number>(0)
  const workbookSnapshotVersionRef = useRef<number>(0)
  const sheetVersionsRef = useRef<Map<string, number>>(new Map())
  const sheetVersionSyncSheetIdRef = useRef<string>('')
  const knownSheetVersionsRef = useRef<Map<string, { version: number; fetchedAt: number }>>(new Map())
  const inFlightSheetVersionRefreshesRef = useRef<Map<string, Promise<number>>>(new Map())
  const recentLocalCommittedVersionsRef = useRef<Map<number, number>>(new Map())
  const recentLocalBatchIdsRef = useRef<Map<string, { expiresAt: number; tabId?: string }>>(new Map())

  const rememberSheetVersion = useCallback(
    (sheetId: string, version: number | undefined) => {
      if (typeof version !== 'number' || !Number.isFinite(version) || version < 0) return
      const normalizedVersion = Math.trunc(version)
      const session = params.spreadsheetSessionRef.current
      const sessionSheetState = session?.getSheetState(sheetId)
      const targetSheet = params.appSheetsRef.current.find(sheet => sheet.id === sheetId)
      if (session && sessionSheetState && targetSheet && normalizedVersion > sessionSheetState.version) {
        session.replaceSheetState(targetSheet, sessionSheetState.rows, normalizedVersion)
      }
      const currentVersion = sheetVersionsRef.current.get(sheetId)
      if (currentVersion == null || normalizedVersion > currentVersion) {
        sheetVersionsRef.current.set(sheetId, normalizedVersion)
      }
      if (sheetId === params.activeSheetIdRef.current && normalizedVersion > sheetVersionRef.current) {
        sheetVersionRef.current = normalizedVersion
      }
    },
    [params.activeSheetIdRef, params.appSheetsRef, params.spreadsheetSessionRef]
  )

  const resolveKnownSheetVersion = useCallback(
    (sheetId: string): number => {
      const sessionVersion = params.spreadsheetSessionRef.current?.getSheetState(sheetId)?.version
      const trackedVersion = sheetVersionsRef.current.get(sheetId)
      const appSheetVersionRaw = params.appSheetsRef.current.find(sheet => sheet.id === sheetId)?.version
      const knownFromNetwork = knownSheetVersionsRef.current.get(sheetId)?.version

      const appParsed = Number(appSheetVersionRaw ?? 0)
      const appSheetVersion = Number.isFinite(appParsed) ? Math.trunc(appParsed) : null

      const candidates = [
        typeof sessionVersion === 'number' && Number.isFinite(sessionVersion) ? Math.trunc(sessionVersion) : null,
        typeof trackedVersion === 'number' && Number.isFinite(trackedVersion) ? Math.trunc(trackedVersion) : null,
        appSheetVersion,
        typeof knownFromNetwork === 'number' && Number.isFinite(knownFromNetwork) ? Math.trunc(knownFromNetwork) : null
      ].filter((v): v is number => typeof v === 'number' && v >= 0)

      return candidates.length > 0 ? Math.max(...candidates) : 0
    },
    [params.appSheetsRef, params.spreadsheetSessionRef]
  )

  useEffect(() => {
    for (const sheet of params.sheets) {
      rememberSheetVersion(sheet.id, Number(sheet.version ?? 0))
    }
  }, [params.sheets, rememberSheetVersion])

  const rememberKnownSheetVersion = useCallback((targetSheetId: string, version: number | undefined) => {
    if (typeof version !== 'number' || !Number.isFinite(version) || version < 0) return
    knownSheetVersionsRef.current.set(targetSheetId, {
      version: Math.trunc(version),
      fetchedAt: Date.now()
    })
  }, [])

  const updateActiveSheetVersion = useCallback(
    (version: number | undefined, strategy: 'set' | 'max' = 'max') => {
      if (typeof version !== 'number' || !Number.isFinite(version) || version < 0) return
      const normalizedVersion = Math.trunc(version)
      const activeId = params.activeSheetIdRef.current
      const session = params.spreadsheetSessionRef.current
      const sheetMeta = params.appSheetsRef.current.find(sheet => sheet.id === activeId)
      const sheetState = session?.getSheetState(activeId)
      const mergedVersion =
        strategy === 'set'
          ? normalizedVersion
          : Math.max(sheetVersionRef.current, normalizedVersion, sheetState?.version ?? 0)
      if (session && sheetMeta && sheetState) {
        session.replaceSheetState(sheetMeta, sheetState.rows, mergedVersion)
      }
      sheetVersionRef.current = mergedVersion
      rememberKnownSheetVersion(activeId, mergedVersion)
      const currentTracked = sheetVersionsRef.current.get(activeId)
      if (currentTracked == null || mergedVersion > currentTracked) {
        sheetVersionsRef.current.set(activeId, mergedVersion)
      }
    },
    [params.activeSheetIdRef, params.appSheetsRef, params.spreadsheetSessionRef, rememberKnownSheetVersion]
  )

  const getKnownSheetVersion = useCallback((targetSheetId: string, fallbackVersion: number): number => {
    const normalizedFallback =
      Number.isFinite(fallbackVersion) && fallbackVersion >= 0 ? Math.trunc(fallbackVersion) : 0
    const cached = knownSheetVersionsRef.current.get(targetSheetId)
    return Math.max(normalizedFallback, cached?.version ?? 0)
  }, [])

  const refreshBaseVersionBeforeWrite = useCallback(
    async (targetSheetId: string, fallbackVersion: number): Promise<number> => {
      const knownVersion = getKnownSheetVersion(targetSheetId, fallbackVersion)
      const inFlight = inFlightSheetVersionRefreshesRef.current.get(targetSheetId)
      if (inFlight) return inFlight

      const request = (async () => {
        try {
          const sheet = await SpreadsheetApiService.getSheet(params.appId, targetSheetId)
          const fetchedVersion = Number(sheet?.version ?? knownVersion)
          if (!Number.isFinite(fetchedVersion)) return knownVersion
          const nextVersion = Math.trunc(fetchedVersion)
          rememberKnownSheetVersion(targetSheetId, nextVersion)
          rememberSheetVersion(targetSheetId, nextVersion)
          return nextVersion
        } catch {
          return knownVersion
        } finally {
          inFlightSheetVersionRefreshesRef.current.delete(targetSheetId)
        }
      })()

      inFlightSheetVersionRefreshesRef.current.set(targetSheetId, request)
      return request
    },
    [getKnownSheetVersion, params.appId, rememberKnownSheetVersion, rememberSheetVersion]
  )

  useEffect(() => {
    const nextVersion = Math.max(Number(params.activeSheetVersion ?? 0), resolveKnownSheetVersion(params.activeSheetId))
    rememberSheetVersion(params.activeSheetId, nextVersion)
    rememberKnownSheetVersion(params.activeSheetId, nextVersion)
    if (sheetVersionSyncSheetIdRef.current !== params.activeSheetId) {
      sheetVersionSyncSheetIdRef.current = params.activeSheetId
      updateActiveSheetVersion(nextVersion, 'set')
      return
    }
    if (Number.isFinite(nextVersion) && nextVersion > sheetVersionRef.current) {
      updateActiveSheetVersion(nextVersion, 'max')
    }
  }, [
    params.activeSheetId,
    params.activeSheetVersion,
    rememberKnownSheetVersion,
    rememberSheetVersion,
    resolveKnownSheetVersion,
    updateActiveSheetVersion
  ])

  const rememberLocalCommittedVersion = useCallback((version: number | undefined) => {
    if (typeof version !== 'number' || !Number.isFinite(version) || version < 0) return
    const expiresAt = Date.now() + 15000
    const next = new Map(recentLocalCommittedVersionsRef.current)
    next.set(Math.trunc(version), expiresAt)
    for (const [candidateVersion, candidateExpiresAt] of next) {
      if (candidateExpiresAt <= Date.now()) next.delete(candidateVersion)
    }
    recentLocalCommittedVersionsRef.current = next
  }, [])

  const rememberRecentLocalBatchId = useCallback((batchId: string | undefined, tabId?: string | undefined) => {
    const normalizedBatchId = typeof batchId === 'string' ? batchId.trim() : ''
    if (!normalizedBatchId) return
    const expiresAt = Date.now() + 15000
    const normalizedTabId = typeof tabId === 'string' && tabId.trim() ? tabId.trim() : undefined
    const next = new Map(recentLocalBatchIdsRef.current)
    next.set(normalizedBatchId, { expiresAt, tabId: normalizedTabId })
    const now = Date.now()
    for (const [candidateBatchId, entry] of next) {
      if (entry.expiresAt <= now) next.delete(candidateBatchId)
    }
    recentLocalBatchIdsRef.current = next
  }, [])

  const isRecentLocalBatchId = useCallback((batchId: string | undefined, tabId?: string | undefined): boolean => {
    const batchIdRaw = typeof batchId === 'string' ? batchId.trim() : ''
    if (!batchIdRaw) return false
    const wireTabIdRaw = typeof tabId === 'string' ? tabId.trim() : ''
    const now = Date.now()
    const nextBatches = new Map(recentLocalBatchIdsRef.current)
    for (const [candidateBatchId, entry] of nextBatches) {
      if (entry.expiresAt <= now) nextBatches.delete(candidateBatchId)
    }
    recentLocalBatchIdsRef.current = nextBatches
    const stored = nextBatches.get(batchIdRaw)
    if (!stored) return false
    const tabMismatch = Boolean(wireTabIdRaw && stored.tabId && wireTabIdRaw !== stored.tabId)
    return !tabMismatch
  }, [])

  const shouldIgnoreRecentlyCommittedOperation = useCallback(
    (operation: CollaborationOperation): boolean => {
      const nestedOperation = operation.operation as { version?: unknown } | undefined
      const operationType = typeof operation.operation?.type === 'string' ? operation.operation.type : ''
      const operationData = operation.operation?.data as { batchId?: unknown; tabId?: unknown } | undefined
      const batchIdRaw = typeof operationData?.batchId === 'string' ? operationData.batchId.trim() : ''
      const wireTabIdRaw = typeof operationData?.tabId === 'string' ? operationData.tabId.trim() : ''
      const isBroadcastOnly = operation.operation?.broadcastOnly === true
      if (operationType === 'batch_operations' && batchIdRaw && isRecentLocalBatchId(batchIdRaw, wireTabIdRaw)) {
        return true
      }
      if (isBroadcastOnly || operationType === 'cells_changed') {
        return false
      }
      const version =
        typeof operation.version === 'number'
          ? Math.trunc(operation.version)
          : typeof nestedOperation?.version === 'number'
            ? Math.trunc(nestedOperation.version)
            : null
      if (version == null || !Number.isFinite(version) || version < 0) {
        return false
      }

      const now = Date.now()
      const next = new Map(recentLocalCommittedVersionsRef.current)
      for (const [candidateVersion, candidateExpiresAt] of next) {
        if (candidateExpiresAt <= now) next.delete(candidateVersion)
      }
      recentLocalCommittedVersionsRef.current = next
      return next.has(version)
    },
    [isRecentLocalBatchId]
  )

  return {
    sheetVersionRef,
    workbookSnapshotVersionRef,
    knownSheetVersionsRef,
    rememberSheetVersion,
    resolveKnownSheetVersion,
    rememberKnownSheetVersion,
    getKnownSheetVersion,
    updateActiveSheetVersion,
    refreshBaseVersionBeforeWrite,
    rememberLocalCommittedVersion,
    rememberRecentLocalBatchId,
    isRecentLocalBatchId,
    shouldIgnoreRecentlyCommittedOperation
  }
}
