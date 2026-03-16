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
    if (existingColumnIds.has(fieldName) || existingColumnNames.has(fieldName)) return
    newFieldNames.push(fieldName)
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
      } else if (trackingCol.id === 'copy_link') {
        colType = 'url'
      }
    } else if (fieldName === '__new__') {
      label = 'New Response Field'
    } else {
      label = fieldName
        .replace(/^col_\d+_\w+$/, 'Response')
        .replace(/^_/, '')
        .replaceAll('_', ' ')
        .replaceAll(/\b\w/g, l => l.toUpperCase())
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

function buildColumnLookupMap(columns: SpreadsheetColumn[]): Map<string, SpreadsheetColumn> {
  const columnMap = new Map<string, SpreadsheetColumn>()
  columns.forEach(col => {
    columnMap.set(col.id, col)
    columnMap.set(col.name, col)
  })
  return columnMap
}

function mapCellsToColumnNames(
  cells: Record<string, unknown>,
  columnMap: Map<string, SpreadsheetColumn>
): Record<string, unknown> {
  const mappedCells: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(cells)) {
    const column = columnMap.get(key)
    mappedCells[column ? column.name : key] = value
  }
  return mappedCells
}

function createTrackingHeaderRow(updatedColumns: SpreadsheetColumn[]): Record<string, unknown> {
  return updatedColumns.reduce<Record<string, unknown>>(
    (acc, col) => {
      if (isTrackingColumn(col.name) || isTrackingColumn(col.id)) {
        acc[col.name] = col.label || col.name
      }
      return acc
    },
    { _id: `tmp_header_${crypto.randomUUID()}`, _isTrackingHeader: true }
  )
}

function collectFieldNamesFromUpdates(
  updates: Array<{ cells: Record<string, unknown> }>,
  skipFields: Set<string>
): Set<string> {
  const allFieldNames = new Set<string>()
  updates.forEach(update => {
    Object.keys(update.cells).forEach(key => {
      const isTracking = isTrackingColumn(key)
      const isMetadata = skipFields.has(key)
      if (isTracking || !isMetadata) {
        allFieldNames.add(key)
      }
    })
  })
  return allFieldNames
}

function buildRecipientIdToBestRowIndex(
  currentData: Record<string, unknown>[],
  updateByRecipientId: Map<string, { workflowId: string; recipientId?: string; cells: Record<string, unknown> }>
): Map<string, number> {
  const recipientIdToBestRowIndex = new Map<string, number>()
  currentData.forEach((row, idx) => {
    const recipientId = row.recipientId as string | undefined
    if (!recipientId || !updateByRecipientId.has(recipientId)) return
    const status = String((row._workflow_status as string) ?? '').toLowerCase()
    const currentBest = recipientIdToBestRowIndex.get(recipientId)
    const currentBestRow = currentBest !== undefined ? currentData[currentBest] : null
    const currentBestStatus = String((currentBestRow?._workflow_status as string) ?? '').toLowerCase()
    if (
      currentBest === undefined ||
      (status === 'sent' && currentBestStatus === 'completed') ||
      (status === currentBestStatus && idx < currentBest)
    ) {
      recipientIdToBestRowIndex.set(recipientId, idx)
    }
  })
  return recipientIdToBestRowIndex
}

function buildCompletedRowIndices(
  currentData: Record<string, unknown>[],
  completedByWorkflowId: Map<string, { workflowId: string; recipientId?: string; cells: Record<string, unknown> }>,
  completedByRecipientId: Map<string, { workflowId: string; recipientId?: string; cells: Record<string, unknown> }>
): { byWorkflowId: Map<string, number>; byRecipientId: Map<string, number> } {
  const completedRowByWorkflowId = new Map<string, number>()
  const completedRowByRecipientId = new Map<string, number>()
  currentData.forEach((row, idx) => {
    const status = String((row._workflow_status as string) ?? '').toLowerCase()
    if (status !== 'completed') return
    const workflowId = row._workflow_id as string | undefined
    const recipientId = row.recipientId as string | undefined
    if (workflowId && completedByWorkflowId.has(workflowId) && !completedRowByWorkflowId.has(workflowId)) {
      completedRowByWorkflowId.set(workflowId, idx)
    }
    if (recipientId && completedByRecipientId.has(recipientId) && !completedRowByRecipientId.has(recipientId)) {
      completedRowByRecipientId.set(recipientId, idx)
    }
  })
  return { byWorkflowId: completedRowByWorkflowId, byRecipientId: completedRowByRecipientId }
}

