/** Mirrors `cellMatrixUtils` so this module stays utils-only (no import from `components/`). */
export type SheetCellMatrix = Record<number, Record<number, unknown>>
export type SheetRangeShape = { startRow: number; endRow: number; startColumn: number; endColumn: number }
export type SheetCellMatrixCoordinateMode = 'auto' | 'relative' | 'absolute'

/**
 * Read a cell from a Univer worksheet facade. Wrapped in try/catch because Univer throws
 * when the range is not on the currently active worksheet (FRange / getCell guards).
 */
export function readWorksheetCellValue(
  worksheet: { getRange?: (row: number, col: number) => unknown } | undefined,
  row: number,
  col: number,
  includeCellData = false
): unknown {
  try {
    const cellRange = worksheet?.getRange?.(row, col)
    const liveCellData = (cellRange as { getCellData?: () => Record<string, unknown> | undefined })?.getCellData?.()
    if (includeCellData && liveCellData && typeof liveCellData === 'object') {
      return liveCellData
    }
    if (liveCellData && typeof liveCellData === 'object') {
      const liveFormula = (liveCellData as { f?: unknown }).f
      if (typeof liveFormula === 'string' && liveFormula.length > 0) {
        return liveCellData
      }
    }
    return (cellRange as { getValue?: () => unknown })?.getValue?.() ?? liveCellData?.v
  } catch {
    return undefined
  }
}

export function deriveCellMatrixFromRanges(
  worksheet: { getRange?: (row: number, col: number) => unknown } | undefined,
  ranges: SheetRangeShape[],
  maxCells = 10000,
  preserveUndefinedAsNull = false,
  includeCellData = false
): SheetCellMatrix | undefined {
  const derived: SheetCellMatrix = {}
  let visited = 0

  const limitReached = () => visited > maxCells
  const addCellValue = (row: number, col: number) => {
    visited += 1
    if (limitReached()) return
    const value = readWorksheetCellValue(worksheet, row, col, includeCellData)
    if (value === undefined && !preserveUndefinedAsNull) return
    if (!derived[row]) derived[row] = {}
    derived[row][col] = value === undefined ? null : value
  }

  for (const range of ranges) {
    for (let r = range.startRow; r <= range.endRow && !limitReached(); r++) {
      for (let c = range.startColumn; c <= range.endColumn && !limitReached(); c++) {
        addCellValue(r, c)
      }
    }
    if (limitReached()) {
      break
    }
  }
  return Object.keys(derived).length > 0 ? derived : undefined
}

export function deriveCellMatrixFromPayloadCoordinates(
  worksheet: { getRange?: (row: number, col: number) => unknown } | undefined,
  payloadCellValue: SheetCellMatrix | undefined,
  ranges: SheetRangeShape[] = [],
  coordinateMode: SheetCellMatrixCoordinateMode = 'auto',
  includeCellData = false,
  preserveUndefinedAsNull = false
): SheetCellMatrix | undefined {
  if (!payloadCellValue || typeof payloadCellValue !== 'object') return undefined
  const derived: SheetCellMatrix = {}
  const firstRange = ranges[0]

  for (const rowKey of Object.keys(payloadCellValue)) {
    const payloadRow = Number(rowKey)
    if (!Number.isFinite(payloadRow)) continue
    const rowCells = payloadCellValue[payloadRow]
    if (!rowCells || typeof rowCells !== 'object') continue
    for (const colKey of Object.keys(rowCells)) {
      const payloadCol = Number(colKey)
      if (!Number.isFinite(payloadCol)) continue
      const row = firstRange && coordinateMode !== 'absolute' ? firstRange.startRow + payloadRow : payloadRow
      const col = firstRange && coordinateMode !== 'absolute' ? firstRange.startColumn + payloadCol : payloadCol
      const value = readWorksheetCellValue(worksheet, row, col, includeCellData)
      if (value === undefined && !preserveUndefinedAsNull) continue
      if (!derived[row]) derived[row] = {}
      derived[row][col] = value === undefined ? null : value
    }
  }

  return Object.keys(derived).length > 0 ? derived : undefined
}
