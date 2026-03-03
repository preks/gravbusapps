/**
 * useExcelParser Hook
 *
 * Parses spreadsheet files using ExcelJS for .xlsx and a lightweight CSV parser for .csv.
 * Extracts sheet structure, column headers, data types, and sample data.
 */

import { useState, useCallback } from 'react'
import ExcelJS from 'exceljs'
import type { ParsedExcelFile, ParsedSheet, ParsedColumn, ExcelMetadata } from '../types'

export interface UseExcelParserState {
  isLoading: boolean
  error: string | null
  parsedFile: ParsedExcelFile | null
  progress: number
}

export interface UseExcelParserResult extends UseExcelParserState {
  parseFile: (file: File, options?: { mode?: 'structured' | 'preserve-format' }) => Promise<ParsedExcelFile | null>
  parseFromUrl: (url: string) => Promise<ParsedExcelFile | null>
  reset: () => void
}

const MAX_SAMPLE_VALUES = 10
const MAX_ROWS_FOR_TYPE_INFERENCE = 100

type NormalizedCellValue = string | number | boolean | null

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeColorToHex(value: unknown): string | null {
  if (!isRecord(value) || typeof value.argb !== 'string') return null
  const argb = value.argb.trim()
  if (!/^[0-9a-fA-F]{8}$/.test(argb)) return null
  // ExcelJS stores ARGB (AARRGGBB). FortuneSheet expects #RRGGBB.
  return `#${argb.slice(2).toLowerCase()}`
}

function extractCellBackgroundHex(cell: ExcelJS.Cell): string | null {
  const fill = cell.fill
  if (!fill || fill.type !== 'pattern' || fill.pattern !== 'solid') return null
  if (!('fgColor' in fill)) return null
  return normalizeColorToHex(fill.fgColor)
}

function extractCellFontColorHex(cell: ExcelJS.Cell): string | null {
  const color = cell.font?.color
  return normalizeColorToHex(color)
}

function mapHorizontalAlign(value: ExcelJS.Alignment['horizontal']): 0 | 1 | 2 | undefined {
  if (value === 'center' || value === 'centerContinuous' || value === 'distributed') return 1
  if (value === 'right' || value === 'fill' || value === 'justify') return 2
  if (value === 'left') return 0
  return undefined
}

function mapVerticalAlign(value: ExcelJS.Alignment['vertical']): 0 | 1 | 2 | undefined {
  if (value === 'middle' || value === 'distributed' || value === 'justify') return 1
  if (value === 'bottom') return 2
  if (value === 'top') return 0
  return undefined
}

function toPixelWidth(width: number | undefined): number | undefined {
  if (typeof width !== 'number' || Number.isNaN(width) || width <= 0) return undefined
  // Approximate conversion from Excel column width units to px.
  return Math.round(width * 7 + 5)
}

function normalizeExcelJsCellValue(value: unknown): NormalizedCellValue {
  if (value === null || value === undefined) return null

  if (value instanceof Date) return value.toISOString()

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (isRecord(value)) {
    // Formula value: { formula, result }
    if ('result' in value) {
      return normalizeExcelJsCellValue(value.result)
    }

    // Rich text value: { richText: [{ text: string }, ...] }
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map(part => (isRecord(part) && typeof part.text === 'string' ? part.text : '')).join('')
    }

    // Hyperlink value: { text, hyperlink }
    if ('text' in value && typeof value.text === 'string') {
      return value.text
    }
  }

  return String(value)
}

function extractHeaderString(value: unknown): string {
  const normalized = normalizeExcelJsCellValue(value)
  if (normalized === null) return ''
  return String(normalized).trim()
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  let i = 0
  while (i < line.length) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 2
        continue
      }
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
    i++
  }
  result.push(current.trim())
  return result
}

function parseCSVContent(content: string): { headers: string[]; dataRows: unknown[][] } {
  const lines = content.split(/\r?\n/).filter(line => line.trim())
  if (lines.length === 0) return { headers: [], dataRows: [] }

  const rawHeaders = parseCSVLine(lines[0])
  const headers = rawHeaders.map((h, i) => (h ? h : `Column_${i + 1}`))

  const dataRows = lines.slice(1).map(line => parseCSVLine(line))
  return { headers, dataRows }
}

