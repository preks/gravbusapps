/**
 * useSpreadsheetBulkRows
 *
 * Handles bulk row operations from automation/collection responses.
 * Creates new columns for tracking fields if they don't exist.
 */

import { useCallback, useRef } from 'react'
import type { SpreadsheetApp, SpreadsheetSheet, SpreadsheetColumn } from '../types'
import { isTrackingColumn, getTrackingColumnDefaultWidth, isPlaceholderColumnTitle } from '../utils/trackingColumns'
import { TRACKING_COLUMNS } from '../components/automations/TrackingColumnsConfig'

// Internal metadata fields to skip (not user-visible columns)
const INTERNAL_METADATA_FIELDS = new Set([
  '_id',
  '_createdAt',
  '_updatedAt',
  '_workflow_id',
  '_recipient_id',
  '_isBulkCollectionPending',
  '_automationId',
  '__columnLabels__'
])

/** Row metadata from bulk run: form-field column IDs whose placeholder titles should stay hidden until a response. */
const BULK_DEFER_PLACEHOLDER_COLUMN_IDS_META = 'bulkDeferPlaceholderFormColumnIds'

function mergeBulkDeferPlaceholderColumnIds(rows: Array<{ metadata?: Record<string, unknown> }>): string[] | undefined {
  const set = new Set<string>()
  for (const r of rows) {
    const raw = r.metadata?.[BULK_DEFER_PLACEHOLDER_COLUMN_IDS_META]
    if (!Array.isArray(raw)) continue
    for (const id of raw) {
      if (typeof id === 'string' && id.trim()) set.add(id)
    }
  }
  return set.size > 0 ? [...set] : undefined
}

function applyDeferredBulkPlaceholderColumnVisibility(
  columns: SpreadsheetColumn[],
  deferredColumnIds: string[] | undefined
): { columns: SpreadsheetColumn[]; changed: boolean } {
  if (!deferredColumnIds?.length) return { columns, changed: false }
  const idSet = new Set(deferredColumnIds)
  let changed = false
  const next = columns.map(col => {
    if (!idSet.has(col.id)) return col
    const title = (col.label?.trim() || col.name || '').trim()
    if (!isPlaceholderColumnTitle(title)) return col
    if (col.isVisible === false) return col
    changed = true
    return { ...col, isVisible: false }
  })
  return { columns: next, changed }
}

function collectColumnKeysTouchedByCollectionUpdates(
  updates: Array<{ cells: Record<string, unknown>; columnLabels?: Record<string, string> }>
): Set<string> {
  const out = new Set<string>()
  for (const u of updates) {
    for (const key of Object.keys(u.cells ?? {})) {
      if (INTERNAL_METADATA_FIELDS.has(key)) continue
      out.add(key)
    }
    const cl = u.columnLabels
    if (cl && typeof cl === 'object') {
      for (const key of Object.keys(cl)) {
        if (key.trim()) out.add(key)
      }
    }
  }
  return out
}

function revealBulkPlaceholderColumnsAfterResponse(
  columns: SpreadsheetColumn[],
  touchedKeys: Set<string>
): { columns: SpreadsheetColumn[]; changed: boolean } {
  if (touchedKeys.size === 0) return { columns, changed: false }
  let changed = false
  const next = columns.map(col => {
    if (col.isVisible !== false) return col
    const title = (col.label?.trim() || col.name || '').trim()
    if (!isPlaceholderColumnTitle(title)) return col
    const hit = touchedKeys.has(col.name) || touchedKeys.has(col.id)
    if (!hit) return col
    changed = true
    return { ...col, isVisible: true }
  })
  return { columns: next, changed }
}

/** Keeps SpreadsheetSession + peer caches aligned with optimistic bulk mutations (viewer wired path). */
export type SpreadsheetCommitOptimisticActiveSheetRows = (nextRows: Record<string, unknown>[]) => void

export interface UseSpreadsheetBulkRowsProps {
  app: SpreadsheetApp
  activeSheet: SpreadsheetSheet | null
  localSheetDataRef: React.MutableRefObject<Record<string, unknown>[]>
  /**
   * When set (SpreadsheetAppViewer), bulk reads prefer live SpreadsheetSession rows for the active sheet,
   * then `localSheetDataRef` — avoids stale ref snapshots versus session during merges/reconcile.
   */
  canonicalActiveSheetRowsSourceRef?: React.MutableRefObject<() => Record<string, unknown>[]>
  /** Updates spreadsheet session rows for the active sheet (viewer `commitLocalSheetData` pipeline). */
  commitOptimisticActiveSheetRows: SpreadsheetCommitOptimisticActiveSheetRows
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
  /** Called when automation adds/updates rows so the grid can refresh (e.g. bump snapshotSeed). */
  onRequestGridRefresh?: () => void
}

