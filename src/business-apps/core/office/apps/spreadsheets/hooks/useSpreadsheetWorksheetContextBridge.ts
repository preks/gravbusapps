import { useCallback, type MutableRefObject } from 'react'

import type { SpreadsheetColumn, SpreadsheetSheet } from '../types'
import {
  useSpreadsheetSheetIdentityBridge,
  type SpreadsheetActiveWorksheetSyncDecision,
  type SpreadsheetPersistTargetDecision
} from './useSpreadsheetSheetIdentityBridge'
import { resolveReconciledSheetId } from '../utils/reconcileTemporarySheetId'
import { sortSpreadsheetRowsBySheetSettings } from '../utils/spreadsheetSheetRowSort'

type ViewerRow = Record<string, unknown>

export interface UseSpreadsheetWorksheetContextBridgeParams {
  sheets: SpreadsheetSheet[]
  activeSheetIdRef: MutableRefObject<string>
  createdSheetIdAliasesRef: MutableRefObject<Map<string, string>>
  programmaticWorksheetActivationGuardRef?: MutableRefObject<{
    expectedActiveSheetId: string
    expiresAt: number
  } | null>
  pendingCreatedSheetSelectionRef: MutableRefObject<{
    temporarySheetId: string
    persistedSheetId: string | null
  } | null>
  peerSheetDataCacheRef: MutableRefObject<Map<string, ViewerRow[]>>
  getActiveSessionRows: () => ViewerRow[]
  setActiveSheetIdWithPeerCache: (sheetId: string) => void
  resolveKnownSheetVersion: (sheetId: string) => number
  debugLog: (message: string, meta?: Record<string, unknown>) => void
}

export interface UseSpreadsheetWorksheetContextBridgeResult {
  handleUniverActiveWorksheetChange: (
    worksheetId: string,
    worksheetName: string
  ) => SpreadsheetActiveWorksheetSyncDecision
  resolveMutationPersistTarget: (producerSheetId: string) => SpreadsheetPersistTargetDecision
  resolveSheetContextForGrid: (sheetId: string) => { columns: SpreadsheetColumn[]; data: ViewerRow[] } | null
}

export function useSpreadsheetWorksheetContextBridge(
  params: UseSpreadsheetWorksheetContextBridgeParams
): UseSpreadsheetWorksheetContextBridgeResult {
  const { sheets, activeSheetIdRef, createdSheetIdAliasesRef, peerSheetDataCacheRef, getActiveSessionRows } = params

  const { handleUniverActiveWorksheetChange, resolveMutationPersistTarget } = useSpreadsheetSheetIdentityBridge(params)

  const resolveSheetContextForGrid = useCallback(
    (sheetId: string): { columns: SpreadsheetColumn[]; data: ViewerRow[] } | null => {
      const canonicalSheetId = resolveReconciledSheetId(sheetId, createdSheetIdAliasesRef.current)
      const canonicalActiveSheetId = resolveReconciledSheetId(
        activeSheetIdRef.current,
        createdSheetIdAliasesRef.current
      )
      const targetSheet = sheets.find(sheet => sheet.id === canonicalSheetId)
      if (!targetSheet) return null
      const rows =
        canonicalSheetId === canonicalActiveSheetId
          ? getActiveSessionRows()
          : (peerSheetDataCacheRef.current.get(canonicalSheetId) ??
            (sortSpreadsheetRowsBySheetSettings(targetSheet.data ?? [], targetSheet) as ViewerRow[]))
      return {
        columns: targetSheet.columns,
        data: rows as ViewerRow[]
      }
    },
    [activeSheetIdRef, createdSheetIdAliasesRef, getActiveSessionRows, peerSheetDataCacheRef, sheets]
  )

  return { handleUniverActiveWorksheetChange, resolveMutationPersistTarget, resolveSheetContextForGrid }
}
