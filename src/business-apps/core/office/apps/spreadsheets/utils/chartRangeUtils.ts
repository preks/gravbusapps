/**
 * Parse Excel-style range notation (e.g. A1, A1:A11, A2:K100)
 * Returns 0-based indices or null if invalid.
 */

export function indexToExcelCol(index: number): string {
  let col = ''
  let num = index + 1
  while (num > 0) {
    const remainder = (num - 1) % 26
    col = String.fromCharCode(65 + remainder) + col
    num = Math.floor((num - 1) / 26)
  }
  return col
}

function excelColToIndex(col: string): number {
  let index = 0
  const upper = col.toUpperCase()
  for (let i = 0; i < upper.length; i++) {
    index = index * 26 + (upper.charCodeAt(i) - 64)
  }
  return index - 1
}

export interface ParsedChartRange {
  startRow: number
  endRow: number
  startCol: number
  endCol: number
}

/**
 * Parse a range like "A1", "A1:A11", "A2:K100".
 * Rows are 1-based in input, output is 0-based.
 */
export function parseChartRange(range: string): ParsedChartRange | null {
  const trimmed = range.trim()
  if (!trimmed) return null

  const match = trimmed.match(/^([A-Z]+)([0-9]+)(?::([A-Z]+)([0-9]+))?$/i)
  if (!match) return null

  const startCol = excelColToIndex(match[1])
  const startRow = parseInt(match[2], 10)
  if (Number.isNaN(startRow) || startRow < 1 || startCol < 0) return null

  let endRow = startRow
  let endCol = startCol

  if (match[3] && match[4]) {
    endCol = excelColToIndex(match[3])
    endRow = parseInt(match[4], 10)
    if (Number.isNaN(endRow) || endRow < 1 || endCol < 0) return null
  }

  return {
    startRow: Math.max(1, startRow) - 1,
    endRow: Math.max(startRow, endRow) - 1,
    startCol,
    endCol
  }
}
