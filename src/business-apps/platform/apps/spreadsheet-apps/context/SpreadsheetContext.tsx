/**
 * SpreadsheetContext
 *
 * Provides shared state and handlers for spreadsheet components.
 * Enables deep component extraction without prop drilling.
 */

import React, { createContext, useContext } from 'react'
import type { SpreadsheetApp, SpreadsheetSheet, SpreadsheetColumn } from '../types'

export interface SpreadsheetContextValue {
  // Core state
  app: SpreadsheetApp
  activeSheet: SpreadsheetSheet
  activeSheetId: string
  setActiveSheetId: (id: string) => void
  localSheetData: Record<string, unknown>[]
  setLocalSheetData: React.Dispatch<React.SetStateAction<Record<string, unknown>[]>>

  // Column state
  columns: SpreadsheetColumn[]
  editingColumnId: string | null
  setEditingColumnId: (id: string | null) => void
  editingColumnLabel: string
  setEditingColumnLabel: (label: string) => void

  // Column handlers
  handleAddColumn: () => void
  handleDeleteColumn: (columnId: string) => void
  handleRenameColumn: (columnId: string, newLabel: string) => void

  // Row handlers
  handleAddRow: () => Promise<void>
  handleDeleteRow: (rowId: string) => void
  handleCellChange: (rowId: string, columnName: string, value: unknown) => void

  // Collaboration
  isCollaborationConnected: boolean
  emitOperation: (operation: { type: string; data: unknown }) => void

  // UI state
  testId: string
}

const SpreadsheetContext = createContext<SpreadsheetContextValue | null>(null)

export const useSpreadsheetContext = (): SpreadsheetContextValue => {
  const context = useContext(SpreadsheetContext)
  if (!context) {
    throw new Error('useSpreadsheetContext must be used within SpreadsheetProvider')
  }
  return context
}

export interface SpreadsheetProviderProps {
  value: SpreadsheetContextValue
  children: React.ReactNode
}

export const SpreadsheetProvider: React.FC<SpreadsheetProviderProps> = ({ value, children }) => {
  return <SpreadsheetContext.Provider value={value}>{children}</SpreadsheetContext.Provider>
}

export { SpreadsheetContext }
