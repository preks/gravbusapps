/**
 * useSpreadsheetBulkRows
 *
 * Handles bulk row operations from automation/collection responses.
 * Creates new columns for tracking fields if they don't exist.
 */

import { useCallback, useRef } from 'react'
import type { SpreadsheetApp, SpreadsheetSheet, SpreadsheetColumn } from '../types'
import { isTrackingColumn } from '../utils/trackingColumns'
import { TRACKING_COLUMNS } from '../components/automations/TrackingColumnsConfig'

// Internal metadata fields to skip (not user-visible columns)
const INTERNAL_METADATA_FIELDS = new Set([
  '_id',
  '_createdAt',
  '_updatedAt',
  '_workflow_id',
  '_recipient_id',
  '_isBulkCollectionPending',
  '_automationId'
])

export interface UseSpreadsheetBulkRowsProps {
  app: SpreadsheetApp
  activeSheet: SpreadsheetSheet | null
  localSheetDataRef: React.MutableRefObject<Record<string, unknown>[]>
  setLocalSheetData: React.Dispatch<React.SetStateAction<Record<string, unknown>[]>>
  onDataChange?: (sheetId: string, data: Record<string, unknown>[]) => void
  onAppUpdate?: (app: SpreadsheetApp) => void
  saveTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>
}

export interface SpreadsheetBulkRowsHandlers {
  handleAddRows: (rows: Array<{ cells: Record<string, unknown>; metadata?: Record<string, unknown> }>) => void
  handleUpdateRows: (updates: Array<{ workflowId: string; cells: Record<string, unknown> }>) => void
  handleAddRowsRef: React.MutableRefObject<typeof handleAddRows | null>
  handleUpdateRowsRef: React.MutableRefObject<typeof handleUpdateRows | null>
}

type HandleAddRowsFn = (rows: Array<{ cells: Record<string, unknown>; metadata?: Record<string, unknown> }>) => void
type HandleUpdateRowsFn = (updates: Array<{ workflowId: string; cells: Record<string, unknown> }>) => void

/**
 * Collect field names from row data, filtering out internal metadata
 */
function collectFieldNames(rows: Array<{ cells: Record<string, unknown> }>, skipFields: Set<string>): Set<string> {
  const allFieldNames = new Set<string>()
  rows.forEach(rowData => {
    Object.keys(rowData.cells).forEach(key => {
      const isTracking = isTrackingColumn(key)
      const isMetadata = skipFields.has(key)
      if (isTracking || !isMetadata) {
        allFieldNames.add(key)
      }
    })
  })
  return allFieldNames
}

/**
 * Find fields that don't have corresponding columns
 */
function findNewFields(allFieldNames: Set<string>, existingColumns: SpreadsheetColumn[]): string[] {
  const existingColumnIds = new Set(existingColumns.map(c => c.id))
  const existingColumnNames = new Set(existingColumns.map(c => c.name))
  const newFieldNames: string[] = []

  allFieldNames.forEach(fieldName => {
    if (!existingColumnIds.has(fieldName) && !existingColumnNames.has(fieldName)) {
      newFieldNames.push(fieldName)
    }
  })

  return newFieldNames
}

/**
 * Create columns for new fields
 */
