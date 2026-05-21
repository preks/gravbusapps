import type { SpreadsheetColumn } from '../types'

/** Row keys excluded when building Excel collection completion payload from session rows. */
export const EXCEL_COLLECTION_FORM_INTERNAL_KEYS = new Set([
  '_id',
  '_createdAt',
  '_updatedAt',
  '_workflow_id',
  '_recipient_id',
  '_isBulkCollectionPending',
  '_automationId'
])

/**
 * Builds optional form payload for `completeExcelCollectionTask` from viewer rows and visible columns.
 * Mirrors legacy SpreadsheetAppViewer behavior.
 */
export function buildExcelCollectionSubmitFormData(params: {
  sourceRows: Record<string, unknown>[] | null | undefined
  visibleColumns: SpreadsheetColumn[]
}): Record<string, unknown> | undefined {
  const { sourceRows, visibleColumns } = params
  if (!sourceRows?.length) {
    return undefined
  }

  const firstDataRow = sourceRows.find(row =>
    Object.entries(row).some(
      ([k, v]) => !EXCEL_COLLECTION_FORM_INTERNAL_KEYS.has(k) && v != null && String(v).trim() !== ''
    )
  )
  if (!firstDataRow) {
    return undefined
  }

  const formData: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(firstDataRow)) {
    if (!EXCEL_COLLECTION_FORM_INTERNAL_KEYS.has(key) && value != null && value !== '') {
      formData[key] = value
    }
  }

  const columnLabels: Record<string, string> = {}
  for (const col of visibleColumns.filter(c => c.isVisible !== false)) {
    if (col.label?.trim()) {
      columnLabels[col.name] = col.label.trim()
    }
  }
  if (Object.keys(columnLabels).length > 0) {
    formData.__columnLabels__ = columnLabels
  }

  return formData
}
