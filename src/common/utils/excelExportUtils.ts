/**
 * Shared Excel / file-export utilities.
 *
 * Centralises helpers used by multiple export features (spreadsheet-apps,
 * backoffice-expenses, etc.) so that SonarQube does not flag cross-module
 * duplication.
 */

import ExcelJS from 'exceljs'
import { sanitizeFilename } from '@/common/utils/textUtils'

// ---------------------------------------------------------------------------
// Cell formatting
// ---------------------------------------------------------------------------

/** Formats a cell value for display in exports (handles null, Date, arrays, booleans, objects). */
export const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().split('T')[0]
  if (Array.isArray(value)) return value.map(item => formatCellValue(item)).join(', ')
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

// ---------------------------------------------------------------------------
// Filename helpers
// ---------------------------------------------------------------------------

/** Zero-pads a number to 2 digits. */
const pad = (n: number) => String(n).padStart(2, '0')

/** Returns a UTC timestamp string in the form `YYYYMMDD-HHmmss`. */
export const buildTimestamp = (): string => {
  const ts = new Date()
  return `${ts.getUTCFullYear()}${pad(ts.getUTCMonth() + 1)}${pad(ts.getUTCDate())}-${pad(ts.getUTCHours())}${pad(ts.getUTCMinutes())}${pad(ts.getUTCSeconds())}`
}

/** Builds a sanitised, timestamped filename. */
export const buildFilename = (prefix: string, ext: string): string =>
  sanitizeFilename(`${prefix}-${buildTimestamp()}.${ext}`)

// ---------------------------------------------------------------------------
// Download trigger
// ---------------------------------------------------------------------------

/** Creates a temporary anchor to trigger a blob download in the browser. */
export const triggerDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.setAttribute('rel', 'noopener noreferrer')
  link.click()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Excel workbook helpers
// ---------------------------------------------------------------------------

export interface ExcelColumn {
  header: string
  key: string
}

/**
 * Creates an ExcelJS workbook with a single styled worksheet, populates it
 * with the given columns and data rows, and returns the workbook.
 */
export const buildExcelWorkbook = (
  sheetName: string,
  columns: ExcelColumn[],
  data: Record<string, unknown>[],
  creator: string = 'NEWWORK'
): ExcelJS.Workbook => {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = creator
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet(sheetName)

  // Configure columns with headers and initial width
  worksheet.columns = columns.map(col => ({
    header: col.header,
    key: col.key,
    width: Math.max(col.header.length + 2, 15)
  }))

  // Style the header row
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  }
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' }

  // Add data rows
  data.forEach(row => {
    const rowData: Record<string, unknown> = {}
    columns.forEach(col => {
      const rawValue = row[col.key]
      // Keep real numbers as numeric Excel cells; stringify all other values.
      rowData[col.key] =
        typeof rawValue === 'number' && Number.isFinite(rawValue) ? rawValue : formatCellValue(rawValue)
    })
    worksheet.addRow(rowData)
  })

  // Auto-fit column widths (capped at 50)
  worksheet.columns.forEach(column => {
    if (!column.eachCell) return
    let maxLength = column.header ? String(column.header).length : 10
    column.eachCell({ includeEmpty: false }, cell => {
      const cellLength = cell.value ? String(cell.value).length : 0
      maxLength = Math.max(maxLength, cellLength)
    })
    column.width = Math.min(maxLength + 2, 50)
  })

  return workbook
}

/** Writes the workbook to a buffer, wraps it in a Blob, and triggers download. */
export const downloadExcelWorkbook = async (workbook: ExcelJS.Workbook, filename: string): Promise<void> => {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  triggerDownload(blob, filename)
}