function buildParsedSheetFromAoa(params: {
  name: string
  index: number
  headers: string[]
  dataRows: unknown[][]
  formulaByColumnIndex?: Record<number, string | undefined>
  backgroundByCell?: Record<string, string | undefined>
  columnWidthByIndex?: Record<number, number | undefined>
  rowHeightByIndex?: Record<number, number | undefined>
}): ParsedSheet {
  const {
    name,
    index,
    headers,
    dataRows,
    formulaByColumnIndex,
    backgroundByCell,
    columnWidthByIndex,
    rowHeightByIndex
  } = params

  const isEmpty = headers.length === 0 || (dataRows.length === 0 && headers.every(h => !h))
  if (isEmpty) {
    return {
      name,
      index,
      columns: [],
      rows: [],
      rowCount: 0,
      isEmpty: true
    }
  }

  const columns: ParsedColumn[] = headers.map((header, colIndex) => {
    const sampleValues: unknown[] = []
    const rowsToCheck = Math.min(dataRows.length, MAX_ROWS_FOR_TYPE_INFERENCE)

    for (let rowIndex = 0; rowIndex < rowsToCheck; rowIndex++) {
      const row = dataRows[rowIndex]
      const cellValue = row?.[colIndex]
      if (cellValue !== null && cellValue !== undefined && cellValue !== '') {
        if (sampleValues.length < MAX_SAMPLE_VALUES) {
          sampleValues.push(cellValue)
        }
      }
    }

    const formula = formulaByColumnIndex?.[colIndex]
    const hasFormula = formula !== undefined

    return {
      name: header,
      index: colIndex,
      sampleValues,
      hasFormula,
      formula,
      width: columnWidthByIndex?.[colIndex]
    }
  })

  const rows = dataRows.map((row, rowIndex) => {
    const rowObj: Record<string, unknown> = {}
    const rowHeight = rowHeightByIndex?.[rowIndex]
    if (typeof rowHeight === 'number' && rowHeight > 0) {
      rowObj._height = rowHeight
    }
    headers.forEach((header, i) => {
      const value = row?.[i] ?? null
      const backgroundHex = backgroundByCell?.[`${rowIndex}:${i}`]
      if (backgroundHex) {
        if (isRecord(value) && ('v' in value || 'f' in value)) {
          rowObj[header] = { ...value, bg: backgroundHex }
        } else {
          rowObj[header] = {
            v: value,
            m: value === null || value === undefined ? '' : String(value),
            bg: backgroundHex
          }
        }
      } else {
        rowObj[header] = value
      }
    })
    return rowObj
  })

  return {
    name,
    index,
    columns,
    rows,
    rowCount: rows.length,
    isEmpty: false
  }
}

function buildStyledCellValue(cell: ExcelJS.Cell): unknown {
  const normalizedValue = normalizeExcelJsCellValue(cell.value)
  const styleCell: Record<string, unknown> = {}

  const backgroundHex = extractCellBackgroundHex(cell)
  if (backgroundHex) styleCell.bg = backgroundHex

  const fontColorHex = extractCellFontColorHex(cell)
  if (fontColorHex) styleCell.fc = fontColorHex

  if (cell.font?.bold) styleCell.bl = 1
  if (cell.font?.italic) styleCell.it = 1
  if (typeof cell.font?.name === 'string' && cell.font.name.trim()) styleCell.ff = cell.font.name
  if (typeof cell.font?.size === 'number') styleCell.fs = cell.font.size

  const ht = mapHorizontalAlign(cell.alignment?.horizontal)
  if (ht !== undefined) styleCell.ht = ht

  const vt = mapVerticalAlign(cell.alignment?.vertical)
  if (vt !== undefined) styleCell.vt = vt

  if (cell.alignment?.wrapText) styleCell.tb = 2

  if (
    cell.value &&
    typeof cell.value === 'object' &&
    'formula' in cell.value &&
    typeof cell.value.formula === 'string'
  ) {
    styleCell.f = cell.value.formula.startsWith('=') ? cell.value.formula : `=${cell.value.formula}`
  }

  if (Object.keys(styleCell).length === 0 && normalizedValue !== null && normalizedValue !== undefined) {
    return normalizedValue
  }

  styleCell.v = normalizedValue
  styleCell.m = normalizedValue === null || normalizedValue === undefined ? '' : String(normalizedValue)
  return styleCell
}

