/**
 * Parse Excel-style range notation (e.g. A1, A1:A11, A2:K100)
 * Returns 0-based indices or null if invalid.
 */

import { columnIndexToLetter, parseA1Reference } from '../core'

export function indexToExcelCol(index: number): string {
  return columnIndexToLetter(index)
}

export interface ParsedChartRange {
  startRow: number
  endRow: number
  startCol: number
  endCol: number
}

/**
 * Parse a range like "A1", "A1:A11", "A2:K100".
 * Rows are 1-based in input, output is 0-based. Corner order is normalized (min/max).
 */
export function parseChartRange(range: string): ParsedChartRange | null {
  const trimmed = range.trim()
  if (!trimmed) return null

  const colonIndex = trimmed.indexOf(':')
  const startPart = colonIndex === -1 ? trimmed : trimmed.slice(0, colonIndex).trim()
  const endPart = colonIndex === -1 ? trimmed : trimmed.slice(colonIndex + 1).trim()

  if (colonIndex !== -1 && !endPart) return null

  const start = parseA1Reference(startPart)
  if (!start) return null

  if (colonIndex === -1) {
    return {
      startRow: start.row,
      endRow: start.row,
      startCol: start.col,
      endCol: start.col
    }
  }

  const end = parseA1Reference(endPart)
  if (!end) return null

  return {
    startRow: Math.min(start.row, end.row),
    endRow: Math.max(start.row, end.row),
    startCol: Math.min(start.col, end.col),
    endCol: Math.max(start.col, end.col)
  }
}
