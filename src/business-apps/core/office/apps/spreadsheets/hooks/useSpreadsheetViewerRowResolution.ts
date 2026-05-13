import { useCallback, type MutableRefObject } from 'react'

import type { SpreadsheetSheet } from '../types'
import type { SpreadsheetSession } from '../core'
import {
  resolveKnownRowsForSheetFromSources,
  resolveRichestKnownRowsForSheet
} from '../utils/spreadsheetSessionRowResolution'
import { sortSpreadsheetRowsBySheetSettings } from '../utils/spreadsheetSheetRowSort'
import {
  isSpreadsheetAppsDebugEnabled,
  multiSheetDebugLog,
  summarizeRowsForDebug
} from '../utils/spreadsheetViewerDebug'

export interface UseSpreadsheetViewerRowResolutionParams {
  spreadsheetSession: SpreadsheetSession
  appSheets: SpreadsheetSheet[]
  activeSheetIdRef: MutableRefObject<string>
  peerSheetDataCacheRef: MutableRefObject<Map<string, Record<string, unknown>[]>>
  authoritativePeerSheetDataCacheRef: MutableRefObject<Set<string>>
  pendingUniverRowsBySheetRef: MutableRefObject<
    Map<string, { data: Record<string, unknown>[]; persistedRows: Record<string, unknown>[] }>
  >
  latestUniverDataRef: MutableRefObject<{ data: Record<string, unknown>[]; sheetId: string } | null>
}

export function useSpreadsheetViewerRowResolution(params: UseSpreadsheetViewerRowResolutionParams) {
  const getKnownRowsForSheet = useCallback(
    (sheetId: string): Record<string, unknown>[] => {
      const authoritativePeerCacheHit = params.authoritativePeerSheetDataCacheRef.current.has(sheetId)
      const peerCachedRows = authoritativePeerCacheHit ? params.peerSheetDataCacheRef.current.get(sheetId) : undefined
      const sessionSheetRows = params.spreadsheetSession.getSheetState(sheetId)?.rows
      const sheetMeta = params.appSheets.find(sheet => sheet.id === sheetId)
      return resolveKnownRowsForSheetFromSources({
        authoritativePeerCacheHit,
        peerCachedRows,
        sessionSheetRows,
        sheetMeta
      })
    },
    [params.appSheets, params.spreadsheetSession]
  )

  const getSessionBackedRowsForSheet = useCallback(
    (sheetId: string): Record<string, unknown>[] =>
      params.spreadsheetSession.getSheetState(sheetId)?.rows ?? getKnownRowsForSheet(sheetId),
    [getKnownRowsForSheet, params.spreadsheetSession]
  )

  const getRichestKnownRowsForSheet = useCallback(
    (sheetId: string): Record<string, unknown>[] => {
      const targetSheet = params.appSheets.find(sheet => sheet.id === sheetId)
      const activeSheetId = params.activeSheetIdRef.current
      const pendingUniverRows = params.pendingUniverRowsBySheetRef.current.get(sheetId)
      const cached = params.authoritativePeerSheetDataCacheRef.current.has(sheetId)
        ? params.peerSheetDataCacheRef.current.get(sheetId)
        : undefined
      const latestUniverRows = params.latestUniverDataRef.current
      const latestRowsForSheet = latestUniverRows?.sheetId === sheetId ? latestUniverRows.data : undefined
      const serverRows = sortSpreadsheetRowsBySheetSettings(targetSheet?.data ?? [], targetSheet) as Record<
        string,
        unknown
      >[]

      return resolveRichestKnownRowsForSheet({
        sheetId,
        activeSheetId,
        targetSheet,
        sessionBackedRowsWhenActive: getSessionBackedRowsForSheet(sheetId),
        inactiveCandidates: {
          peerCached: cached,
          pendingUniver: pendingUniverRows?.data,
          latestUniver: latestRowsForSheet,
          serverSorted: serverRows
        },
        debug: {
          enabled: isSpreadsheetAppsDebugEnabled(),
          log: multiSheetDebugLog,
          summarize: summarizeRowsForDebug
        }
      })
    },
    [params.appSheets, getSessionBackedRowsForSheet]
  )

  return {
    getKnownRowsForSheet,
    getSessionBackedRowsForSheet,
    getRichestKnownRowsForSheet
  }
}
