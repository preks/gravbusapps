import { useCallback } from 'react'

import type { SpreadsheetMutationFacade } from '../core'
import { resolveBackendRowIdForViewerRow } from '../utils/spreadsheetRowIdentity'

type ViewerRow = Record<string, unknown>

interface SpreadsheetPersistenceIndicator {
  beginPersist: () => void
  endPersist: () => void
  recordSuccess: (isSettled: boolean) => void
  recordError: (message: string) => void
}

export interface UseSpreadsheetRowCrudActionsParams {
  canEditWithLock: boolean
  activeSheetId: string
  editingRow: ViewerRow | null
  setEditingRow: (row: ViewerRow | null) => void
  getActiveSessionRows: () => ViewerRow[]
  commitLocalSheetData: (rows: ViewerRow[], options?: { syncGrid?: boolean }) => void
  mutationFacade: SpreadsheetMutationFacade
  isOpsV2Enabled: boolean
  isUuid: (value: string) => boolean
  viewerRowId: (row: ViewerRow) => string
  scheduleSheetVersionRefreshFromApi: () => void
  updateActiveSheetVersion: (version: number, mode?: 'set' | 'max') => void
  markVersionAsSaved: () => void
  sheetPersist: SpreadsheetPersistenceIndicator
  onPersistRowUpdateFailedMessage: string
  onPersistRowDeleteFailedMessage: string
}

export interface UseSpreadsheetRowCrudActionsResult {
  handleUpdateRow: (values: Record<string, unknown>) => Promise<void>
  handleDeleteRow: (rowId: string) => Promise<void>
}

export function useSpreadsheetRowCrudActions(
  params: UseSpreadsheetRowCrudActionsParams
): UseSpreadsheetRowCrudActionsResult {
  const {
    canEditWithLock,
    activeSheetId,
    editingRow,
    setEditingRow,
    getActiveSessionRows,
    commitLocalSheetData,
    mutationFacade,
    isOpsV2Enabled,
    isUuid,
    viewerRowId,
    scheduleSheetVersionRefreshFromApi,
    updateActiveSheetVersion,
    markVersionAsSaved,
    sheetPersist,
    onPersistRowUpdateFailedMessage,
    onPersistRowDeleteFailedMessage
  } = params

  const handleUpdateRow = useCallback(
    async (values: Record<string, unknown>) => {
      if (!canEditWithLock) return
      if (!editingRow) return
      const rowId = viewerRowId(editingRow)
      if (!rowId) return

      const next = getActiveSessionRows().map(r => (viewerRowId(r) === rowId ? { ...r, ...values } : r))
      commitLocalSheetData(next, { syncGrid: true })
      setEditingRow(null)

      sheetPersist.beginPersist()
      try {
        const updatedRow = await mutationFacade.updateRow(activeSheetId, rowId, values)
        const updatedSheetVersion =
          (updatedRow as Record<string, unknown> | null)?.sheetVersion != null
            ? Number((updatedRow as Record<string, unknown>).sheetVersion)
            : undefined
        if (updatedSheetVersion != null && Number.isFinite(updatedSheetVersion)) {
          updateActiveSheetVersion(updatedSheetVersion)
        }
        scheduleSheetVersionRefreshFromApi()
        sheetPersist.recordSuccess(true)
        markVersionAsSaved()
      } catch (error) {
        console.error('[SpreadsheetAppViewer] Failed to update row:', error)
        sheetPersist.recordError(onPersistRowUpdateFailedMessage)
      } finally {
        sheetPersist.endPersist()
      }
    },
    [
      activeSheetId,
      canEditWithLock,
      commitLocalSheetData,
      editingRow,
      getActiveSessionRows,
      markVersionAsSaved,
      mutationFacade,
      onPersistRowUpdateFailedMessage,
      scheduleSheetVersionRefreshFromApi,
      setEditingRow,
      sheetPersist,
      updateActiveSheetVersion,
      viewerRowId
    ]
  )

  const handleDeleteRow = useCallback(
    async (rowId: string) => {
      if (!canEditWithLock) return
      const prev = getActiveSessionRows()
      const deletedRow = prev.find(r => viewerRowId(r) === String(rowId))
      const backendRowId = deletedRow ? resolveBackendRowIdForViewerRow(deletedRow, isUuid) : undefined
      const next = prev.filter(r => viewerRowId(r) !== String(rowId))
      commitLocalSheetData(next, { syncGrid: true })
      sheetPersist.beginPersist()
      try {
        if (backendRowId) {
          if (isOpsV2Enabled) {
            await mutationFacade.deleteRows(activeSheetId, [backendRowId])
          } else {
            await mutationFacade.deleteRow(activeSheetId, backendRowId)
          }
        }
        sheetPersist.recordSuccess(true)
        markVersionAsSaved()
      } catch (error) {
        console.error('[SpreadsheetAppViewer] Failed to delete row:', error)
        sheetPersist.recordError(onPersistRowDeleteFailedMessage)
      } finally {
        sheetPersist.endPersist()
      }
    },
    [
      activeSheetId,
      canEditWithLock,
      commitLocalSheetData,
      getActiveSessionRows,
      isOpsV2Enabled,
      isUuid,
      markVersionAsSaved,
      mutationFacade,
      onPersistRowDeleteFailedMessage,
      sheetPersist,
      viewerRowId
    ]
  )

  return { handleUpdateRow, handleDeleteRow }
}
