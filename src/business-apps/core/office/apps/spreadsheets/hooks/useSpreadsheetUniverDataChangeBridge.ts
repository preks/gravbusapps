import { useCallback, useEffect, useRef, type MutableRefObject } from 'react'

import { resolveReconciledSheetId } from '../utils/reconcileTemporarySheetId'
import { scheduleCoalescedTimeout } from '../utils/collaborationRepairScheduler'

export interface UseSpreadsheetUniverDataChangeBridgeParams {
  activeSheetIdRef: MutableRefObject<string>
  createdSheetIdAliasesRef: MutableRefObject<Map<string, string>>
  latestUniverDataRef: MutableRefObject<{ data: Record<string, unknown>[]; sheetId: string } | null>
  pendingUniverRowsBySheetRef: MutableRefObject<
    Map<string, { data: Record<string, unknown>[]; persistedRows: Record<string, unknown>[] }>
  >
  peerSheetDataCacheRef: MutableRefObject<Map<string, Record<string, unknown>[]>>
  authoritativePeerSheetDataCacheRef: MutableRefObject<Set<string>>
  lastProcessedLengthRef: MutableRefObject<number>
  univerDataChangeTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
  operationQueueRef: MutableRefObject<Promise<void>>
  chainOnOperationQueue: (queueRef: MutableRefObject<Promise<void>>, fn: () => Promise<void>) => Promise<void>
  processUniverDataChangeRef: MutableRefObject<() => Promise<void>>
  getKnownRowsForSheet: (sheetId: string) => Record<string, unknown>[]
  getActiveSessionRows: () => Record<string, unknown>[]
  summarizeRowsForDebug: (rows: Record<string, unknown>[] | undefined) => Record<string, unknown>
  multiSheetDebugLog: (event: string, meta?: Record<string, unknown> | (() => Record<string, unknown>)) => void
  univerDataChangeDebounceMs: number
  canEditWithLock: boolean
  entityEnabled: boolean
}

export interface UseSpreadsheetUniverDataChangeBridgeResult {
  handleUniverDataChange: (newData: Record<string, unknown>[], sourceSheetId?: string) => void
}

export function useSpreadsheetUniverDataChangeBridge(
  params: UseSpreadsheetUniverDataChangeBridgeParams
): UseSpreadsheetUniverDataChangeBridgeResult {
  const {
    activeSheetIdRef,
    createdSheetIdAliasesRef,
    latestUniverDataRef,
    pendingUniverRowsBySheetRef,
    peerSheetDataCacheRef,
    authoritativePeerSheetDataCacheRef,
    lastProcessedLengthRef,
    univerDataChangeTimeoutRef,
    operationQueueRef,
    chainOnOperationQueue,
    processUniverDataChangeRef,
    getKnownRowsForSheet,
    getActiveSessionRows,
    summarizeRowsForDebug,
    multiSheetDebugLog,
    univerDataChangeDebounceMs,
    canEditWithLock,
    entityEnabled
  } = params

  const handleUniverDataChange = useCallback(
    (newData: Record<string, unknown>[], sourceSheetId?: string) => {
      const canonicalActiveSheetId = resolveReconciledSheetId(
        activeSheetIdRef.current,
        createdSheetIdAliasesRef.current
      )
      const effectiveSheetId = resolveReconciledSheetId(
        sourceSheetId || activeSheetIdRef.current,
        createdSheetIdAliasesRef.current
      )
      multiSheetDebugLog('univer_data_change', () => ({
        sourceSheetId: sourceSheetId ?? null,
        effectiveSheetId,
        canonicalActiveSheetId,
        newData: summarizeRowsForDebug(newData),
        localSheetData: summarizeRowsForDebug(getActiveSessionRows()),
        lastProcessedLength: lastProcessedLengthRef.current
      }))
      if (effectiveSheetId !== canonicalActiveSheetId) {
        const persistedRows = getKnownRowsForSheet(effectiveSheetId)
        peerSheetDataCacheRef.current.set(effectiveSheetId, [...newData])
        if (newData.length > persistedRows.length) {
          pendingUniverRowsBySheetRef.current.set(effectiveSheetId, {
            data: [...newData],
            persistedRows: [...persistedRows]
          })
          latestUniverDataRef.current = { data: newData, sheetId: effectiveSheetId }
          scheduleCoalescedTimeout(univerDataChangeTimeoutRef, 0, () => {
            univerDataChangeTimeoutRef.current = null
            void chainOnOperationQueue(operationQueueRef, () => processUniverDataChangeRef.current())
          })
        } else {
          pendingUniverRowsBySheetRef.current.delete(effectiveSheetId)
          authoritativePeerSheetDataCacheRef.current.delete(effectiveSheetId)
        }
        return
      }
      latestUniverDataRef.current = { data: newData, sheetId: effectiveSheetId }
      pendingUniverRowsBySheetRef.current.delete(effectiveSheetId)
      const hasAddedRows = newData.length > lastProcessedLengthRef.current
      if (hasAddedRows && univerDataChangeTimeoutRef.current) {
        clearTimeout(univerDataChangeTimeoutRef.current)
        univerDataChangeTimeoutRef.current = null
      }
      scheduleCoalescedTimeout(univerDataChangeTimeoutRef, hasAddedRows ? 0 : univerDataChangeDebounceMs, () => {
        univerDataChangeTimeoutRef.current = null
        void chainOnOperationQueue(operationQueueRef, () => processUniverDataChangeRef.current())
      })
    },
    [
      activeSheetIdRef,
      authoritativePeerSheetDataCacheRef,
      chainOnOperationQueue,
      createdSheetIdAliasesRef,
      getActiveSessionRows,
      getKnownRowsForSheet,
      lastProcessedLengthRef,
      latestUniverDataRef,
      multiSheetDebugLog,
      operationQueueRef,
      peerSheetDataCacheRef,
      pendingUniverRowsBySheetRef,
      processUniverDataChangeRef,
      summarizeRowsForDebug,
      univerDataChangeDebounceMs,
      univerDataChangeTimeoutRef
    ]
  )

  const prevCanEditWithLockRef = useRef<boolean | null>(null)
  useEffect(() => {
    const prev = prevCanEditWithLockRef.current
    prevCanEditWithLockRef.current = canEditWithLock
    if (entityEnabled) return
    if (prev === null) return
    if (prev || !canEditWithLock) return
    void chainOnOperationQueue(operationQueueRef, () => processUniverDataChangeRef.current())
  }, [canEditWithLock, entityEnabled, chainOnOperationQueue, operationQueueRef, processUniverDataChangeRef])

  return { handleUniverDataChange }
}
