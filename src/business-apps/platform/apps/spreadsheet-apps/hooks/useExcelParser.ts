/**
 * useExcelParser Hook
 *
 * Parses spreadsheet files using ExcelJS for .xlsx and a lightweight CSV parser for .csv.
 * Extracts sheet structure, column headers, data types, and sample data.
 */

import { useState, useCallback } from 'react'
import type { ParsedExcelFile, ParsedSheet, ParsedColumn, ExcelMetadata } from '../types'

export interface UseExcelParserState {
  isLoading: boolean
  error: string | null
  parsedFile: ParsedExcelFile | null
  progress: number
}

export interface UseExcelParserResult extends UseExcelParserState {
  parseFile: (file: File) => Promise<ParsedExcelFile | null>
  parseFromUrl: (url: string) => Promise<ParsedExcelFile | null>
  reset: () => void
}

const MAX_SAMPLE_VALUES = 10
const MAX_ROWS_FOR_TYPE_INFERENCE = 100

type ExcelJSImport = typeof import('exceljs')

type NormalizedCellValue = string | number | boolean | null

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
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
}): ParsedSheet {
  const { name, index, headers, dataRows, formulaByColumnIndex } = params

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
      formula
    }
  })

  const rows = dataRows.map(row => {
    const rowObj: Record<string, unknown> = {}
    headers.forEach((header, i) => {
      rowObj[header] = row?.[i] ?? null
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

async function parseXlsxArrayBuffer(arrayBuffer: ArrayBuffer): Promise<{
  sheets: ParsedSheet[]
  metadata: ExcelMetadata
}> {
  const { default: ExcelJS } = (await import('exceljs')) as ExcelJSImport
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

    const headers: string[] = []
    for (let col = 1; col <= maxColumns; col++) {
      const headerValue = headerRow.getCell(col).value
      const headerStr = extractHeaderString(headerValue)
      headers[col - 1] = headerStr || `Column_${col}`
    }

    const dataRows: unknown[][] = []
    const startRow = 2
    const endRow = worksheet.actualRowCount > 0 ? worksheet.actualRowCount : worksheet.rowCount

    for (let rowNum = startRow; rowNum <= endRow; rowNum++) {
      const row = worksheet.getRow(rowNum)
      const rowValues: unknown[] = []
      for (let col = 1; col <= maxColumns; col++) {
        const cell = row.getCell(col)
        rowValues[col - 1] = normalizeExcelJsCellValue(cell.value)
      }

      const hasData = rowValues.some(v => v !== null && v !== undefined && v !== '')
      if (hasData) {
        dataRows.push(rowValues)
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
      formulaByColumnIndex
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
  const parseFile = useCallback(async (file: File): Promise<ParsedExcelFile | null> => {
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

        const parsed = await parseXlsxArrayBuffer(arrayBuffer)
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
  }, [])

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

  return Array.from(uniqueSet).sort()
}