type UpdateEntry = { workflowId: string; recipientId?: string; cells: Record<string, unknown> }

function applyRowUpdates(
  currentData: Record<string, unknown>[],
  columnMap: Map<string, SpreadsheetColumn>,
  updateByWorkflowId: Map<string, UpdateEntry>,
  updateByRecipientId: Map<string, UpdateEntry>,
  completedByWorkflowId: Map<string, UpdateEntry>,
  completedByRecipientId: Map<string, UpdateEntry>,
  recipientIdToBestRowIndex: Map<string, number>,
  completedRowByWorkflowId: Map<string, number>,
  completedRowByRecipientId: Map<string, number>
): {
  updatedExisting: Record<string, unknown>[]
  matchCount: number
  matchedUpdateIds: Set<string>
  matchedRecipientIds: Set<string>
  matchedCompletedWorkflowIds: Set<string>
  matchedCompletedRecipientIds: Set<string>
} {
  const matchedRecipientIds = new Set<string>()
  const matchedCompletedWorkflowIds = new Set<string>()
  const matchedCompletedRecipientIds = new Set<string>()
  const matchedUpdateIds = new Set<string>()
  let matchCount = 0

  const updatedExisting = currentData.map((row, rowIndex) => {
    const workflowId = row._workflow_id as string | undefined
    const recipientId = row.recipientId as string | undefined
    const status = String((row._workflow_status as string) ?? '').toLowerCase()

    if (workflowId && updateByWorkflowId.has(workflowId)) {
      matchCount++
      const update = updateByWorkflowId.get(workflowId)!
      matchedUpdateIds.add(update.workflowId)
      return { ...row, ...mapCellsToColumnNames(update.cells, columnMap), _updatedAt: new Date().toISOString() }
    }

    if (
      recipientId &&
      updateByRecipientId.has(recipientId) &&
      !matchedRecipientIds.has(recipientId) &&
      recipientIdToBestRowIndex.get(recipientId) === rowIndex
    ) {
      matchCount++
      matchedRecipientIds.add(recipientId)
      const update = updateByRecipientId.get(recipientId)!
      matchedUpdateIds.add(update.workflowId)
      return {
        ...row,
        ...mapCellsToColumnNames(update.cells, columnMap),
        _workflow_id: update.workflowId,
        _updatedAt: new Date().toISOString()
      }
    }

    if (status === 'completed' && workflowId && completedByWorkflowId.has(workflowId)) {
      const completedIdx = completedRowByWorkflowId.get(workflowId)
      if (completedIdx === rowIndex) {
        matchCount++
        const update = completedByWorkflowId.get(workflowId)!
        matchedCompletedWorkflowIds.add(workflowId)
        matchedUpdateIds.add(update.workflowId)
        return { ...row, ...mapCellsToColumnNames(update.cells, columnMap), _updatedAt: new Date().toISOString() }
      }
    }

    if (
      status === 'completed' &&
      recipientId &&
      completedByRecipientId.has(recipientId) &&
      !matchedCompletedRecipientIds.has(recipientId)
    ) {
      const completedIdx = completedRowByRecipientId.get(recipientId)
      if (completedIdx === rowIndex) {
        matchCount++
        const update = completedByRecipientId.get(recipientId)!
        matchedCompletedRecipientIds.add(recipientId)
        matchedUpdateIds.add(update.workflowId)
        return {
          ...row,
          ...mapCellsToColumnNames(update.cells, columnMap),
          _workflow_id: update.workflowId,
          _updatedAt: new Date().toISOString()
        }
      }
    }

    return row
  })

  return {
    updatedExisting,
    matchCount,
    matchedUpdateIds,
    matchedRecipientIds,
    matchedCompletedWorkflowIds,
    matchedCompletedRecipientIds
  }
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

      const columnMap = buildColumnLookupMap(updatedColumns)

      // Build new rows
      const newRows = rows.map(rowData => {
        const newRow: Record<string, unknown> = {
          // Use non-UUID temp id so persistence layer treats it as new row (addRow).
          _id: `tmp_${crypto.randomUUID()}`,
          _createdAt: new Date().toISOString(),
          ...rowData.metadata
        }

        Object.assign(newRow, mapCellsToColumnNames(rowData.cells, columnMap))

        return newRow
      })

      // Legacy behavior parity: for data collection sheets, first insert a visible
      // header line with tracking labels when the sheet is empty.
      const hasTrackingColumns = updatedColumns.some(col => isTrackingColumn(col.name) || isTrackingColumn(col.id))
      const hasHeaderRowAlready = localSheetDataRef.current.some(row => row._isTrackingHeader === true)
      const shouldInsertHeaderRow = hasTrackingColumns && !hasHeaderRowAlready

      const headerRow: Record<string, unknown> | null = shouldInsertHeaderRow
        ? createTrackingHeaderRow(updatedColumns)
        : null

      // Update local data
      const currentData = localSheetDataRef.current
      const newData = [...currentData, ...(headerRow ? [headerRow] : []), ...newRows]
      localSheetDataRef.current = newData
      setLocalSheetData(newData)

      // Persist changes
      // NOTE: `onAppUpdate` does not persist sheet row data in database-backed mode.
      // Prefer sheet/row persistence callbacks so collection report rows survive refresh.
      if (newColumns.length > 0) {
        if (onSheetUpdate) {
          Promise.resolve(onSheetUpdate(app.id, activeSheet.id, { columns: updatedColumns })).catch(err =>
            console.error('[handleAddRows] onSheetUpdate failed:', err)
          )
        } else if (onAppUpdate) {
          const updatedSheets = app.sheets.map(sheet =>
            sheet.id === activeSheet.id ? { ...sheet, columns: updatedColumns } : sheet
          )
          onAppUpdate({ ...app, sheets: updatedSheets })
        }
      }

      // Persist row data through the row data channel.
      // Prefer explicit row APIs when available (Univer path) to avoid full-sheet replay persistence.
      if (onRowAdd) {
        void (async () => {
          const persistedByTempId = new Map<string, Record<string, unknown>>()
          const rowsToPersist = [...(headerRow ? [headerRow] : []), ...newRows]
          for (const row of rowsToPersist) {
            const tempId = String(row._id ?? '')
            const rowToPersist = { ...row }
            delete rowToPersist._id
            delete rowToPersist._createdAt
            delete rowToPersist._updatedAt
            try {
              const persisted = await onRowAdd(app.id, activeSheet.id, rowToPersist)
              if (tempId && persisted) {
                persistedByTempId.set(tempId, persisted)
              }
            } catch (err) {
              console.error('[handleAddRows] onRowAdd failed:', err)
            }
          }

          if (persistedByTempId.size > 0) {
            const reconciled = localSheetDataRef.current.map(row => {
              const tempId = String(row._id ?? '')
              const persisted = persistedByTempId.get(tempId)
              if (persisted) {
                return {
                  ...row,
                  _id: persisted._id ?? row._id,
                  _rowUuid: persisted._rowUuid ?? persisted.id ?? row._rowUuid
                }
              }
              return row
            })
            localSheetDataRef.current = reconciled
            setLocalSheetData(reconciled)
          }
        })()
      } else {
        // Legacy fallback: persist full data through parent callback.
        onDataChange?.(activeSheet.id, newData)
      }
    },
    [
      activeSheet,
      app,
      onDataChange,
      onAppUpdate,
      onRowAdd,
      onSheetUpdate,
      localSheetDataRef,
      setLocalSheetData,
      saveTimeoutRef
    ]
  )

  const handleUpdateRows = useCallback(
    (updates: Array<{ workflowId: string; recipientId?: string; cells: Record<string, unknown> }>) => {
      // Cancel pending saves
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }

      if (!activeSheet || updates.length === 0) return

      const allFieldNames = collectFieldNamesFromUpdates(updates, INTERNAL_METADATA_FIELDS)
      const newFieldNames = findNewFields(allFieldNames, activeSheet.columns)
      const newColumns = createColumnsForFields(newFieldNames)
      const updatedColumns = mergeColumns(activeSheet.columns, newColumns)

      const columnMap = buildColumnLookupMap(updatedColumns)

      // Completed updates: add new row only if no existing Completed row matches (workflowId or recipientId).
      // When polling re-sends the same Completed response, we UPDATE the existing Completed row instead of adding another.
      const isCompletedUpdate = (u: { cells: Record<string, unknown> }) =>
        String(u.cells['_workflow_status'] ?? '').toLowerCase() === 'completed'

      const completedUpdates = updates.filter(isCompletedUpdate)
      const nonCompletedUpdates = updates.filter(u => !isCompletedUpdate(u))

      // Build update maps for non-Completed (Sent, etc.)
      const updateByWorkflowId = new Map(nonCompletedUpdates.map(u => [u.workflowId, u]))
      const updateByRecipientId = new Map(nonCompletedUpdates.filter(u => u.recipientId).map(u => [u.recipientId!, u]))
      const completedByWorkflowId = new Map(completedUpdates.map(u => [u.workflowId, u]))
      const completedByRecipientId = new Map(completedUpdates.filter(u => u.recipientId).map(u => [u.recipientId!, u]))

      const currentData = localSheetDataRef.current
      const recipientIdToBestRowIndex = buildRecipientIdToBestRowIndex(currentData, updateByRecipientId)
      const { byWorkflowId: completedRowByWorkflowId, byRecipientId: completedRowByRecipientId } =
        buildCompletedRowIndices(currentData, completedByWorkflowId, completedByRecipientId)

      const {
        updatedExisting,
        matchCount,
        matchedUpdateIds,
        matchedRecipientIds,
        matchedCompletedWorkflowIds,
        matchedCompletedRecipientIds
      } = applyRowUpdates(
        currentData,
        columnMap,
        updateByWorkflowId,
        updateByRecipientId,
        completedByWorkflowId,
        completedByRecipientId,
        recipientIdToBestRowIndex,
        completedRowByWorkflowId,
        completedRowByRecipientId
      )

      // Create new rows only for updates that didn't match any existing row:
      // - Completed: only if no existing Completed row for this workflowId/recipientId
      // - Non-Completed: only if no matching row found
      const unmatchedNonCompleted = nonCompletedUpdates.filter(
        u => !matchedUpdateIds.has(u.workflowId) && !(u.recipientId && matchedRecipientIds.has(u.recipientId))
      )
      const unmatchedCompleted = completedUpdates.filter(
        u =>
          !matchedCompletedWorkflowIds.has(u.workflowId) &&
          !(u.recipientId && matchedCompletedRecipientIds.has(u.recipientId))
      )
      const unmatchedUpdates = [...unmatchedCompleted, ...unmatchedNonCompleted]
      let addedRows: Record<string, unknown>[] = []

      if (unmatchedUpdates.length > 0) {
        const createdAt = new Date().toISOString()
        addedRows = unmatchedUpdates.map(update => {
          const newRow: Record<string, unknown> = {
            // Use non-UUID temp id so persistence layer treats it as new row (addRow).
            _id: `tmp_${crypto.randomUUID()}`,
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

      // Legacy behavior parity: ensure a visible tracking header row exists in report sheets.
      // Completed updates often flow through handleUpdateRows (not handleAddRows), so we need
      // the same header insertion logic here as well.
      const hasTrackingColumns = updatedColumns.some(col => isTrackingColumn(col.name) || isTrackingColumn(col.id))
      const hasHeaderRowAlready = localSheetDataRef.current.some(row => row._isTrackingHeader === true)
      const shouldInsertHeaderRow = hasTrackingColumns && !hasHeaderRowAlready
      if (shouldInsertHeaderRow) {
        const headerRow = createTrackingHeaderRow(updatedColumns)
        // Put headers first so they are immediately visible without scrolling.
        addedRows = [headerRow, ...addedRows]
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
              const mappedCells = mapCellsToColumnNames(update.cells, columnMap)

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

                      const added = await onRowAdd(app.id, activeSheet.id, fullRowData)
                      // Replace temp/stale local id with backend id to avoid repeated 404 update loops.
                      if (added && added._id) {
                        const next = localSheetDataRef.current.map(row => {
                          if (row._workflow_id === update.workflowId) {
                            return { ...row, _id: added._id, _rowUuid: added._rowUuid ?? row._rowUuid }
                          }
                          return row
                        })
                        localSheetDataRef.current = next
                        setLocalSheetData(next)
                      }
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

        // Persist any unmatched newly-added rows as real backend rows.
        if (addedRows.length > 0) {
          if (onRowAdd) {
            for (const row of addedRows) {
              const rowToPersist = { ...row }
              delete rowToPersist._id
              delete rowToPersist._createdAt
              delete rowToPersist._updatedAt
              onRowAdd(app.id, activeSheet.id, rowToPersist).catch(err => {
                console.error('[handleUpdateRows] onRowAdd failed for unmatched row:', err)
              })
            }
          } else {
            onDataChange?.(activeSheet.id, newData)
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
