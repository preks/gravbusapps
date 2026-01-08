/**
 * useExcelParser Hook
 *
 * Parses Excel files using SheetJS (xlsx) library.
 * Extracts sheet structure, column headers, data types, and sample data.
 */

import { useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
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
        'application/vnd.ms-excel', // .xls
        'text/csv', // .csv
        'application/csv'
      ]

      const isValidType = validTypes.includes(file.type) || /\.(xlsx|xls|csv)$/i.test(file.name)

      if (!isValidType) {
        throw new Error('Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV file.')
      }

      setState(prev => ({ ...prev, progress: 10 }))

      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()

      setState(prev => ({ ...prev, progress: 30 }))

      // Parse with SheetJS
      const workbook = XLSX.read(arrayBuffer, {
        type: 'array',
        cellFormula: true,
        cellStyles: true,
        cellDates: true
      })

      setState(prev => ({ ...prev, progress: 50 }))

      // Extract metadata
      const metadata: ExcelMetadata = {
        author: workbook.Props?.Author,
        createdAt: workbook.Props?.CreatedDate?.toISOString(),
        modifiedAt: workbook.Props?.ModifiedDate?.toISOString(),
        sheetCount: workbook.SheetNames.length
      }

      setState(prev => ({ ...prev, progress: 60 }))

      // Parse each sheet
      const sheets: ParsedSheet[] = []
      const totalSheets = workbook.SheetNames.length

      for (let i = 0; i < totalSheets; i++) {
        const sheetName = workbook.SheetNames[i]
        const worksheet = workbook.Sheets[sheetName]

        const parsedSheet = parseWorksheet(worksheet, sheetName, i)
        sheets.push(parsedSheet)

        setState(prev => ({
          ...prev,
          progress: 60 + Math.round(((i + 1) / totalSheets) * 35)
        }))
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
  const parseFromUrl = useCallback(async (url: string): Promise<ParsedExcelFile | null> => {
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
  }, [parseFile])

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
 * Parse a single worksheet
 */
function parseWorksheet(worksheet: XLSX.WorkSheet, name: string, index: number): ParsedSheet {
  // Get the range of the worksheet
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')

  // Check if sheet is empty
  const isEmpty = range.e.r === 0 && range.e.c === 0 && !worksheet['A1']

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

  // Convert to JSON to get data
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    header: 1,
    raw: false,
    defval: null
  }) as unknown[][]

  if (jsonData.length === 0) {
    return {
      name,
      index,
      columns: [],
      rows: [],
      rowCount: 0,
      isEmpty: true
    }
  }

  // Extract headers (first row)
  const headers = (jsonData[0] as unknown[]).map((h, i) => {
    if (h === null || h === undefined || h === '') {
      return `Column_${i + 1}`
    }
    return String(h).trim()
  })

  // Extract data rows (skip header)
  const dataRows = jsonData.slice(1)

  // Build columns with sample values
  const columns: ParsedColumn[] = headers.map((header, colIndex) => {
    // Get sample values from the first N rows
    const sampleValues: unknown[] = []
    const rowsToCheck = Math.min(dataRows.length, MAX_ROWS_FOR_TYPE_INFERENCE)

    for (let rowIndex = 0; rowIndex < rowsToCheck; rowIndex++) {
      const row = dataRows[rowIndex] as unknown[]
      if (row && row[colIndex] !== null && row[colIndex] !== undefined && row[colIndex] !== '') {
        if (sampleValues.length < MAX_SAMPLE_VALUES) {
          sampleValues.push(row[colIndex])
        }
      }
    }

    // Check for formulas in this column
    const cellAddress = XLSX.utils.encode_col(colIndex) + '2' // Check second row for formula
    const cell = worksheet[cellAddress]
    const hasFormula = cell?.f !== undefined
    const formula = hasFormula ? cell.f : undefined

    return {
      name: header,
      index: colIndex,
      sampleValues,
      hasFormula,
      formula
    }
  })

  // Convert rows to objects with column headers as keys
  const rows = dataRows.map(row => {
    const rowObj: Record<string, unknown> = {}
    headers.forEach((header, i) => {
      const rowArray = row as unknown[]
      rowObj[header] = rowArray[i] ?? null
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
