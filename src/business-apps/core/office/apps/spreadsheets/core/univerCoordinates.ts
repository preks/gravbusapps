export interface SpreadsheetA1Coordinate {
  row: number
  col: number
}

export const columnIndexToLetter = (index: number): string => {
  let col = ''
  let num = index + 1
  while (num > 0) {
    const remainder = (num - 1) % 26
    col = String.fromCharCode(65 + remainder) + col
    num = Math.floor((num - 1) / 26)
  }
  return col
}

/**
 * 0-based column index from Excel column letters (e.g. A→0, Z→25, AA→26).
 * Returns null if letters are empty or not A–Z.
 */
export function excelColumnLettersToZeroBasedIndex(letters: string): number | null {
  const upper = letters.trim().toUpperCase()
  if (!upper || !/^[A-Z]+$/.test(upper)) return null
  let col = 0
  for (const letter of upper) {
    col = col * 26 + (letter.charCodeAt(0) - 64)
  }
  if (col <= 0) return null
  return col - 1
}

export const toA1Reference = (row: number, col: number): string => {
  if (row < 0 || col < 0) return ''
  return `${columnIndexToLetter(col)}${row + 1}`
}

export const parseA1Reference = (cellRef: string): SpreadsheetA1Coordinate | null => {
  const normalized = cellRef.trim().toUpperCase()
  const singleCellMatch = /^([A-Z]+)(\d+)$/.exec(normalized)
  if (!singleCellMatch) return null
  const [, columnLetters, rowStr] = singleCellMatch
  const col = excelColumnLettersToZeroBasedIndex(columnLetters)
  if (col === null) return null
  const row = Number(rowStr) - 1
  if (!Number.isFinite(row) || row < 0) return null
  return { row, col }
}
