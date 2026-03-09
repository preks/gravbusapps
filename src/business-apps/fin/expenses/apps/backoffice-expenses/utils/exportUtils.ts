/**
 * Utility functions for exporting data to CSV and Excel formats
 */

import {
  formatCellValue,
  buildFilename,
  triggerDownload,
  buildExcelWorkbook,
  downloadExcelWorkbook
} from '@/common/utils/excelExportUtils'

export { buildFilename }

/**
 * Escapes a value for use in CSV format
 * Handles quotes, commas, and newlines
 *
 * Note: Uses replace(/pattern/g) instead of replaceAll() for ES2020 compatibility
 * Project target: ES2020, replaceAll() requires ES2021+
 */
const escapeCsv = (value: string): string => {
  const needsQuotes = /[",\r\n]/.test(value)
  const out = value.replace(/"/g, '""')
  return needsQuotes ? `"${out}"` : out
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
  const excelColumns = columns.map(col => ({ header: col.title, key: col.key }))
  const workbook = buildExcelWorkbook('Expense Requests', excelColumns, data, 'NEWWORK Expense Management')
  await downloadExcelWorkbook(workbook, filename)
}
