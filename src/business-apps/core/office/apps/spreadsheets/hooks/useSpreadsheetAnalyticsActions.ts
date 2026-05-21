import { useCallback } from 'react'
import { toast } from 'sonner'

import type { SpreadsheetMutationFacade } from '../core'
import type { SpreadsheetColumn } from '../types'

type ViewerRow = Record<string, unknown>

interface SpreadsheetPersistenceIndicator {
  beginPersist: () => void
  endPersist: () => void
  recordSuccess: (isSettled: boolean) => void
  recordError: (message: string) => void
}

export interface UseSpreadsheetAnalyticsActionsParams {
  canEditWithLock: boolean
  entityEnabled: boolean
  activeSheetId: string
  activeSheetColumns: SpreadsheetColumn[]
  getActiveSessionRows: () => ViewerRow[]
  commitLocalSheetData: (rows: ViewerRow[], options?: { syncGrid?: boolean }) => void
  mutationFacade: SpreadsheetMutationFacade
  handleCellsChange: (cells: Array<{ rowId: string; columnName: string; value: unknown }>) => void
  viewerRowId: (row: ViewerRow) => string
  buildAnalyticsInsertPayloads: (
    rows: Array<Record<string, unknown>>,
    columns: SpreadsheetColumn[]
  ) => Record<string, unknown>[]
  markVersionAsSaved: () => void
  sheetPersist: SpreadsheetPersistenceIndicator
  messages: {
    analyticsNoMatchingColumns: string
    analyticsNoRowsInserted: string
    analyticsInsertedRows: (count: number) => string
    analyticsInsertFailed: string
    formulaNoRows: string
    formulaApplied: (count: number) => string
    persistRowsAddFailed: string
  }
  normalizeCellValueForBatchPersistence: (value: unknown) => unknown
}

export interface UseSpreadsheetAnalyticsActionsResult {
  handleInsertAnalyticsRows: (rows: Array<Record<string, unknown>>) => Promise<boolean>
  handleApplyFormulaToColumn: (columnName: string, formula: string) => Promise<boolean>
}

export function useSpreadsheetAnalyticsActions(
  params: UseSpreadsheetAnalyticsActionsParams
): UseSpreadsheetAnalyticsActionsResult {
  const {
    canEditWithLock,
    entityEnabled,
    activeSheetId,
    activeSheetColumns,
    getActiveSessionRows,
    commitLocalSheetData,
    mutationFacade,
    handleCellsChange,
    viewerRowId,
    buildAnalyticsInsertPayloads,
    markVersionAsSaved,
    sheetPersist,
    messages,
    normalizeCellValueForBatchPersistence
  } = params

  const handleInsertAnalyticsRows = useCallback(
    async (rows: Array<Record<string, unknown>>): Promise<boolean> => {
      if (!canEditWithLock) return false
      if (!activeSheetId || rows.length === 0 || entityEnabled) return false

      const payloads = buildAnalyticsInsertPayloads(rows, activeSheetColumns)

      if (payloads.length === 0) {
        toast.error(messages.analyticsNoMatchingColumns)
        return false
      }

      sheetPersist.beginPersist()
      try {
        const createdRows = await mutationFacade.createRows(activeSheetId, payloads)

        if (createdRows.length === 0) {
          toast.error(messages.analyticsNoRowsInserted)
          return false
        }

        const next = [...getActiveSessionRows(), ...createdRows]
        commitLocalSheetData(next, { syncGrid: true })
        sheetPersist.recordSuccess(true)
        markVersionAsSaved()
        toast.success(messages.analyticsInsertedRows(createdRows.length))
        return true
      } catch (error) {
        console.error('[SpreadsheetAppViewer] Failed to insert analytics rows:', error)
        sheetPersist.recordError(messages.persistRowsAddFailed)
        toast.error(messages.analyticsInsertFailed)
        return false
      } finally {
        sheetPersist.endPersist()
      }
    },
    [
      activeSheetColumns,
      activeSheetId,
      buildAnalyticsInsertPayloads,
      canEditWithLock,
      commitLocalSheetData,
      entityEnabled,
      getActiveSessionRows,
      markVersionAsSaved,
      messages,
      mutationFacade,
      sheetPersist
    ]
  )

  const handleApplyFormulaToColumn = useCallback(
    async (columnName: string, formula: string): Promise<boolean> => {
      if (!canEditWithLock) return false
      if (!columnName || !formula) return false
      const normalizedFormula = formula.trim().startsWith('=') ? formula.trim() : `=${formula.trim()}`
      const cells = getActiveSessionRows()
        .map(row => {
          const rowId = viewerRowId(row)
          if (!rowId) return null
          return {
            rowId,
            columnName,
            value: normalizeCellValueForBatchPersistence({ f: normalizedFormula })
          }
        })
        .filter((cell): cell is { rowId: string; columnName: string; value: unknown } => Boolean(cell))

      if (cells.length === 0) {
        toast.error(messages.formulaNoRows)
        return false
      }

      handleCellsChange(cells)
      toast.success(messages.formulaApplied(cells.length))
      return true
    },
    [
      canEditWithLock,
      getActiveSessionRows,
      handleCellsChange,
      messages,
      normalizeCellValueForBatchPersistence,
      viewerRowId
    ]
  )

  return { handleInsertAnalyticsRows, handleApplyFormulaToColumn }
}
