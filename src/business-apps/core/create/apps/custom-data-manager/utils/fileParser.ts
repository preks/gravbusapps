import ExcelJS from 'exceljs'
import { ColumnDefinition, InputType } from '../types'

export interface ParsedFileResult {
  columns: ColumnDefinition[]
  rows: Record<string, any>[]
  fileName: string
  rowCount: number
}

/**
 * Infer the InputType from a sample of values
 */
const inferColumnType = (values: any[]): InputType => {
  const nonEmptyValues = values.filter(v => v !== null && v !== undefined && v !== '')

  if (nonEmptyValues.length === 0) return InputType.TEXT

  // Check if all values are booleans
  const booleanValues = new Set(['true', 'false', 'yes', 'no', '1', '0'])
  const allBooleans = nonEmptyValues.every(v => typeof v === 'boolean' || booleanValues.has(String(v).toLowerCase()))
  if (allBooleans) return InputType.CHECKBOX

  // Check if all values are numbers
  const allNumbers = nonEmptyValues.every(v => {
    if (typeof v === 'number') return true
    const parsed = Number.parseFloat(String(v).replaceAll(',', ''))
    return !Number.isNaN(parsed) && Number.isFinite(parsed)
  })
  if (allNumbers) return InputType.NUMBER

  // Check if all values look like dates
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/, // ISO date
    /^\d{2}\/\d{2}\/\d{4}$/, // US format
    /^\d{2}\.\d{2}\.\d{4}$/, // EU format
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/ // ISO datetime
  ]
  const allDates = nonEmptyValues.every(v => {
    const str = String(v)
    return datePatterns.some(p => p.test(str)) || (v instanceof Date && !Number.isNaN(v.getTime()))
  })
  if (allDates) {
    // Check if any have time component
    const hasTime = nonEmptyValues.some(v => String(v).includes('T') || String(v).includes(':'))
    return hasTime ? InputType.DATETIME : InputType.DATE
  }

  // Check if values might be multi-select (contains semicolons or commas with multiple items)
  const mightBeMultiSelect = nonEmptyValues.some(v => {
    const str = String(v)
    return (str.includes(';') || str.includes(',')) && str.split(/[;,]/).length > 1
  })
  if (mightBeMultiSelect) return InputType.MULTISELECT

  // Check for long text that might be textarea
  const hasLongText = nonEmptyValues.some(v => String(v).length > 100 || String(v).includes('\n'))
  if (hasLongText) return InputType.TEXTAREA

  // Default to text
  return InputType.TEXT
}

/**
 * Trim leading and trailing underscores without regex (ReDoS-safe)
 */
const trimUnderscores = (str: string): string => {
  let start = 0
  let end = str.length
  while (start < end && str[start] === '_') start++
  while (end > start && str[end - 1] === '_') end--
  return str.slice(start, end)
}

/**
 * Collapse consecutive underscores to single underscore without regex (ReDoS-safe)
 */
const collapseUnderscores = (str: string): string => {
  let result = ''
  let prevWasUnderscore = false
  for (const char of str) {
    if (char === '_') {
      if (!prevWasUnderscore) {
        result += char
        prevWasUnderscore = true
      }
    } else {
      result += char
      prevWasUnderscore = false
    }
  }
  return result
}

/**
 * Convert a header string to a valid column name
 */
const sanitizeColumnName = (header: string): string => {
  const sanitized = header
    .toLowerCase()
    .trim()
    .split('')
    .map(c => (/\s/.test(c) ? '_' : c))
    .filter(c => /[a-z0-9_]/.test(c))
    .join('')

  return collapseUnderscores(trimUnderscores(sanitized)) || 'column'
}

/**
 * Ensure column names are unique
 */
const ensureUniqueNames = (columns: ColumnDefinition[]): ColumnDefinition[] => {
  const usedNames = new Set<string>()
  return columns.map(col => {
    let name = col.name
    let counter = 1
    while (usedNames.has(name)) {
      name = `${col.name}_${counter}`
      counter++
    }
    usedNames.add(name)
    return { ...col, name }
  })
}

/**
 * Parse a CSV string into rows
 */
const parseCSVLine = (line: string): string[] => {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  let i = 0
  while (i < line.length) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 2 // Skip both quotes
        continue
      } else {
        inQuotes = !inQuotes
      }
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

/**
 * Parse CSV content
 */
const parseCSV = (content: string): { headers: string[]; data: Record<string, any>[] } => {
  const lines = content.split(/\r?\n/).filter(line => line.trim())
  if (lines.length === 0) return { headers: [], data: [] }

  const headers = parseCSVLine(lines[0])
  const data: Record<string, any>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: Record<string, any> = {}
    headers.forEach((header, index) => {
      row[header] = values[index] ?? ''
    })
    data.push(row)
  }

  return { headers, data }
}

/**
 * Parse Excel content using exceljs library
 */
