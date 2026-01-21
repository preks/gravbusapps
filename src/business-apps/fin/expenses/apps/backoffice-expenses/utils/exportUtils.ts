/**
 * Utility functions for exporting data to CSV and Excel formats
 */

import ExcelJS from 'exceljs'
import { sanitizeFilename } from '@/common/utils/textUtils'

/**
 * Escapes a value for use in CSV format
 * Handles quotes, commas, and newlines
 *
 * Note: Uses replace(/pattern/g) instead of replaceAll() for ES2020 compatibility
 * Project target: ES2020, replaceAll() requires ES2021+
 */
export const escapeCsv = (value: string): string => {
  const needsQuotes = /[",\r\n]/.test(value)
  const out = value.replace(/"/g, '""')
  return needsQuotes ? `"${out}"` : out
}

/**
 * Escapes HTML special characters
 *
 * Note: Uses replace(/pattern/g) instead of replaceAll() for ES2020 compatibility
 * Project target: ES2020, replaceAll() requires ES2021+
 * NOSONAR: Intentionally using replace() for ES2020 compatibility
 */
export const htmlEscape = (value: string): string =>
  value
    // NOSONAR - ES2020 compatibility: replaceAll() requires ES2021+
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

/**
 * Builds a timestamped filename for exports
 * Uses UTC time to ensure consistent filenames across timezones
 * Sanitizes output to prevent XSS attacks using shared utility function
 *
 * Note: Input parameters (type, ext) are hardcoded in calling code,
 * so only the final filename needs sanitization for defense-in-depth.
 */
export const buildFilename = (type: string, ext: string): string => {
  const ts = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const filename = `backoffice-expense-${type}-${ts.getUTCFullYear()}${pad(ts.getUTCMonth() + 1)}${pad(ts.getUTCDate())}-${pad(ts.getUTCHours())}${pad(ts.getUTCMinutes())}${pad(ts.getUTCSeconds())}.${ext}`

  // Sanitize once at the end for defense-in-depth
  return sanitizeFilename(filename)
}

/**
 * Formats a cell value for display in exports
 * Handles null/undefined, arrays, dates, and objects
 */
export const formatCellValue = (value: any): string => {
  if (value === null || value === undefined) {
    return ''
  }

  // Handle Date objects with readable format
  if (value instanceof Date) {
    return value.toISOString().split('T')[0] // Returns YYYY-MM-DD
  }

  // Handle arrays by joining with comma-space
  if (Array.isArray(value)) {
    return value.map(item => formatCellValue(item)).join(', ')
  }

  // Handle other objects
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}

/**
 * Triggers a file download by creating a temporary link element
 * Handles blob URL creation, link click, and cleanup
 *
 * Note: Filename is already sanitized by buildFilename(), no need to sanitize again
 */
const triggerDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = sanitizeFilename(filename)

  // Set additional security attributes
  link.setAttribute('rel', 'noopener noreferrer')

  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Downloads data as CSV file
 * Includes UTF-8 BOM for proper Excel compatibility with special characters
 */
export const downloadCsv = (data: any[], columns: Array<{ key: string; title: string }>, filename: string) => {
  const header = columns.map(c => escapeCsv(c.title))
  const rows = data.map(row => columns.map(c => escapeCsv(formatCellValue(row[c.key]))))

  const csvLines = [header.join(','), ...rows.map(r => r.join(','))]
  const csvContent = '\uFEFF' + csvLines.join('\n') // UTF-8 BOM for Excel compatibility
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })

  triggerDownload(blob, filename)
}

/**
 * Downloads data as a proper Excel (.xlsx) file using ExcelJS
 *
 * This generates a true Office Open XML (OOXML) format file that:
 * - Opens without warnings on Windows and Mac
 * - Supports proper Unicode/UTF-8 characters
 * - Has styled headers (bold, background color)
 * - Auto-sizes columns based on content
 */
export const downloadExcel = async (
  data: any[],
  columns: Array<{ key: string; title: string }>,
  filename: string
): Promise<void> => {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'NEWWORK Expense Management'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet('Expense Requests')

  // Configure columns with headers and auto-width estimation
  worksheet.columns = columns.map(col => ({
    header: col.title,
    key: col.key,
    width: Math.max(col.title.length + 2, 15) // Minimum width of 15 or header length + padding
  }))

  // Style the header row
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' } // Light gray background
  }
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' }

  // Add data rows
  data.forEach(row => {
    const rowData: Record<string, string> = {}
    columns.forEach(col => {
      rowData[col.key] = formatCellValue(row[col.key])
    })
    worksheet.addRow(rowData)
  })

  // Auto-fit column widths based on content (with max limit)
  worksheet.columns.forEach(column => {
    if (!column.eachCell) return
    let maxLength = column.header ? String(column.header).length : 10
    column.eachCell({ includeEmpty: false }, cell => {
      const cellLength = cell.value ? String(cell.value).length : 0
      maxLength = Math.max(maxLength, cellLength)
    })
    column.width = Math.min(maxLength + 2, 50) // Cap at 50 characters
  })

  // Generate the Excel file as a buffer
  const buffer = await workbook.xlsx.writeBuffer()

  // Create blob with correct MIME type for .xlsx
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })

  triggerDownload(blob, filename)
}
