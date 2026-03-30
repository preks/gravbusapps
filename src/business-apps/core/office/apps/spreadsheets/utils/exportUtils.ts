/**
 * Export Utilities for Spreadsheet Apps
 *
 * Handles exporting spreadsheet data to Excel (.xlsx) format.
 * Delegates common Excel logic to the shared excelExportUtils.
 */

import {
  buildFilename,
  buildExcelWorkbook,
  downloadExcelWorkbook,
  exportWorkbookToExcel
} from '@/common/utils/excelExportUtils'
import type { SpreadsheetColumn, SpreadsheetSheet } from '../types'

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
  const visibleColumns: SpreadsheetColumn[] = sheet.columns
    .filter(c => c.isVisible !== false)
    .sort((a, b) => a.order - b.order)

  const excelColumns = visibleColumns.map(col => ({
    header: col.label || col.name,
    key: col.name
  }))

  const workbook = buildExcelWorkbook(sheet.name || 'Sheet 1', excelColumns, data, 'NEWWORK Spreadsheet Apps')

  const filename = buildFilename(`${appName}-${sheet.name}`, 'xlsx')
  await downloadExcelWorkbook(workbook, filename)
}

/** Exports all spreadsheet sheets to a single multi-sheet Excel file. */
export const exportAppToExcel = async (appName: string, sheets: SpreadsheetSheet[]): Promise<void> => {
  const workbookSheets = sheets.map((sheet, index) => {
    const visibleColumns: SpreadsheetColumn[] = sheet.columns
      .filter(c => c.isVisible !== false)
      .sort((a, b) => a.order - b.order)

    return {
      name: sheet.name || `Sheet ${index + 1}`,
      columns: visibleColumns.map(col => ({
        header: col.label || col.name,
        key: col.name
      })),
      data: sheet.data || []
    }
  })

  await exportWorkbookToExcel(appName || 'spreadsheet-app', workbookSheets)
}
