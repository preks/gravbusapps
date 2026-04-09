export type SheetCellMatrix = Record<number, Record<number, unknown>>
export type SheetRangeShape = { startRow: number; endRow: number; startColumn: number; endColumn: number }

export const normalizeCellMatrix = (value: unknown): SheetCellMatrix | undefined =>
  value && typeof value === 'object' ? (value as SheetCellMatrix) : undefined

export const mergeCellMatrices = (
  preferred: SheetCellMatrix | undefined,
  fallback: SheetCellMatrix | undefined
): SheetCellMatrix | undefined => {
  if (!preferred && !fallback) return undefined
  if (!preferred) return fallback
  if (!fallback) return preferred

  const merged: SheetCellMatrix = {}
  const rowKeys = new Set([...Object.keys(fallback), ...Object.keys(preferred)])
  for (const rowKey of rowKeys) {
    const preferredRow = preferred[Number(rowKey)]
    const fallbackRow = fallback[Number(rowKey)]
    if (preferredRow || fallbackRow) {
      merged[Number(rowKey)] = {
        ...(fallbackRow && typeof fallbackRow === 'object' ? fallbackRow : {}),
        ...(preferredRow && typeof preferredRow === 'object' ? preferredRow : {})
      }
    }
  }

  return Object.keys(merged).length > 0 ? merged : undefined
}

const getCellFromMatrix = (value: SheetCellMatrix | undefined, rowIndex: number, colIndex: number): unknown => {
  if (!value) return undefined
  const row = value[rowIndex]
  if (!row || typeof row !== 'object') return undefined
  return row[colIndex]
}

const hasCellInMatrix = (value: SheetCellMatrix | undefined, rowIndex: number, colIndex: number): boolean => {
  if (!value) return false
  const row = value[rowIndex]
  if (!row || typeof row !== 'object') return false
  return Object.prototype.hasOwnProperty.call(row, colIndex)
}

export const buildAbsoluteCellMatrixForRanges = (
  ranges: SheetRangeShape[],
  preferredAbsolute: SheetCellMatrix | undefined,
  fallback: SheetCellMatrix | undefined
): SheetCellMatrix | undefined => {
  if (ranges.length === 0) {
    return mergeCellMatrices(preferredAbsolute, fallback)
  }

  const absolute: SheetCellMatrix = {}
  for (const range of ranges) {
    for (let row = range.startRow; row <= range.endRow; row++) {
      for (let col = range.startColumn; col <= range.endColumn; col++) {
        const hasPreferredValue = hasCellInMatrix(preferredAbsolute, row, col)
        const hasRelativeFallbackValue = hasCellInMatrix(fallback, row - range.startRow, col - range.startColumn)
        const hasAbsoluteFallbackValue = hasCellInMatrix(fallback, row, col)
        if (!hasPreferredValue && !hasRelativeFallbackValue && !hasAbsoluteFallbackValue) continue
        const value = hasPreferredValue
          ? getCellFromMatrix(preferredAbsolute, row, col)
          : hasRelativeFallbackValue
            ? getCellFromMatrix(fallback, row - range.startRow, col - range.startColumn)
            : getCellFromMatrix(fallback, row, col)
        if (!absolute[row]) absolute[row] = {}
        absolute[row][col] = value
      }
    }
  }

  return Object.keys(absolute).length > 0 ? absolute : undefined
}
