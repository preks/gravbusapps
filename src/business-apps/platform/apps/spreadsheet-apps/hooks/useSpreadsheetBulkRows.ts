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
  onSheetUpdate?: (appId: string, sheetId: string, updates: Partial<SpreadsheetSheet>) => Promise<unknown>
  onRowUpdate?: (
    appId: string,
    sheetId: string,
    rowId: string,
    updates: Record<string, unknown>
  ) => Promise<Record<string, unknown> | null>
  onRowAdd?: (appId: string, sheetId: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>
  saveTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>
}

export interface SpreadsheetBulkRowsHandlers {
  handleAddRows: (rows: Array<{ cells: Record<string, unknown>; metadata?: Record<string, unknown> }>) => void
  handleUpdateRows: (
    updates: Array<{ workflowId: string; recipientId?: string; cells: Record<string, unknown> }>
  ) => void
  handleAddRowsRef: React.MutableRefObject<typeof handleAddRows | null>
  handleUpdateRowsRef: React.MutableRefObject<typeof handleUpdateRows | null>
}

type HandleAddRowsFn = (rows: Array<{ cells: Record<string, unknown>; metadata?: Record<string, unknown> }>) => void
type HandleUpdateRowsFn = (
  updates: Array<{ workflowId: string; recipientId?: string; cells: Record<string, unknown> }>
) => void

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
  onSheetUpdate,
  onRowUpdate,
  onRowAdd,
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
    (updates: Array<{ workflowId: string; recipientId?: string; cells: Record<string, unknown> }>) => {
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

      // Build column lookup map
      const columnMap = new Map<string, SpreadsheetColumn>()
      updatedColumns.forEach(col => {
        columnMap.set(col.id, col)
        columnMap.set(col.name, col)
      })

      // Build update maps for both workflowId and recipientId matching
      const updateByWorkflowId = new Map(updates.map(u => [u.workflowId, u]))
      const updateByRecipientId = new Map(updates.filter(u => u.recipientId).map(u => [u.recipientId!, u]))

      // Update rows - try matching by workflowId first, then by recipientId
      const currentData = localSheetDataRef.current

      let matchCount = 0
      const matchedUpdateIds = new Set<string>()

      const updatedExisting = currentData.map(row => {
        const workflowId = row._workflow_id as string | undefined
        const recipientId = row.recipientId as string | undefined

        // Helper to map cell keys to column names
        const mapCellsToColumnNames = (cells: Record<string, unknown>): Record<string, unknown> => {
          const mappedCells: Record<string, unknown> = {}
          for (const [key, value] of Object.entries(cells)) {
            const column = columnMap.get(key)
            if (column) {
              mappedCells[column.name] = value
            } else {
              mappedCells[key] = value
            }
          }
          return mappedCells
        }

        // First try to match by workflowId
        if (workflowId && updateByWorkflowId.has(workflowId)) {
          matchCount++
          const update = updateByWorkflowId.get(workflowId)!
          matchedUpdateIds.add(update.workflowId)
          const mappedCells = mapCellsToColumnNames(update.cells)
          return { ...row, ...mappedCells, _updatedAt: new Date().toISOString() }
        }

        // Fallback: match by recipientId (for bulk collection where workflow IDs differ)
        if (recipientId && updateByRecipientId.has(recipientId)) {
          matchCount++
          const update = updateByRecipientId.get(recipientId)!
          matchedUpdateIds.add(update.workflowId)
          const mappedCells = mapCellsToColumnNames(update.cells)
          // Also update the workflow ID to the new one for future matching
          return {
            ...row,
            ...mappedCells,
            _workflow_id: update.workflowId,
            _updatedAt: new Date().toISOString()
          }
        }

        return row
      })

      // Create new rows for updates that didn't match any existing row
      const unmatchedUpdates = updates.filter(u => !matchedUpdateIds.has(u.workflowId))
      let addedRows: Record<string, unknown>[] = []

      if (unmatchedUpdates.length > 0) {
        const createdAt = new Date().toISOString()
        addedRows = unmatchedUpdates.map(update => {
          const newRow: Record<string, unknown> = {
            _id: crypto.randomUUID(),
            _createdAt: createdAt,
            _workflow_id: update.workflowId
          }

          // Also store recipientId if available for future matching
          if (update.recipientId) {
            newRow.recipientId = update.recipientId
          }

          for (const [key, value] of Object.entries(update.cells)) {
            const column = columnMap.get(key)
            if (column) {
              newRow[column.name] = value
            } else {
              newRow[key] = value
            }
          }

          return newRow
        })
      }

      const newData = matchCount > 0 || addedRows.length > 0 ? [...updatedExisting, ...addedRows] : updatedExisting

      if (matchCount === 0 && addedRows.length === 0 && newColumns.length === 0) return

      localSheetDataRef.current = newData
      setLocalSheetData(newData)

      // Persist changes using proper API methods
      // 1. Update columns if new ones were created
      if (newColumns.length > 0) {
        if (onSheetUpdate) {
          Promise.resolve(onSheetUpdate(app.id, activeSheet.id, { columns: updatedColumns })).catch(err =>
            console.error('[handleUpdateRows] onSheetUpdate failed:', err)
          )
        } else if (onAppUpdate) {
          // Fallback to onAppUpdate for column updates (though this won't persist data)
          const updatedSheets = app.sheets.map(sheet =>
            sheet.id === activeSheet.id ? { ...sheet, columns: updatedColumns } : sheet
          )
          Promise.resolve(onAppUpdate({ ...app, sheets: updatedSheets })).catch(err =>
            console.error('[handleUpdateRows] onAppUpdate (columns) failed:', err)
          )
        }
      }

      // 2. Update each modified row individually
      if (matchCount > 0 && onRowUpdate) {
        // Find the updated rows and persist them
        for (const update of updates) {
          // IMPORTANT: Prioritize workflowId match over recipientId match
          // This ensures we update the correct row when multiple rows have the same recipientId
          let updatedRow = newData.find(row => row._workflow_id === update.workflowId)
          if (!updatedRow && update.recipientId) {
            updatedRow = newData.find(row => row.recipientId === update.recipientId)
          }
          if (updatedRow) {
            const rowId = String(updatedRow._id ?? updatedRow.id ?? '')
            if (rowId) {
              // Map the cells to column names for persistence
              const mappedCells: Record<string, unknown> = {}
              for (const [key, value] of Object.entries(update.cells)) {
                const column = columnMap.get(key)
                if (column) {
                  mappedCells[column.name] = value
                } else {
                  mappedCells[key] = value
                }
              }

              // Try to update the row, but if it fails (returns null), fall back to adding the row
              onRowUpdate(app.id, activeSheet.id, rowId, mappedCells)
                .then(async result => {
                  // If result is null, the update failed (row doesn't exist in backend)
                  // Fall back to adding the row instead
                  if (result === null && onRowAdd) {
                    try {
                      // Build full row data for adding (not just the update cells)
                      const fullRowData: Record<string, unknown> = { ...mappedCells }
                      // Include workflow metadata so we can track it
                      if (updatedRow._workflow_id) fullRowData._workflow_id = updatedRow._workflow_id
                      if (updatedRow.recipientId) fullRowData.recipientId = updatedRow.recipientId
                      if (updatedRow._workflow_status) fullRowData._workflow_status = updatedRow._workflow_status

                      await onRowAdd(app.id, activeSheet.id, fullRowData)
                    } catch (addErr) {
                      console.error('[handleUpdateRows] onRowAdd failed:', addErr)
                    }
                  }
                })
                .catch(err => {
                  console.error('[handleUpdateRows] onRowUpdate failed for row:', rowId, err)
                })
            }
          }
        }
      } else if (matchCount > 0 || addedRows.length > 0) {
        // Fallback to onDataChange for local state sync
        onDataChange?.(activeSheet.id, newData)
      }
    },
    [
      activeSheet,
      app,
      onDataChange,
      onAppUpdate,
      onSheetUpdate,
      onRowUpdate,
      onRowAdd,
      localSheetDataRef,
      setLocalSheetData,
      saveTimeoutRef
    ]
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