const parseExcel = async (buffer: ArrayBuffer): Promise<{ headers: string[]; data: Record<string, any>[] }> => {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet || worksheet.rowCount === 0) return { headers: [], data: [] }

  // Get headers from first row
  const headerRow = worksheet.getRow(1)
  const headers: string[] = []
  headerRow.eachCell((cell, colNumber) => {
    const value = cell.value
    // Handle potential object values safely to avoid [object Object]
    let headerStr = ''
    if (typeof value === 'string') {
      headerStr = value.trim()
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      headerStr = String(value)
    } else if (value && typeof value === 'object') {
      if ('text' in value && typeof value.text === 'string') {
        headerStr = value.text.trim()
      } else if ('richText' in value && Array.isArray(value.richText)) {
        headerStr = value.richText
          .map(rt => rt.text)
          .join('')
          .trim()
      }
    }
    if (headerStr) {
      headers[colNumber - 1] = headerStr
    }
  })

  if (headers.length === 0) return { headers: [], data: [] }

  // Get data rows
  const data: Record<string, any>[] = []
  for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum)
    const rowData: Record<string, any> = {}
    let hasData = false

    headers.forEach((header, index) => {
      if (!header) return
      const cell = row.getCell(index + 1)
      let value = cell.value

      // Handle ExcelJS cell value types
      if (value && typeof value === 'object') {
        if ('result' in value) {
          // Formula cell - use the result
          value = value.result
        } else if ('richText' in value && Array.isArray(value.richText)) {
          // Rich text - extract plain text
          value = value.richText.map((rt: { text: string }) => rt.text).join('')
        } else if ('text' in value && typeof value.text === 'string') {
          // Hyperlink - use text
          value = value.text
        }
      }

      // Convert Date objects to ISO strings
      if (value instanceof Date) {
        value = value.toISOString()
      }

      if (value !== null && value !== undefined && value !== '') {
        hasData = true
      }

      rowData[header] = value ?? ''
    })

    if (hasData) {
      data.push(rowData)
    }
  }

  return { headers: headers.filter(Boolean), data }
}

/**
 * Convert parsed value to the appropriate type
 */
const convertValue = (value: any, type: InputType): any => {
  if (value === null || value === undefined || value === '') return null

  switch (type) {
    case InputType.NUMBER: {
      const num = Number.parseFloat(String(value).replaceAll(',', ''))
      return Number.isNaN(num) ? null : num
    }

    case InputType.CHECKBOX: {
      const boolStr = String(value).toLowerCase()
      return boolStr === 'true' || boolStr === 'yes' || boolStr === '1'
    }

    case InputType.DATE:
    case InputType.DATETIME:
      if (value instanceof Date) return value.toISOString()
      return String(value)

    case InputType.MULTISELECT:
      if (Array.isArray(value)) return value
      return String(value)
        .split(/[;,]/)
        .map(v => v.trim())
        .filter(Boolean)

    default:
      return String(value)
  }
}

/**
 * Parse a file (CSV or Excel) and extract column definitions and data
 */
export const parseFile = async (file: File): Promise<ParsedFileResult> => {
  const fileName = file.name
  const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls')

  let headers: string[]
  let rawData: Record<string, any>[]

  if (isExcel) {
    const buffer = await file.arrayBuffer()
    const result = await parseExcel(buffer)
    headers = result.headers
    rawData = result.data
  } else {
    const content = await file.text()
    const result = parseCSV(content)
    headers = result.headers
    rawData = result.data
  }

  if (headers.length === 0) {
    throw new Error('No headers found in file')
  }

  // Create column definitions
  let columns: ColumnDefinition[] = headers.map(header => {
    const name = sanitizeColumnName(header)
    // Get sample values for type inference
    const sampleValues = rawData.slice(0, 100).map(row => row[header])
    const type = inferColumnType(sampleValues)

    return {
      type,
      name,
      label: header,
      required: false
    }
  })

  // Ensure unique names
  columns = ensureUniqueNames(columns)

  // Create a mapping from original header to sanitized name
  const headerToName: Record<string, string> = {}
  headers.forEach((header, index) => {
    headerToName[header] = columns[index].name
  })

  // Convert raw data to use sanitized column names and proper types
  const rows = rawData.map(rawRow => {
    const row: Record<string, any> = {}
    headers.forEach((header, index) => {
      const col = columns[index]
      const rawValue = rawRow[header]
      row[col.name] = convertValue(rawValue, col.type)
    })
    return row
  })

  return {
    columns,
    rows,
    fileName,
    rowCount: rows.length
  }
}

/**
 * Generate a suggested key from a filename
 */
export const generateKeyFromFilename = (filename: string): string => {
  const withoutExtension = filename.replace(/\.(csv|xlsx|xls)$/i, '')
  const sanitized = withoutExtension
    .toLowerCase()
    .split('')
    .map(c => (/\s/.test(c) ? '_' : c))
    .filter(c => /[a-z0-9_]/.test(c))
    .join('')

  return collapseUnderscores(trimUnderscores(sanitized)).slice(0, 50) || 'imported_data'
}