async function parseXlsxArrayBufferWithMode(
  arrayBuffer: ArrayBuffer,
  mode: 'structured' | 'preserve-format'
): Promise<{
  sheets: ParsedSheet[]
  metadata: ExcelMetadata
}> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(arrayBuffer)

  const sheets = workbook.worksheets.map((worksheet, index) => {
    const headerRow = worksheet.getRow(1)
    const maxColumns = Math.max(worksheet.actualColumnCount || 0, headerRow.cellCount || 0)

    if (worksheet.actualRowCount === 0 || maxColumns === 0) {
      return {
        name: worksheet.name,
        index,
        columns: [],
        rows: [],
        rowCount: 0,
        isEmpty: true
      }
    }

    const columnWidthByIndex: Record<number, number | undefined> = {}
    for (let col = 1; col <= maxColumns; col++) {
      const width = worksheet.getColumn(col).width
      columnWidthByIndex[col - 1] = toPixelWidth(width)
    }

    const headers: string[] = []
    if (mode === 'preserve-format') {
      for (let col = 1; col <= maxColumns; col++) {
        headers[col - 1] = `Column_${col}`
      }
    } else {
      for (let col = 1; col <= maxColumns; col++) {
        const headerValue = headerRow.getCell(col).value
        const headerStr = extractHeaderString(headerValue)
        headers[col - 1] = headerStr || `Column_${col}`
      }
    }

    const dataRows: unknown[][] = []
    const backgroundByCell: Record<string, string | undefined> = {}
    const rowHeightByIndex: Record<number, number | undefined> = {}
    const startRow = mode === 'preserve-format' ? 1 : 2
    const endRow = worksheet.actualRowCount > 0 ? worksheet.actualRowCount : worksheet.rowCount

    for (let rowNum = startRow; rowNum <= endRow; rowNum++) {
      const row = worksheet.getRow(rowNum)
      const rowHeight = row.height
      if (typeof rowHeight === 'number' && rowHeight > 0) {
        rowHeightByIndex[dataRows.length] = rowHeight
      }
      const rowValues: unknown[] = []
      const rowBackgrounds: Array<string | undefined> = []
      for (let col = 1; col <= maxColumns; col++) {
        const cell = row.getCell(col)
        rowValues[col - 1] =
          mode === 'preserve-format' ? buildStyledCellValue(cell) : normalizeExcelJsCellValue(cell.value)
        if (mode !== 'preserve-format') {
          rowBackgrounds[col - 1] = extractCellBackgroundHex(cell) ?? undefined
        }
      }

      const hasData = rowValues.some(v => v !== null && v !== undefined && v !== '')
      const hasBackground = rowBackgrounds.some(Boolean)
      if (hasData || hasBackground) {
        const parsedRowIndex = dataRows.length
        dataRows.push(rowValues)
        rowBackgrounds.forEach((backgroundHex, colIndex) => {
          if (!backgroundHex) return
          backgroundByCell[`${parsedRowIndex}:${colIndex}`] = backgroundHex
        })
      }
    }

    const formulaByColumnIndex: Record<number, string | undefined> = {}
    const formulaRow = worksheet.getRow(2)
    for (let col = 1; col <= maxColumns; col++) {
      const cellValue = formulaRow.getCell(col).value
      if (isRecord(cellValue) && typeof cellValue.formula === 'string') {
        formulaByColumnIndex[col - 1] = cellValue.formula
      }
    }

    return buildParsedSheetFromAoa({
      name: worksheet.name,
      index,
      headers,
      dataRows,
      formulaByColumnIndex,
      backgroundByCell,
      columnWidthByIndex,
      rowHeightByIndex
    })
  })

  const metadata: ExcelMetadata = {
    author: typeof workbook.creator === 'string' ? workbook.creator : undefined,
    createdAt: workbook.created instanceof Date ? workbook.created.toISOString() : undefined,
    modifiedAt: workbook.modified instanceof Date ? workbook.modified.toISOString() : undefined,
    sheetCount: workbook.worksheets.length
  }

  return { sheets, metadata }
}

/**
 * Hook for parsing Excel files
 */
