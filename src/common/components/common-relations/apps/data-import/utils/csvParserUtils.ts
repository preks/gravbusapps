/**
 * CSV parsing utilities
 * Extracted from LeadImportExample lines 154-211
 */

import { ParsedRow } from '@/common/components/common-relations/apps/data-import/types'

/**
 * Parse a single CSV line, handling quoted fields and commas within quotes
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let currentField = ''
  let insideQuotes = false

  for (const char of line) {
    if (char === '"') {
      insideQuotes = !insideQuotes
    } else if (char === ',' && !insideQuotes) {
      fields.push(currentField.trim().replaceAll(/(^"|"$)/g, ''))
      currentField = ''
    } else {
      currentField += char
    }
  }
  fields.push(currentField.trim().replaceAll(/(^"|"$)/g, ''))

  return fields
}

/**
 * Parse CSV text into an array of row objects
 * Handles quoted fields and commas within quotes
 */
export function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim())

  if (lines.length === 0) {
    throw new Error('CSV file is empty')
  }

  // Parse header
  const headers = parseCSVLine(lines[0])

  // Parse rows
  const rows: ParsedRow[] = []
  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    const values = parseCSVLine(lines[lineIndex])

    // Create row object
    const row: ParsedRow = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    rows.push(row)
  }

  return rows
}

/**
 * Validate CSV file format
 */
export function validateCSVFile(file: File): { valid: boolean; error?: string } {
  if (!file.name.endsWith('.csv')) {
    return { valid: false, error: 'File must be a CSV file' }
  }

  if (file.size === 0) {
    return { valid: false, error: 'File is empty' }
  }

  if (file.size > 10 * 1024 * 1024) {
    // 10MB limit
    return { valid: false, error: 'File size exceeds 10MB limit' }
  }

  return { valid: true }
}

/**
 * Read file as text
 */
export async function readFileAsText(file: File): Promise<string> {
  try {
    return await file.text()
  } catch {
    throw new Error('Failed to read file')
  }
}
