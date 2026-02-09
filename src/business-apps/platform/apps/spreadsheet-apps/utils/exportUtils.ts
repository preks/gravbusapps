/**
 * Export Utilities for Spreadsheet Apps
 *
 * Handles exporting spreadsheet data to Excel (.xlsx) format using ExcelJS.
 * Follows the same pattern as backoffice-expenses/utils/exportUtils.ts.
 */

import ExcelJS from 'exceljs'
import { sanitizeFilename } from '@/common/utils/textUtils'
import type { SpreadsheetColumn, SpreadsheetSheet } from '../types'

/**
 * Formats a cell value for display in exports.
 * Handles null/undefined, arrays, dates, booleans, and objects.
 */
const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().split('T')[0]
  if (Array.isArray(value)) return value.map(item => formatCellValue(item)).join(', ')
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/**
 * Builds a timestamped filename for spreadsheet exports.
 * Uses UTC time for consistency across timezones.
 */
const buildFilename = (appName: string, sheetName: string): string => {
  const ts = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const timestamp = `${ts.getUTCFullYear()}${pad(ts.getUTCMonth() + 1)}${pad(ts.getUTCDate())}-${pad(ts.getUTCHours())}${pad(ts.getUTCMinutes())}${pad(ts.getUTCSeconds())}`
  const raw = `${appName}-${sheetName}-${timestamp}.xlsx`
  return sanitizeFilename(raw)
}

/**
 * Triggers a file download in the browser.
 */
const triggerDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.setAttribute('rel', 'noopener noreferrer')
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Exports a spreadsheet sheet to an Excel (.xlsx) file.
 *
 * Uses the sheet's visible columns as headers and the provided data rows.
 * Generates a proper OOXML file with styled headers and auto-sized columns.
 */
export const exportSheetToExcel = async (
  appName: string,
  sheet: SpreadsheetSheet,
  data: Record<string, unknown>[]
): Promise<void> => {
  const visibleColumns: SpreadsheetColumn[] = sheet.columns.filter(c => c.isVisible).sort((a, b) => a.order - b.order)

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'NEWWORK Spreadsheet Apps'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet(sheet.name || 'Sheet 1')

  // Configure columns with headers and initial width
  worksheet.columns = visibleColumns.map(col => ({
    header: col.label || col.name,
    key: col.name,
    width: Math.max((col.label || col.name).length + 2, 15)
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
    const rowData: Record<string, string> = {}
    visibleColumns.forEach(col => {
      rowData[col.name] = formatCellValue(row[col.name])
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

  // Generate the Excel buffer and download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })

  const filename = buildFilename(appName, sheet.name)
  triggerDownload(blob, filename)
}