export function useExcelParser(): UseExcelParserResult {
  const [state, setState] = useState<UseExcelParserState>({
    isLoading: false,
    error: null,
    parsedFile: null,
    progress: 0
  })

  /**
   * Parse an Excel file from a File object
   */
  const parseFile = useCallback(
    async (file: File, options?: { mode?: 'structured' | 'preserve-format' }): Promise<ParsedExcelFile | null> => {
      const mode = options?.mode ?? 'structured'
      setState(prev => ({ ...prev, isLoading: true, error: null, progress: 0 }))

      try {
        // Validate file type
        const validTypes = [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
          'text/csv', // .csv
          'application/csv'
        ]

        const isValidType = validTypes.includes(file.type) || /\.(xlsx|csv)$/i.test(file.name)

        if (!isValidType) {
          throw new Error('Invalid file type. Please upload an Excel (.xlsx) or CSV file.')
        }

        setState(prev => ({ ...prev, progress: 10 }))

        const fileNameLower = file.name.toLowerCase()
        const isCsv = file.type === 'text/csv' || file.type === 'application/csv' || fileNameLower.endsWith('.csv')

        setState(prev => ({ ...prev, progress: 30 }))

        let sheets: ParsedSheet[]
        let metadata: ExcelMetadata

        setState(prev => ({ ...prev, progress: 60 }))

        if (isCsv) {
          const content = await file.text()
          const { headers, dataRows } = parseCSVContent(content)
          sheets = [
            buildParsedSheetFromAoa({
              name: 'Sheet1',
              index: 0,
              headers,
              dataRows
            })
          ]
          metadata = { sheetCount: 1 }
          setState(prev => ({ ...prev, progress: 95 }))
        } else {
          const arrayBuffer = await file.arrayBuffer()
          setState(prev => ({ ...prev, progress: 50 }))

          const parsed = await parseXlsxArrayBufferWithMode(arrayBuffer, mode)
          sheets = parsed.sheets
          metadata = parsed.metadata
          setState(prev => ({ ...prev, progress: 95 }))
        }

        const parsedFile: ParsedExcelFile = {
          fileName: file.name,
          fileSize: file.size,
          sheets,
          metadata
        }

        setState(prev => ({
          ...prev,
          isLoading: false,
          parsedFile,
          progress: 100
        }))

        return parsedFile
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to parse Excel file'
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
          progress: 0
        }))
        return null
      }
    },
    []
  )

  /**
   * Parse an Excel file from a URL
   */
  const parseFromUrl = useCallback(
    async (url: string): Promise<ParsedExcelFile | null> => {
      setState(prev => ({ ...prev, isLoading: true, error: null, progress: 0 }))

      try {
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.statusText}`)
        }

        const blob = await response.blob()
        const fileName = url.split('/').pop() || 'spreadsheet.xlsx'
        const file = new File([blob], fileName, { type: blob.type })

        return parseFile(file)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch Excel file'
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
          progress: 0
        }))
        return null
      }
    },
    [parseFile]
  )

  /**
   * Reset the parser state
   */
  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      parsedFile: null,
      progress: 0
    })
  }, [])

  return {
    ...state,
    parseFile,
    parseFromUrl,
    reset
  }
}

/**
 * Utility to infer column type from sample values
 * This is a basic inference - the AI will do more sophisticated analysis
 */
export function inferColumnType(
  columnName: string,
  sampleValues: unknown[]
): 'text' | 'number' | 'date' | 'email' | 'boolean' | 'select' {
  if (sampleValues.length === 0) {
    return 'text'
  }

  // Check column name hints
  const nameLower = columnName.toLowerCase()

  if (nameLower.includes('email')) return 'email'
  if (nameLower.includes('date') || nameLower.includes('time')) return 'date'
  if (nameLower.includes('price') || nameLower.includes('amount') || nameLower.includes('cost')) return 'number'

  // Analyze sample values
  const nonNullValues = sampleValues.filter(v => v !== null && v !== undefined)

  if (nonNullValues.length === 0) {
    return 'text'
  }

  // Check if all values are numbers
  const allNumbers = nonNullValues.every(v => {
    const num = Number(v)
    return !isNaN(num)
  })

  if (allNumbers) return 'number'

  // Check if all values are booleans
  const booleanValues = ['true', 'false', 'yes', 'no', '1', '0', 'y', 'n']
  const allBooleans = nonNullValues.every(v => booleanValues.includes(String(v).toLowerCase()))

  if (allBooleans) return 'boolean'

  // Check if values look like emails
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const allEmails = nonNullValues.every(v => emailPattern.test(String(v)))

  if (allEmails) return 'email'

  // Check if values look like dates
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}/, // ISO date
    /^\d{1,2}\/\d{1,2}\/\d{2,4}/, // US date
    /^\d{1,2}\.\d{1,2}\.\d{2,4}/ // EU date
  ]

  const allDates = nonNullValues.every(v => {
    const str = String(v)
    return datePatterns.some(p => p.test(str)) || !isNaN(Date.parse(str))
  })

  if (allDates) return 'date'

  // Check if it's a select (limited unique values)
  const uniqueValues = new Set(nonNullValues.map(v => String(v)))
  if (uniqueValues.size <= 20 && uniqueValues.size < nonNullValues.length * 0.5) {
    return 'select'
  }

  return 'text'
}

/**
 * Get unique values for a potential select column
 */
export function getUniqueValues(sampleValues: unknown[]): string[] {
  const uniqueSet = new Set<string>()

  sampleValues.forEach(v => {
    if (v !== null && v !== undefined && v !== '') {
      uniqueSet.add(String(v))
    }
  })

  return Array.from(uniqueSet).sort((a, b) => a.localeCompare(b))
}
