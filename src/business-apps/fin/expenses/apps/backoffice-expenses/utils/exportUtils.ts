/**
 * Utility functions for exporting data to CSV and Excel formats
 */

import { sanitizeFilename } from '@/common/utils/textUtils'
import * as XLSX from 'xlsx'

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
  link.download = filename

  // Set additional security attributes
  link.setAttribute('rel', 'noopener noreferrer')

  document.body.appendChild(link)
  link.click()
  link.remove()
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
 * Downloads data as a proper Excel (.xlsx) file using the xlsx library
 *
 * This generates a real Excel file that opens without warnings in Excel.
 */
export const downloadExcel = (data: any[], columns: Array<{ key: string; title: string }>, filename: string) => {
  // Prepare header row from column titles
  const headers = columns.map(c => c.title)

  // Prepare data rows - extract values in column order
  const rows = data.map(row => columns.map(c => formatCellValue(row[c.key])))

  // Create worksheet data with headers as first row
  const worksheetData = [headers, ...rows]

  // Create worksheet from array of arrays
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

  // Create workbook and add worksheet
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')

  // Generate Excel file as array buffer
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })

  // Create blob and trigger download
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })

  // Update filename extension to .xlsx if it's .xls
  const updatedFilename = filename.replace(/\.xls$/, '.xlsx')

  triggerDownload(blob, updatedFilename)
}
