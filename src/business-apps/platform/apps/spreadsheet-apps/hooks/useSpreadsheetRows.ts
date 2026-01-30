/**
 * useSpreadsheetRows
 *
 * Manages basic row operations: add, update, delete.
 * Complex bulk operations (handleAddRows, handleUpdateRows) remain in the main component
 * due to their tight coupling with column creation and state management.
 */

import { useState, useCallback, useRef } from 'react'
import type { SpreadsheetApp, SpreadsheetSheet } from '../types'
import { SpreadsheetApiService } from '../services/SpreadsheetApiService'

export interface UseSpreadsheetRowsProps {
  app: SpreadsheetApp
  activeSheet: SpreadsheetSheet
  localSheetData: Record<string, unknown>[]
  setLocalSheetData: React.Dispatch<React.SetStateAction<Record<string, unknown>[]>>
  onDataChange?: (sheetId: string, data: Record<string, unknown>[]) => void
  isCollaborationConnected: boolean
  emitOperation: (operation: { type: string; data: unknown }) => void
}

export interface SpreadsheetRowsState {
  // Editing state
  editingRow: Record<string, unknown> | null
  setEditingRow: (row: Record<string, unknown> | null) => void

  // Filtered data ref for stable callbacks
  filteredDataRef: React.MutableRefObject<Record<string, unknown>[]>

  // Row handlers
  handleAddRow: () => Promise<void>
  handleUpdateRow: (values: Record<string, unknown>) => Promise<void>
  handleDeleteRow: (rowId: string) => void
  handleFortuneSheetDataChange: (newData: Record<string, unknown>[]) => Promise<void>
}

export function useSpreadsheetRows({
  app,
  activeSheet,
  localSheetData,
  setLocalSheetData,
  onDataChange,
  isCollaborationConnected,
  emitOperation
}: UseSpreadsheetRowsProps): SpreadsheetRowsState {
  // Editing row state
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null)

  // Ref for filtered data (used in stable callbacks)
  const filteredDataRef = useRef<Record<string, unknown>[]>([])

  // Add row handler
  const handleAddRow = useCallback(async () => {
    if (!activeSheet || !app) return

    const rowData: Record<string, unknown> = {}

    activeSheet.columns.forEach(col => {
      if (col.defaultValue !== undefined) {
        rowData[col.name] = col.defaultValue
      } else {
        if (col.type === 'text' || col.type === 'email' || col.type === 'url' || col.type === 'phone') {
          rowData[col.name] = ''
        } else {
          rowData[col.name] = null
        }
      }
    })

    try {
      const savedRow = await SpreadsheetApiService.addRow(app.id, activeSheet.id, rowData)
      if (savedRow) {
        setLocalSheetData(prev => [...prev, savedRow])

        if (isCollaborationConnected) {
          emitOperation({
            type: 'row_add',
            data: {
              sheetId: activeSheet.id,
              rowData: savedRow
            }
          })
        }
      }
    } catch (err) {
      console.error('[useSpreadsheetRows] Failed to add row:', err)
    }
  }, [activeSheet, app, setLocalSheetData, isCollaborationConnected, emitOperation])

  // Update row handler
  const handleUpdateRow = useCallback(
    async (values: Record<string, unknown>) => {
      if (!activeSheet || !editingRow) return

      const newData = activeSheet.data.map(row =>
        row._id === editingRow._id ? { ...row, ...values, _updatedAt: new Date().toISOString() } : row
      )

      onDataChange?.(activeSheet.id, newData)
      setEditingRow(null)
    },
    [activeSheet, editingRow, onDataChange]
  )

  // Delete row handler
  const handleDeleteRow = useCallback(
    (rowId: string) => {
      if (!activeSheet) return

      const newData = localSheetData.filter(row => {
        const id = row._id ?? row.id
        return id !== rowId
      })
      setLocalSheetData(newData)

      onDataChange?.(activeSheet.id, newData)
    },
    [activeSheet, localSheetData, setLocalSheetData, onDataChange]
  )

  // Handle data change from FortuneSheetGrid
  const handleFortuneSheetDataChange = useCallback(
    async (newData: Record<string, unknown>[]) => {
      const currentFilteredData = filteredDataRef.current
      const currentActiveSheet = activeSheet
      const currentAppId = app?.id

      if (!currentActiveSheet || !currentAppId) return

      // Compare against filteredData (what FortuneSheetGrid sees)
      if (newData.length > currentFilteredData.length) {
        const addedRows = newData.slice(currentFilteredData.length)

        const createdRows: Record<string, unknown>[] = []
        for (const row of addedRows) {
          try {
            const rowData: Record<string, unknown> = {}
            currentActiveSheet.columns.forEach(col => {
              const value = row[col.name] ?? col.defaultValue ?? ''
              if (value !== '' && value !== undefined && value !== null) {
                rowData[col.name] = value
              }
            })

            const createdRow = await SpreadsheetApiService.addRow(currentAppId, currentActiveSheet.id, rowData)
            createdRows.push({ ...row, _id: createdRow._id })
          } catch (err) {
            console.error('[useSpreadsheetRows] Failed to create row:', err)
          }
        }

        setLocalSheetData(prev => [...prev, ...createdRows])
      }
    },
    [activeSheet, app?.id, setLocalSheetData]
  )

  return {
    editingRow,
    setEditingRow,
    filteredDataRef,
    handleAddRow,
    handleUpdateRow,
    handleDeleteRow,
    handleFortuneSheetDataChange
  }
}
