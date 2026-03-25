/**
 * Shared Excel / file-export utilities.
 *
 * Centralises helpers used by multiple export features (spreadsheet-apps,
 * backoffice-expenses, etc.) so that SonarQube does not flag cross-module
 * duplication.
 */

import ExcelJS from 'exceljs'
import { sanitizeFilename } from '@/common/utils/textUtils'
import dayjs from 'dayjs'

// ---------------------------------------------------------------------------
// Cell formatting
// ---------------------------------------------------------------------------

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const normalizeHexToArgb = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed.startsWith('#')) return null
  const hex = trimmed.slice(1)
  if (hex.length === 3 && /^[0-9a-fA-F]{3}$/.test(hex)) {
    const expanded = hex
      .split('')
      .map(ch => `${ch}${ch}`)
      .join('')
      .toUpperCase()
    return `FF${expanded}`
  }
  if (hex.length === 6 && /^[0-9a-fA-F]{6}$/.test(hex)) {
    return `FF${hex.toUpperCase()}`
  }
  return null
}

const extractExportCell = (value: unknown): { text: string; bgArgb?: string } => {
  if (isRecord(value) && ('v' in value || 'm' in value || 'f' in value || 'bg' in value)) {
    const display =
      typeof value.m === 'string'
        ? value.m
        : value.v === null || value.v === undefined
          ? ''
          : typeof value.v === 'string' || typeof value.v === 'number' || typeof value.v === 'boolean'
            ? String(value.v)
            : ''
    const bgArgb = normalizeHexToArgb(value.bg)
    return { text: display, bgArgb: bgArgb ?? undefined }
  }
  return { text: formatCellValue(value) }
}

/** Formats a cell value for display in exports (handles null, Date, arrays, booleans, objects). */
export const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().split('T')[0]
  if (Array.isArray(value)) return value.map(item => formatCellValue(item)).join(', ')
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (isRecord(value) && ('v' in value || 'm' in value || 'f' in value || 'bg' in value)) {
    return extractExportCell(value).text
  }
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

const EXCEL_SHEET_NAME_MAX_LENGTH = 31

const sanitizeSheetName = (name: string, fallback: string): string => {
  const cleaned = name
    .replace(/[\\/?*:[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const baseName = cleaned || fallback
  return baseName.slice(0, EXCEL_SHEET_NAME_MAX_LENGTH)
}

const buildUniqueSheetName = (requestedName: string, usedNames: Set<string>, index: number): string => {
  const fallback = `Sheet ${index + 1}`
  const baseName = sanitizeSheetName(requestedName, fallback)
  if (!usedNames.has(baseName)) {
    usedNames.add(baseName)
    return baseName
  }

  let counter = 2
  while (counter < 1000) {
    const suffix = ` (${counter})`
    const candidateBase = baseName.slice(0, EXCEL_SHEET_NAME_MAX_LENGTH - suffix.length).trim() || fallback
    const candidate = `${candidateBase}${suffix}`
    if (!usedNames.has(candidate)) {
      usedNames.add(candidate)
      return candidate
    }
    counter++
  }

  const guaranteed = `${fallback} (${index + 1})`.slice(0, EXCEL_SHEET_NAME_MAX_LENGTH)
  usedNames.add(guaranteed)
  return guaranteed
}

const populateWorksheet = (
  worksheet: ExcelJS.Worksheet,
  columns: ExcelColumn[],
  data: Record<string, unknown>[]
): void => {
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
    const rowData: Record<string, string> = {}
    const rowCellStyles: Array<{ colIndex: number; bgArgb: string }> = []
    columns.forEach(col => {
      const parsedCell = extractExportCell(row[col.key])
      rowData[col.key] = parsedCell.text
      if (parsedCell.bgArgb) {
        const colIndex = columns.findIndex(c => c.key === col.key)
        if (colIndex >= 0) {
          rowCellStyles.push({ colIndex, bgArgb: parsedCell.bgArgb })
        }
      }
    })
    const addedRow = worksheet.addRow(rowData)
    rowCellStyles.forEach(({ colIndex, bgArgb }) => {
      const cell = addedRow.getCell(colIndex + 1)
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgArgb }
      }
    })
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

  const worksheet = workbook.addWorksheet(sanitizeSheetName(sheetName, 'Sheet 1'))
  populateWorksheet(worksheet, columns, data)

  return workbook
}

/** Creates a multi-sheet Excel workbook and triggers download. */
export const exportWorkbookToExcel = async (
  appName: string,
  sheets: Array<{ name: string; columns: ExcelColumn[]; data: Record<string, unknown>[] }>
): Promise<void> => {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'NEWWORK'
  workbook.created = new Date()

  const usedNames = new Set<string>()
  const resolvedSheets = sheets.length > 0 ? sheets : [{ name: 'Sheet 1', columns: [], data: [] }]

  resolvedSheets.forEach((sheet, index) => {
    const worksheetName = buildUniqueSheetName(sheet.name || `Sheet ${index + 1}`, usedNames, index)
    const worksheet = workbook.addWorksheet(worksheetName)
    populateWorksheet(worksheet, sheet.columns, sheet.data)
  })

  const filename = buildFilename(appName, 'xlsx')
  await downloadExcelWorkbook(workbook, filename)
}

/** Writes the workbook to a buffer, wraps it in a Blob, and triggers download. */
export const downloadExcelWorkbook = async (workbook: ExcelJS.Workbook, filename: string): Promise<void> => {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  triggerDownload(blob, filename)
}

// ---------------------------------------------------------------------------
// Shared export date formatter
// ---------------------------------------------------------------------------

/**
 * Formats a date string as `DD-MMM-YYYY` (e.g. "25-Feb-2026").
 * Fixed-width format avoids Excel "########" column-too-narrow issues
 * and is less likely to be auto-converted to a date serial by Excel.
 */
export const formatExportDate = (value?: string | null): string => {
  if (!value) return '-'
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('DD-MMM-YYYY') : '-'
}

// ---------------------------------------------------------------------------
// Shared CSV helpers (used by useActivityExport, useTaskExport, etc.)
// ---------------------------------------------------------------------------

/** Removes newline characters from a string so CSV cells stay single-line. */
export const sanitizeExportText = (value: string): string => value.replace(/[\r\n]+/g, ' ').trim()

/** Escapes a value for CSV: wraps in quotes when it contains commas or quotes. */
export const escapeCsvValue = (value: string): string => {
  const sanitized = sanitizeExportText(value)
  const needsQuotes = /[",]/.test(sanitized)
  const out = sanitized.replace(/"/g, '""')
  return needsQuotes ? `"${out}"` : out
}

/**
 * Escapes a single CSV cell.
 * Date columns are wrapped in `="value"` so Excel treats them as plain text
 * and never auto-converts them to date serials (which would cause "########").
 */
export const escapeCsvCell = (key: string, value: string, dateColumnKeys: Set<string>): string => {
  if (dateColumnKeys.has(key) && value !== '-') return `="${value}"`
  return escapeCsvValue(value)
}

/** Generates and triggers a CSV download from structured row data. */
export const downloadCsvData = (
  data: Record<string, string>[],
  columns: readonly { key: string; title: string }[],
  filename: string,
  dateColumnKeys: Set<string>
): void => {
  const header = columns.map(c => escapeCsvValue(c.title))
  const rows = data.map(row => columns.map(c => escapeCsvCell(c.key, formatCellValue(row[c.key]), dateColumnKeys)))
  const csvContent = '\uFEFF' + [header.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, filename)
}
