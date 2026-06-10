import { useCallback, type MutableRefObject } from 'react'

import type { SpreadsheetColumn, SpreadsheetSheet } from '../types'
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
  debugLog: (message: string, meta?: Record<string, unknown>) => void
}

export interface UseSpreadsheetWorksheetContextBridgeResult {
  handleUniverActiveWorksheetChange: (worksheetId: string, worksheetName: string) => void
  resolveSheetContextForGrid: (sheetId: string) => { columns: SpreadsheetColumn[]; data: ViewerRow[] } | null
}

export function useSpreadsheetWorksheetContextBridge(
  params: UseSpreadsheetWorksheetContextBridgeParams
): UseSpreadsheetWorksheetContextBridgeResult {
  const {
    sheets,
    activeSheetIdRef,
    createdSheetIdAliasesRef,
    programmaticWorksheetActivationGuardRef,
    pendingCreatedSheetSelectionRef,
    peerSheetDataCacheRef,
    getActiveSessionRows,
    setActiveSheetIdWithPeerCache,
    debugLog
  } = params

  const handleUniverActiveWorksheetChange = useCallback(
    (worksheetId: string, worksheetName: string) => {
      const canonicalWorksheetId = resolveReconciledSheetId(worksheetId, createdSheetIdAliasesRef.current)
      const canonicalActiveSheetId = resolveReconciledSheetId(
        activeSheetIdRef.current,
        createdSheetIdAliasesRef.current
      )
      const programmaticWorksheetActivationGuard = programmaticWorksheetActivationGuardRef?.current
      if (programmaticWorksheetActivationGuard) {
        const expectedActiveSheetId = resolveReconciledSheetId(
          programmaticWorksheetActivationGuard.expectedActiveSheetId,
          createdSheetIdAliasesRef.current
        )
        if (Date.now() > programmaticWorksheetActivationGuard.expiresAt) {
          programmaticWorksheetActivationGuardRef.current = null
        } else if (canonicalWorksheetId === expectedActiveSheetId) {
          programmaticWorksheetActivationGuardRef.current = null
        } else if (canonicalActiveSheetId === expectedActiveSheetId) {
          debugLog('ignoring worksheet change during programmatic worksheet activation', {
            worksheetId,
            canonicalWorksheetId,
            canonicalActiveSheetId,
            expectedActiveSheetId
          })
          return
        } else {
          programmaticWorksheetActivationGuardRef.current = null
        }
      }
      const pendingCreatedSheetSelection = pendingCreatedSheetSelectionRef.current
      if (pendingCreatedSheetSelection) {
        const expectedSheetIds = new Set(
          [pendingCreatedSheetSelection.temporarySheetId, pendingCreatedSheetSelection.persistedSheetId]
            .filter((sheetId): sheetId is string => Boolean(sheetId))
            .map(sheetId => resolveReconciledSheetId(sheetId, createdSheetIdAliasesRef.current))
        )
        if (expectedSheetIds.has(canonicalWorksheetId)) {
          if (
            pendingCreatedSheetSelection.persistedSheetId &&
            canonicalWorksheetId ===
              resolveReconciledSheetId(pendingCreatedSheetSelection.persistedSheetId, createdSheetIdAliasesRef.current)
          ) {
            pendingCreatedSheetSelectionRef.current = null
          }
        } else if (expectedSheetIds.has(canonicalActiveSheetId)) {
          debugLog('ignoring worksheet change during pending sheet creation', {
            worksheetId,
            canonicalWorksheetId,
            canonicalActiveSheetId,
            pendingTemporarySheetId: pendingCreatedSheetSelection.temporarySheetId,
            pendingPersistedSheetId: pendingCreatedSheetSelection.persistedSheetId
          })
          return
        }
      }
      const targetSheet =
        sheets.find(sheet => sheet.id === canonicalWorksheetId) ?? sheets.find(sheet => sheet.name === worksheetName)
      if (!targetSheet || targetSheet.id === canonicalActiveSheetId) return
      setActiveSheetIdWithPeerCache(targetSheet.id)
    },
    [
      activeSheetIdRef,
      createdSheetIdAliasesRef,
      debugLog,
      pendingCreatedSheetSelectionRef,
      programmaticWorksheetActivationGuardRef,
      setActiveSheetIdWithPeerCache,
      sheets
    ]
  )

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

  return { handleUniverActiveWorksheetChange, resolveSheetContextForGrid }
}