function createColumnsForFields(newFieldNames: string[]): SpreadsheetColumn[] {
  return newFieldNames.map((fieldName, index) => {
    const trackingCol = TRACKING_COLUMNS.find(tc => tc.name === fieldName)

    let label: string
    let colType: SpreadsheetColumn['type'] = 'text'

    if (trackingCol) {
      label = trackingCol.label
      if (trackingCol.id === 'sent_at' || trackingCol.id === 'responded_at') {
        colType = 'datetime'
      } else if (trackingCol.id === 'recipient_email') {
        colType = 'email'
      } else if (trackingCol.id === 'recipient_avatar') {
        colType = 'image'
      }
    } else if (fieldName === '__new__') {
      label = 'New Response Field'
    } else {
      label = fieldName
        .replace(/^col_\d+_\w+$/, 'Response')
        .replace(/^_/, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
    }

    return {
      id:
        fieldName.startsWith('col_') || fieldName === '__new__' || fieldName.startsWith('_')
          ? fieldName
          : `col_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 5)}`,
      name: fieldName,
      label,
      type: colType,
      isVisible: true,
      isEditable: !trackingCol,
      isRequired: false,
      isUnique: false,
      isTracking: !!trackingCol,
      order: index
    }
  })
}

/**
 * Merge new columns with existing columns (tracking first)
 */
function mergeColumns(existingColumns: SpreadsheetColumn[], newColumns: SpreadsheetColumn[]): SpreadsheetColumn[] {
  if (newColumns.length === 0) return existingColumns

  const trackingNew = newColumns.filter(c => c.isTracking)
  const nonTrackingNew = newColumns.filter(c => !c.isTracking)
  const existingNonTracking = existingColumns.filter(c => !c.isTracking)
  const existingTracking = existingColumns.filter(c => c.isTracking)

  return [...existingTracking, ...trackingNew, ...existingNonTracking, ...nonTrackingNew].map((col, idx) => ({
    ...col,
    order: idx
  }))
}

export function useSpreadsheetBulkRows({
  app,
  activeSheet,
  localSheetDataRef,
  setLocalSheetData,
  onDataChange,
  onAppUpdate,
  saveTimeoutRef
}: UseSpreadsheetBulkRowsProps): SpreadsheetBulkRowsHandlers {
  const handleAddRowsRef = useRef<HandleAddRowsFn | null>(null)
  const handleUpdateRowsRef = useRef<HandleUpdateRowsFn | null>(null)

  const handleAddRows = useCallback(
    (rows: Array<{ cells: Record<string, unknown>; metadata?: Record<string, unknown> }>) => {
      // Cancel pending saves
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }

      if (!activeSheet || rows.length === 0) return

      // Collect field names and find new ones
      const allFieldNames = collectFieldNames(rows, INTERNAL_METADATA_FIELDS)
      const newFieldNames = findNewFields(allFieldNames, activeSheet.columns)
      const newColumns = createColumnsForFields(newFieldNames)
      const updatedColumns = mergeColumns(activeSheet.columns, newColumns)

      // Build column lookup map
      const columnMap = new Map<string, SpreadsheetColumn>()
      updatedColumns.forEach(col => {
        columnMap.set(col.id, col)
        columnMap.set(col.name, col)
      })

      // Build new rows
      const newRows = rows.map(rowData => {
        const newRow: Record<string, unknown> = {
          _id: crypto.randomUUID(),
          _createdAt: new Date().toISOString(),
          ...rowData.metadata
        }

        for (const [key, value] of Object.entries(rowData.cells)) {
          const column = columnMap.get(key)
          if (column) {
            newRow[column.name] = value
          } else {
            newRow[key] = value
          }
        }

        return newRow
      })

      // Update local data
      const currentData = localSheetDataRef.current
      const newData = [...currentData, ...newRows]
      localSheetDataRef.current = newData
      setLocalSheetData(newData)

      // Persist changes
      if (newColumns.length > 0 && onAppUpdate) {
        const updatedSheets = app.sheets.map(sheet =>
          sheet.id === activeSheet.id ? { ...sheet, columns: updatedColumns, data: newData } : sheet
        )
        onAppUpdate({ ...app, sheets: updatedSheets })
      } else if (onAppUpdate) {
        const updatedSheets = app.sheets.map(sheet =>
          sheet.id === activeSheet.id ? { ...sheet, data: newData } : sheet
        )
        onAppUpdate({ ...app, sheets: updatedSheets })
      } else {
        onDataChange?.(activeSheet.id, newData)
      }
    },
    [activeSheet, app, onDataChange, onAppUpdate, localSheetDataRef, setLocalSheetData, saveTimeoutRef]
  )

  const handleUpdateRows = useCallback(
    (updates: Array<{ workflowId: string; cells: Record<string, unknown> }>) => {
      // Cancel pending saves
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }

      if (!activeSheet || updates.length === 0) return

      // Collect field names and find new ones
      const allFieldNames = new Set<string>()
      updates.forEach(update => {
        Object.keys(update.cells).forEach(key => {
          const isTracking = isTrackingColumn(key)
          const isMetadata = INTERNAL_METADATA_FIELDS.has(key)
          if (isTracking || !isMetadata) {
            allFieldNames.add(key)
          }
        })
      })

      const newFieldNames = findNewFields(allFieldNames, activeSheet.columns)
      const newColumns = createColumnsForFields(newFieldNames)
      const updatedColumns = mergeColumns(activeSheet.columns, newColumns)

      // Build update map
      const updateMap = new Map(updates.map(u => [u.workflowId, u.cells]))

      // Update rows
      const currentData = localSheetDataRef.current
      let matchCount = 0
      const newData = currentData.map(row => {
        const workflowId = row._workflow_id as string | undefined
        if (workflowId && updateMap.has(workflowId)) {
          matchCount++
          const cellUpdates = updateMap.get(workflowId)!
          return { ...row, ...cellUpdates, _updatedAt: new Date().toISOString() }
        }
        return row
      })

      if (matchCount === 0 && newColumns.length === 0) return

      localSheetDataRef.current = newData
      setLocalSheetData(newData)

      // Persist changes
      if (newColumns.length > 0 && onAppUpdate) {
        const updatedSheets = app.sheets.map(sheet =>
          sheet.id === activeSheet.id ? { ...sheet, columns: updatedColumns, data: newData } : sheet
        )
        onAppUpdate({ ...app, sheets: updatedSheets })
      } else if (onAppUpdate && matchCount > 0) {
        const updatedSheets = app.sheets.map(sheet =>
          sheet.id === activeSheet.id ? { ...sheet, data: newData } : sheet
        )
        onAppUpdate({ ...app, sheets: updatedSheets })
      } else if (matchCount > 0) {
        onDataChange?.(activeSheet.id, newData)
      }
    },
    [activeSheet, app, onDataChange, onAppUpdate, localSheetDataRef, setLocalSheetData, saveTimeoutRef]
  )

  // Keep refs updated
  handleAddRowsRef.current = handleAddRows
  handleUpdateRowsRef.current = handleUpdateRows

  return {
    handleAddRows,
    handleUpdateRows,
    handleAddRowsRef,
    handleUpdateRowsRef
  }
}