export interface SpreadsheetBulkRowsHandlers {
  handleAddRows: (rows: Array<{ cells: Record<string, unknown>; metadata?: Record<string, unknown> }>) => void
  handleUpdateRows: (
    updates: Array<{
      workflowId: string
      recipientId?: string
      cells: Record<string, unknown>
      columnLabels?: Record<string, string>
    }>
  ) => void
  handleAddRowsRef: React.MutableRefObject<typeof handleAddRows | null>
  handleUpdateRowsRef: React.MutableRefObject<typeof handleUpdateRows | null>
}

type HandleAddRowsFn = (rows: Array<{ cells: Record<string, unknown>; metadata?: Record<string, unknown> }>) => void
type HandleUpdateRowsFn = (
  updates: Array<{
    workflowId: string
    recipientId?: string
    cells: Record<string, unknown>
    columnLabels?: Record<string, string>
  }>
) => void

const AUTO_FIT_MIN_WIDTH = 80
const AUTO_FIT_MAX_WIDTH = 560
const AUTO_FIT_CHAR_PX = 8
const AUTO_FIT_CELL_PADDING = 32
const AUTO_FIT_SAMPLE_LIMIT = 2000

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
function createColumnsForFields(newFieldNames: string[], columnLabels?: Record<string, string>): SpreadsheetColumn[] {
  return newFieldNames.map((fieldName, index) => {
    const trackingCol = TRACKING_COLUMNS.find(tc => tc.name === fieldName)

    let label: string
    let colType: SpreadsheetColumn['type'] = 'text'

    if (columnLabels?.[fieldName]?.trim()) {
      label = columnLabels[fieldName].trim()
    } else if (trackingCol) {
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

    const trackingWidth = trackingCol ? getTrackingColumnDefaultWidth(trackingCol.id) : undefined

    return {
      id:
        fieldName.startsWith('col_') || fieldName === '__new__' || fieldName.startsWith('_')
          ? fieldName
          : `col_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 5)}`,
      name: fieldName,
      label,
      type: colType,
      width: trackingWidth,
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

/** Apply display labels to existing columns (e.g. bulk form field titles) — createColumnsForFields only runs for new keys. */
function applyColumnLabelPatches(
  columns: SpreadsheetColumn[],
  patches: Record<string, string> | undefined
): { columns: SpreadsheetColumn[]; changed: boolean } {
  if (!patches || Object.keys(patches).length === 0) {
    return { columns, changed: false }
  }
  let changed = false
  const next = columns.map(col => {
    const raw = patches[col.name] ?? patches[col.id]
    const nextLabel = typeof raw === 'string' ? raw.trim() : ''
    if (!nextLabel) return col
    if ((col.label || '').trim() === nextLabel) return col
    changed = true
    return { ...col, label: nextLabel }
  })
  return { columns: next, changed }
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

function getCellDisplayText(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) {
    return value.map(item => getCellDisplayText(item)).join(', ')
  }
  if (typeof value === 'object') {
    const objectValue = value as Record<string, unknown>
    if (typeof objectValue.v === 'string' || typeof objectValue.v === 'number') return String(objectValue.v)
    if (typeof objectValue.m === 'string' || typeof objectValue.m === 'number') return String(objectValue.m)
    if (typeof objectValue.f === 'string') return objectValue.f
  }
  return ''
}

function clampWidth(width: number): number {
  return Math.min(AUTO_FIT_MAX_WIDTH, Math.max(AUTO_FIT_MIN_WIDTH, width))
}

function estimateWidthFromText(text: string): number {
  const normalizedLength = text.replaceAll(/\s+/g, ' ').trim().length
  if (normalizedLength <= 0) return AUTO_FIT_MIN_WIDTH
  return clampWidth(Math.ceil(normalizedLength * AUTO_FIT_CHAR_PX + AUTO_FIT_CELL_PADDING))
}

function applyDynamicColumnWidths(
  columns: SpreadsheetColumn[],
  rows: Record<string, unknown>[]
): { columns: SpreadsheetColumn[]; changed: boolean } {
  const sampleRows = rows.slice(0, AUTO_FIT_SAMPLE_LIMIT)
  let changed = false

  const nextColumns = columns.map(column => {
    // Keep avatar/image columns compact.
    if (column.type === 'image') {
      const targetWidth = 40
      const currentWidth = typeof column.width === 'number' ? column.width : 0
      if (currentWidth >= targetWidth) return column
      changed = true
      return { ...column, width: targetWidth }
    }

    let widest = estimateWidthFromText(column.label || column.name || '')

    for (const row of sampleRows) {
      const value = row[column.name] ?? row[column.id]
      const text = getCellDisplayText(value)
      if (!text) continue
      widest = Math.max(widest, estimateWidthFromText(text))
      if (widest >= AUTO_FIT_MAX_WIDTH) break
    }

    const currentWidth = typeof column.width === 'number' ? column.width : 0
    // Only widen automatically, never shrink user-resized columns.
    if (widest > currentWidth) {
      changed = true
      return { ...column, width: widest }
    }

    return column
  })

  return { columns: nextColumns, changed }
}

function createTrackingHeaderRow(updatedColumns: SpreadsheetColumn[]): Record<string, unknown> {
  return updatedColumns.reduce<Record<string, unknown>>(
    (acc, col) => {
      if (col.isVisible === false) return acc
      // Every visible column needs a title cell (Univer has no separate schema headers for row 0).
      // Previously only tracking columns were filled, so bulk form / data columns showed blank headers.
      const title = (col.label?.trim() || col.name || '').trim()
      if (title && !isPlaceholderColumnTitle(title)) {
        acc[col.name] = title
        if (col.id !== col.name) acc[col.id] = title
      }
      return acc
    },
    {
      _id: `tmp_header_${crypto.randomUUID()}`,
      _isTrackingHeader: true,
      // Keep enough height for wrapped multi-word tracking headers.
      _height: 42
    }
  )
}

/** Align the synthetic header row with current column labels (e.g. after bulk form titles are resolved). */
export function syncTrackingHeaderRowWithColumnLabels(
  rows: Record<string, unknown>[],
  columns: SpreadsheetColumn[]
): Record<string, unknown>[] {
  const headerIdx = rows.findIndex(r => r._isTrackingHeader === true)
  if (headerIdx < 0) return rows
  const header = rows[headerIdx]
  let changed = false
  const next: Record<string, unknown> = { ...header }
  for (const col of columns) {
    if (col.isVisible === false) continue
    const text = (col.label?.trim() || col.name || '').trim()
    if (!text) continue
    const fromName = header[col.name]
    const fromId = col.id !== col.name ? header[col.id] : undefined
    let current = ''
    if (fromName !== undefined && fromName !== null && String(fromName).trim() !== '') {
      current = String(fromName).trim()
    } else if (fromId !== undefined && fromId !== null && String(fromId).trim() !== '') {
      current = String(fromId).trim()
    }
    // User cleared an unused "Column B"-style header; schema still has the placeholder — do not refill.
    if (current === '' && isPlaceholderColumnTitle(text)) {
      continue
    }
    if (current !== text) {
      next[col.name] = text
      if (col.id !== col.name) next[col.id] = text
      changed = true
    }
  }
  if (!changed) return rows
  const out = [...rows]
  out[headerIdx] = next
  return out
}

function mergeColumnLabelsFromRowMetadata(
  rows: Array<{ metadata?: Record<string, unknown> }>
): Record<string, string> | undefined {
  const merged: Record<string, string> = {}
  let hasAny = false
  for (const row of rows) {
    const labels = row.metadata?.columnLabels as Record<string, string> | undefined
    if (!labels || typeof labels !== 'object') continue
    for (const [name, label] of Object.entries(labels)) {
      if (typeof label === 'string' && label.trim()) {
        merged[name] = label.trim()
        hasAny = true
      }
    }
  }
  return hasAny ? merged : undefined
}

function mergeColumnLabelsFromUpdates(
  updates: Array<{ columnLabels?: Record<string, string> }>
): Record<string, string> | undefined {
  const merged: Record<string, string> = {}
  let hasAny = false
  for (const u of updates) {
    if (!u.columnLabels) continue
    for (const [name, label] of Object.entries(u.columnLabels)) {
      if (typeof label === 'string' && label.trim()) {
        merged[name] = label.trim()
        hasAny = true
      }
    }
  }
  return hasAny ? merged : undefined
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

/** Find rows by workflowId/recipientId for completion updates, regardless of current status (e.g. "Sent" → "Completed"). */
function buildCompletionTargetRowIndices(
  currentData: Record<string, unknown>[],
  completedByWorkflowId: Map<string, { workflowId: string; recipientId?: string; cells: Record<string, unknown> }>,
  completedByRecipientId: Map<string, { workflowId: string; recipientId?: string; cells: Record<string, unknown> }>
): { byWorkflowId: Map<string, number>; byRecipientId: Map<string, number> } {
  const byWorkflowId = new Map<string, number>()
  const byRecipientId = new Map<string, number>()
  currentData.forEach((row, idx) => {
    const workflowId = row._workflow_id as string | undefined
    const recipientId = row.recipientId as string | undefined
    if (workflowId && completedByWorkflowId.has(workflowId) && !byWorkflowId.has(workflowId)) {
      byWorkflowId.set(workflowId, idx)
    }
    if (recipientId && completedByRecipientId.has(recipientId) && !byRecipientId.has(recipientId)) {
      byRecipientId.set(recipientId, idx)
    }
  })
  return { byWorkflowId, byRecipientId }
}

type UpdateEntry = {
  workflowId: string
  recipientId?: string
  cells: Record<string, unknown>
  columnLabels?: Record<string, string>
}
type UpdatePayload = Array<UpdateEntry>

function applyRowUpdates(
  currentData: Record<string, unknown>[],
  columnMap: Map<string, SpreadsheetColumn>,
  updateByWorkflowId: Map<string, UpdateEntry>,
  updateByRecipientId: Map<string, UpdateEntry>,
  completedByWorkflowId: Map<string, UpdateEntry>,
  completedByRecipientId: Map<string, UpdateEntry>,
  recipientIdToBestRowIndex: Map<string, number>,
  completedRowByWorkflowId: Map<string, number>,
  completedRowByRecipientId: Map<string, number>,
  completionTargetByWorkflowId: Map<string, number>,
  completionTargetByRecipientId: Map<string, number>
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

    // First-time completion: match by workflowId/recipientId regardless of row status (e.g. "Sent" → "Completed")
    if (
      workflowId &&
      completedByWorkflowId.has(workflowId) &&
      !matchedCompletedWorkflowIds.has(workflowId) &&
      completionTargetByWorkflowId.get(workflowId) === rowIndex
    ) {
      matchCount++
      const update = completedByWorkflowId.get(workflowId)!
      matchedCompletedWorkflowIds.add(update.workflowId)
      matchedUpdateIds.add(update.workflowId)
      return {
        ...row,
        ...mapCellsToColumnNames(update.cells, columnMap),
        _workflow_id: update.workflowId,
        _updatedAt: new Date().toISOString()
      }
    }

    if (
      recipientId &&
      completedByRecipientId.has(recipientId) &&
      !matchedCompletedRecipientIds.has(recipientId) &&
      completionTargetByRecipientId.get(recipientId) === rowIndex
    ) {
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

function clearPendingSave(saveTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>): void {
  if (!saveTimeoutRef.current) return
  clearTimeout(saveTimeoutRef.current)
  saveTimeoutRef.current = null
}

function splitUpdatesByCompletion(updates: UpdatePayload): {
  completedUpdates: UpdateEntry[]
  nonCompletedUpdates: UpdateEntry[]
} {
  const isCompletedUpdate = (update: UpdateEntry) =>
    String(update.cells['_workflow_status'] ?? '').toLowerCase() === 'completed'
  return {
    completedUpdates: updates.filter(isCompletedUpdate),
    nonCompletedUpdates: updates.filter(update => !isCompletedUpdate(update))
  }
}

function buildUpdateMaps(
  nonCompletedUpdates: UpdateEntry[],
  completedUpdates: UpdateEntry[]
): {
  updateByWorkflowId: Map<string, UpdateEntry>
  updateByRecipientId: Map<string, UpdateEntry>
  completedByWorkflowId: Map<string, UpdateEntry>
  completedByRecipientId: Map<string, UpdateEntry>
} {
  return {
    updateByWorkflowId: new Map(nonCompletedUpdates.map(update => [update.workflowId, update])),
    updateByRecipientId: new Map(
      nonCompletedUpdates.filter(update => update.recipientId).map(update => [update.recipientId!, update])
    ),
    completedByWorkflowId: new Map(completedUpdates.map(update => [update.workflowId, update])),
    completedByRecipientId: new Map(
      completedUpdates.filter(update => update.recipientId).map(update => [update.recipientId!, update])
    )
  }
}

function buildUnmatchedUpdates(params: {
  nonCompletedUpdates: UpdateEntry[]
  completedUpdates: UpdateEntry[]
  matchedUpdateIds: Set<string>
  matchedRecipientIds: Set<string>
  matchedCompletedWorkflowIds: Set<string>
  matchedCompletedRecipientIds: Set<string>
}): UpdateEntry[] {
  const {
    nonCompletedUpdates,
    completedUpdates,
    matchedUpdateIds,
    matchedRecipientIds,
    matchedCompletedWorkflowIds,
    matchedCompletedRecipientIds
  } = params
  const unmatchedNonCompleted = nonCompletedUpdates.filter(
    update =>
      !matchedUpdateIds.has(update.workflowId) && !(update.recipientId && matchedRecipientIds.has(update.recipientId))
  )
  const unmatchedCompleted = completedUpdates.filter(
    update =>
      !matchedCompletedWorkflowIds.has(update.workflowId) &&
      !(update.recipientId && matchedCompletedRecipientIds.has(update.recipientId))
  )
  return [...unmatchedCompleted, ...unmatchedNonCompleted]
}

function createRowsFromUnmatchedUpdates(
  unmatchedUpdates: UpdateEntry[],
  columnMap: Map<string, SpreadsheetColumn>
): Record<string, unknown>[] {
  if (unmatchedUpdates.length === 0) return []
  const createdAt = new Date().toISOString()
  return unmatchedUpdates.map(update => {
    const newRow: Record<string, unknown> = {
      _id: `tmp_${crypto.randomUUID()}`,
      _createdAt: createdAt,
      _workflow_id: update.workflowId
    }
    if (update.recipientId) newRow.recipientId = update.recipientId
    Object.entries(update.cells).forEach(([key, value]) => {
      const column = columnMap.get(key)
      newRow[column ? column.name : key] = value
    })
    return newRow
  })
}

function insertTrackingHeaderIfNeeded(
  addedRows: Record<string, unknown>[],
  updatedColumns: SpreadsheetColumn[],
  currentData: Record<string, unknown>[]
): Record<string, unknown>[] {
  const hasTrackingColumns = updatedColumns.some(column => isTrackingColumn(column.name) || isTrackingColumn(column.id))
  const hasHeaderRowAlready = currentData.some(row => row._isTrackingHeader === true)
  if (!hasTrackingColumns || hasHeaderRowAlready) return addedRows
  return [createTrackingHeaderRow(updatedColumns), ...addedRows]
}

function persistColumnChanges(params: {
  shouldPersistColumns: boolean
  onSheetUpdate?: (appId: string, sheetId: string, updates: Partial<SpreadsheetSheet>) => Promise<unknown>
  onAppUpdate?: (app: SpreadsheetApp) => void
  app: SpreadsheetApp
  activeSheet: SpreadsheetSheet
  updatedColumns: SpreadsheetColumn[]
}): void {
  const { shouldPersistColumns, onSheetUpdate, onAppUpdate, app, activeSheet, updatedColumns } = params
  if (!shouldPersistColumns) return
  if (onSheetUpdate) {
    Promise.resolve(onSheetUpdate(app.id, activeSheet.id, { columns: updatedColumns })).catch(err =>
      console.error('[handleUpdateRows] onSheetUpdate failed:', err)
    )
    return
  }
  if (!onAppUpdate) return
  const updatedSheets = app.sheets.map(sheet =>
    sheet.id === activeSheet.id ? { ...sheet, columns: updatedColumns } : sheet
  )
  Promise.resolve(onAppUpdate({ ...app, sheets: updatedSheets })).catch(err =>
    console.error('[handleUpdateRows] onAppUpdate (columns) failed:', err)
  )
}

function findRowForUpdatePersistence(
  data: Record<string, unknown>[],
  update: UpdateEntry
): Record<string, unknown> | undefined {
  const byWorkflow = data.find(row => row._workflow_id === update.workflowId)
  if (byWorkflow) return byWorkflow
  if (!update.recipientId) return undefined
  return data.find(row => row.recipientId === update.recipientId)
}

function buildRowDataForFallbackAdd(
  updatedRow: Record<string, unknown>,
  mappedCells: Record<string, unknown>
): Record<string, unknown> {
  const fullRowData: Record<string, unknown> = { ...mappedCells }
  if (updatedRow._workflow_id) fullRowData._workflow_id = updatedRow._workflow_id
  if (updatedRow.recipientId) fullRowData.recipientId = updatedRow.recipientId
  if (updatedRow._workflow_status) fullRowData._workflow_status = updatedRow._workflow_status
  return fullRowData
}

async function fallbackAddAndReconcileRow(params: {
  onRowAdd: (appId: string, sheetId: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>
  appId: string
  sheetId: string
  update: UpdateEntry
  updatedRow: Record<string, unknown>
  mappedCells: Record<string, unknown>
  commitOptimisticActiveSheetRows: SpreadsheetCommitOptimisticActiveSheetRows
  canonicalActiveSheetRowsSourceRef?: React.MutableRefObject<() => Record<string, unknown>[]>
  localSheetDataRef: React.MutableRefObject<Record<string, unknown>[]>
}): Promise<void> {
  const {
    onRowAdd,
    appId,
    sheetId,
    update,
    updatedRow,
    mappedCells,
    commitOptimisticActiveSheetRows,
    canonicalActiveSheetRowsSourceRef,
    localSheetDataRef
  } = params
  try {
    const added = await onRowAdd(appId, sheetId, buildRowDataForFallbackAdd(updatedRow, mappedCells))
    if (!added || !added._id) return
    const rowSnapshot = canonicalActiveSheetRowsSourceRef?.current() ?? localSheetDataRef.current
    const next = rowSnapshot.map(row => {
      if (row._workflow_id === update.workflowId) {
        return { ...row, _id: added._id, _rowUuid: added._rowUuid ?? row._rowUuid }
      }
      return row
    })
    commitOptimisticActiveSheetRows(next)
  } catch (addErr) {
    console.error('[handleUpdateRows] onRowAdd failed:', addErr)
  }
}

function persistMatchedRowUpdates(params: {
  updates: UpdatePayload
  newData: Record<string, unknown>[]
  appId: string
  sheetId: string
  columnMap: Map<string, SpreadsheetColumn>
  onRowUpdate?: (
    appId: string,
    sheetId: string,
    rowId: string,
    updates: Record<string, unknown>
  ) => Promise<Record<string, unknown> | null>
  onRowAdd?: (appId: string, sheetId: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>
  commitOptimisticActiveSheetRows: SpreadsheetCommitOptimisticActiveSheetRows
  canonicalActiveSheetRowsSourceRef?: React.MutableRefObject<() => Record<string, unknown>[]>
  localSheetDataRef: React.MutableRefObject<Record<string, unknown>[]>
}): void {
  const {
    updates,
    newData,
    appId,
    sheetId,
    columnMap,
    onRowUpdate,
    onRowAdd,
    commitOptimisticActiveSheetRows,
    canonicalActiveSheetRowsSourceRef,
    localSheetDataRef
  } = params
  if (!onRowUpdate) return
  updates.forEach(update => {
    const updatedRow = findRowForUpdatePersistence(newData, update)
    if (!updatedRow) return
    const rowId = String(updatedRow._id ?? updatedRow.id ?? '')
    if (!rowId) return
    const mappedCells = mapCellsToColumnNames(update.cells, columnMap)
    onRowUpdate(appId, sheetId, rowId, mappedCells)
      .then(async result => {
        if (result !== null || !onRowAdd) return
        await fallbackAddAndReconcileRow({
          onRowAdd,
          appId,
          sheetId,
          update,
          updatedRow,
          mappedCells,
          commitOptimisticActiveSheetRows,
          canonicalActiveSheetRowsSourceRef,
          localSheetDataRef
        })
      })
      .catch(err => {
        console.error('[handleUpdateRows] onRowUpdate failed for row:', rowId, err)
      })
  })
}

function persistAddedRows(params: {
  addedRows: Record<string, unknown>[]
  onRowAdd?: (appId: string, sheetId: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>
  onDataChange?: (sheetId: string, data: Record<string, unknown>[]) => void
  appId: string
  sheetId: string
  newData: Record<string, unknown>[]
}): void {
  const { addedRows, onRowAdd, onDataChange, appId, sheetId, newData } = params
  if (addedRows.length === 0) return
  if (!onRowAdd) {
    onDataChange?.(sheetId, newData)
    return
  }
  addedRows.forEach(row => {
    const rowToPersist = { ...row }
    delete rowToPersist._id
    delete rowToPersist._createdAt
    delete rowToPersist._updatedAt
    onRowAdd(appId, sheetId, rowToPersist).catch(err => {
      console.error('[handleUpdateRows] onRowAdd failed for unmatched row:', err)
    })
  })
}

export function useSpreadsheetBulkRows({
  app,
  activeSheet,
  localSheetDataRef,
  canonicalActiveSheetRowsSourceRef,
  commitOptimisticActiveSheetRows,
  onDataChange,
  onAppUpdate,
  onSheetUpdate,
  onRowUpdate,
  onRowAdd,
  saveTimeoutRef,
  onRequestGridRefresh
}: UseSpreadsheetBulkRowsProps): SpreadsheetBulkRowsHandlers {
  const handleAddRowsRef = useRef<HandleAddRowsFn | null>(null)
  const handleUpdateRowsRef = useRef<HandleUpdateRowsFn | null>(null)

  const readCanonicalActiveRows = (): Record<string, unknown>[] =>
    canonicalActiveSheetRowsSourceRef?.current() ?? localSheetDataRef.current

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
      const mergedColumnLabels = mergeColumnLabelsFromRowMetadata(rows)
      const newColumns = createColumnsForFields(newFieldNames, mergedColumnLabels)
      const mergedSheetColumns = mergeColumns(activeSheet.columns, newColumns)
      const { columns: patchedColumns, changed: columnLabelsPatched } = applyColumnLabelPatches(
        mergedSheetColumns,
        mergedColumnLabels
      )
      const deferredIds = mergeBulkDeferPlaceholderColumnIds(rows)
      const { columns: updatedColumns, changed: deferPlaceholderVisibilityChanged } =
        applyDeferredBulkPlaceholderColumnVisibility(patchedColumns, deferredIds)

      const columnMap = buildColumnLookupMap(updatedColumns)

      // Build new rows
      const newRows = rows.map(rowData => {
        const rawMeta = rowData.metadata ?? {}
        const rowMetadataWithoutDefer = { ...(rawMeta as Record<string, unknown>) }
        delete rowMetadataWithoutDefer[BULK_DEFER_PLACEHOLDER_COLUMN_IDS_META]
        const newRow: Record<string, unknown> = {
          // Use non-UUID temp id so persistence layer treats it as new row (addRow).
          _id: `tmp_${crypto.randomUUID()}`,
          _createdAt: new Date().toISOString(),
          ...rowMetadataWithoutDefer
        }

        Object.assign(newRow, mapCellsToColumnNames(rowData.cells, columnMap))

        return newRow
      })

      // Legacy behavior parity: for data collection sheets, first insert a visible
      // header line with tracking labels when the sheet is empty.
      const hasTrackingColumns = updatedColumns.some(col => isTrackingColumn(col.name) || isTrackingColumn(col.id))
      const hasHeaderRowAlready = readCanonicalActiveRows().some(row => row._isTrackingHeader === true)
      const shouldInsertHeaderRow = hasTrackingColumns && !hasHeaderRowAlready

      const headerRow: Record<string, unknown> | null = shouldInsertHeaderRow
        ? createTrackingHeaderRow(updatedColumns)
        : null

      // Update local data
      const currentData = readCanonicalActiveRows()
      const newData = [...currentData, ...(headerRow ? [headerRow] : []), ...newRows]
      const { columns: autoSizedColumns, changed: autoWidthChanged } = applyDynamicColumnWidths(updatedColumns, newData)
      commitOptimisticActiveSheetRows(newData)
      onRequestGridRefresh?.()

      // Persist changes
      // NOTE: `onAppUpdate` does not persist sheet row data in database-backed mode.
      // Prefer sheet/row persistence callbacks so collection report rows survive refresh.
      if (newColumns.length > 0 || autoWidthChanged || columnLabelsPatched || deferPlaceholderVisibilityChanged) {
        if (onSheetUpdate) {
          Promise.resolve(onSheetUpdate(app.id, activeSheet.id, { columns: autoSizedColumns })).catch(err =>
            console.error('[handleAddRows] onSheetUpdate failed:', err)
          )
        } else if (onAppUpdate) {
          const updatedSheets = app.sheets.map(sheet =>
            sheet.id === activeSheet.id ? { ...sheet, columns: autoSizedColumns } : sheet
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
            const reconciled = readCanonicalActiveRows().map(row => {
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
            commitOptimisticActiveSheetRows(reconciled)
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
      commitOptimisticActiveSheetRows,
      onDataChange,
      onAppUpdate,
      onRowAdd,
      onSheetUpdate,
      canonicalActiveSheetRowsSourceRef,
      localSheetDataRef,
      saveTimeoutRef,
      onRequestGridRefresh
    ]
  )

  const handleUpdateRows = useCallback(
    (
      updates: Array<{
        workflowId: string
        recipientId?: string
        cells: Record<string, unknown>
        columnLabels?: Record<string, string>
      }>
    ) => {
      clearPendingSave(saveTimeoutRef)
      if (!activeSheet || updates.length === 0) return

      const allFieldNames = collectFieldNamesFromUpdates(updates, INTERNAL_METADATA_FIELDS)
      const newFieldNames = findNewFields(allFieldNames, activeSheet.columns)
      const mergedColumnLabels = mergeColumnLabelsFromUpdates(updates)
      const newColumns = createColumnsForFields(newFieldNames, mergedColumnLabels)
      const mergedSheetColumns = mergeColumns(activeSheet.columns, newColumns)
      const { columns: patchedColumns, changed: columnLabelsPatched } = applyColumnLabelPatches(
        mergedSheetColumns,
        mergedColumnLabels
      )
      const touchedKeys = collectColumnKeysTouchedByCollectionUpdates(updates)
      const { columns: updatedColumns, changed: revealedPlaceholderVisibilityChanged } =
        revealBulkPlaceholderColumnsAfterResponse(patchedColumns, touchedKeys)
      const columnMap = buildColumnLookupMap(updatedColumns)
      const { completedUpdates, nonCompletedUpdates } = splitUpdatesByCompletion(updates)
      const { updateByWorkflowId, updateByRecipientId, completedByWorkflowId, completedByRecipientId } =
        buildUpdateMaps(nonCompletedUpdates, completedUpdates)

      const currentData = readCanonicalActiveRows()
      const recipientIdToBestRowIndex = buildRecipientIdToBestRowIndex(currentData, updateByRecipientId)
      const { byWorkflowId: completedRowByWorkflowId, byRecipientId: completedRowByRecipientId } =
        buildCompletedRowIndices(currentData, completedByWorkflowId, completedByRecipientId)
      const { byWorkflowId: completionTargetByWorkflowId, byRecipientId: completionTargetByRecipientId } =
        buildCompletionTargetRowIndices(currentData, completedByWorkflowId, completedByRecipientId)

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
        completedRowByRecipientId,
        completionTargetByWorkflowId,
        completionTargetByRecipientId
      )

      const unmatchedUpdates = buildUnmatchedUpdates({
        nonCompletedUpdates,
        completedUpdates,
        matchedUpdateIds,
        matchedRecipientIds,
        matchedCompletedWorkflowIds,
        matchedCompletedRecipientIds
      })
      const baseAddedRows = createRowsFromUnmatchedUpdates(unmatchedUpdates, columnMap)
      const addedRows = insertTrackingHeaderIfNeeded(baseAddedRows, updatedColumns, readCanonicalActiveRows())

      let newData = matchCount > 0 || addedRows.length > 0 ? [...updatedExisting, ...addedRows] : updatedExisting

      const shouldSyncHeaderRowLabels =
        newData.some(r => r._isTrackingHeader === true) &&
        (columnLabelsPatched ||
          Object.keys(mergedColumnLabels ?? {}).length > 0 ||
          revealedPlaceholderVisibilityChanged)

      let headerRowLabelCellsChanged = false
      if (shouldSyncHeaderRowLabels) {
        const beforeSync = newData
        newData = syncTrackingHeaderRowWithColumnLabels(newData, updatedColumns)
        headerRowLabelCellsChanged = newData !== beforeSync
      }

      const { columns: autoSizedColumns, changed: autoWidthChanged } = applyDynamicColumnWidths(updatedColumns, newData)

      if (
        matchCount === 0 &&
        addedRows.length === 0 &&
        newColumns.length === 0 &&
        !autoWidthChanged &&
        !columnLabelsPatched &&
        !headerRowLabelCellsChanged &&
        !revealedPlaceholderVisibilityChanged
      ) {
        return
      }

      commitOptimisticActiveSheetRows(newData)
      onRequestGridRefresh?.()

      persistColumnChanges({
        shouldPersistColumns:
          newColumns.length > 0 || autoWidthChanged || columnLabelsPatched || revealedPlaceholderVisibilityChanged,
        onSheetUpdate,
        onAppUpdate,
        app,
        activeSheet,
        updatedColumns: autoSizedColumns
      })
      if (matchCount > 0 && onRowUpdate) {
        persistMatchedRowUpdates({
          updates,
          newData,
          appId: app.id,
          sheetId: activeSheet.id,
          columnMap,
          onRowUpdate,
          onRowAdd,
          commitOptimisticActiveSheetRows,
          canonicalActiveSheetRowsSourceRef,
          localSheetDataRef
        })
      }
      if (addedRows.length > 0) {
        persistAddedRows({ addedRows, onRowAdd, onDataChange, appId: app.id, sheetId: activeSheet.id, newData })
      }
      if (matchCount > 0 || addedRows.length > 0 || headerRowLabelCellsChanged) {
        onDataChange?.(activeSheet.id, newData)
      }
    },
    [
      activeSheet,
      app,
      commitOptimisticActiveSheetRows,
      onDataChange,
      onAppUpdate,
      onSheetUpdate,
      onRowUpdate,
      onRowAdd,
      canonicalActiveSheetRowsSourceRef,
      localSheetDataRef,
      saveTimeoutRef,
      onRequestGridRefresh
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
