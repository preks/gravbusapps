export type SheetCellMatrix = Record<number, Record<number, unknown>>
export type SheetRangeShape = { startRow: number; endRow: number; startColumn: number; endColumn: number }
export type SheetCellMatrixCoordinateMode = 'auto' | 'relative' | 'absolute'

export const normalizeCellMatrix = (value: unknown): SheetCellMatrix | undefined =>
  value && typeof value === 'object' ? (value as SheetCellMatrix) : undefined

/**
 * When `preserveUndefinedAsNull` derives sparse worksheet matrices for clear-like
 * commands, the worksheet facade sometimes omits `v:null` while still carrying only a style ref (`s`).
 * Merge authoritative coordinates from the Univer payload on top of derived reads so planners still see `v`
 * clears (`collectChangedCells` parity).
 */
export function overlayExplicitMutationCellsOntoDerived(
  derived: SheetCellMatrix | undefined,
  explicit: SheetCellMatrix | undefined
): SheetCellMatrix | undefined {
  if (!explicit || typeof explicit !== 'object') return derived

  const preferExplicitCell = (cell: unknown): boolean => {
    if (cell === null || cell === undefined) return false
    if (typeof cell !== 'object' || Array.isArray(cell)) {
      return typeof cell === 'string' || typeof cell === 'number' || typeof cell === 'boolean'
    }
    const o = cell as Record<string, unknown>
    return 'v' in o || 'f' in o || 'm' in o || 'ct' in o || 's' in o
  }

  let hasExplicitPreferred = false
  for (const rk of Object.keys(explicit)) {
    const ri = Number(rk)
    if (!Number.isFinite(ri)) continue
    const row = explicit[ri]
    if (!row || typeof row !== 'object') continue
    for (const ck of Object.keys(row)) {
      const ci = Number(ck)
      if (!Number.isFinite(ci)) continue
      if (preferExplicitCell((row as Record<number, unknown>)[ci])) {
        hasExplicitPreferred = true
        break
      }
    }
    if (hasExplicitPreferred) break
  }
  if (!hasExplicitPreferred) return derived

  const out: SheetCellMatrix = {}
  if (derived) {
    for (const rk of Object.keys(derived)) {
      const ri = Number(rk)
      if (!Number.isFinite(ri)) continue
      const srcRow = derived[ri]
      if (!srcRow || typeof srcRow !== 'object') continue
      out[ri] = { ...(srcRow as Record<number, unknown>) }
    }
  }

  for (const rk of Object.keys(explicit)) {
    const ri = Number(rk)
    if (!Number.isFinite(ri)) continue
    const srcRow = explicit[ri]
    if (!srcRow || typeof srcRow !== 'object') continue
    for (const ck of Object.keys(srcRow)) {
      const ci = Number(ck)
      if (!Number.isFinite(ci)) continue
      const cell = (srcRow as Record<number, unknown>)[ci]
      if (!preferExplicitCell(cell)) continue
      if (!out[ri]) out[ri] = {}
      ;(out[ri] as Record<number, unknown>)[ci] = cell
    }
  }

  return Object.keys(out).length > 0 ? out : derived
}

const cellFitsAbsoluteInRanges = (row: number, col: number, ranges: SheetRangeShape[]): boolean =>
  ranges.some(
    range => row >= range.startRow && row <= range.endRow && col >= range.startColumn && col <= range.endColumn
  )

const cellFitsRelativeInRanges = (row: number, col: number, ranges: SheetRangeShape[]): boolean =>
  ranges.some(
    range => row >= 0 && row <= range.endRow - range.startRow && col >= 0 && col <= range.endColumn - range.startColumn
  )

/**
 * When SheetValueChanged carries a sparse `cellValue` but `ranges` is only the anchor
 * cell, `detectCellMatrixCoordinateModeHint` returns `'auto'`. Resolve whether payload
 * keys are relative to the range origin or already absolute before adding offsets.
 */
export function resolveMergeCoordinateMode(
  explicit: SheetCellMatrix,
  ranges: SheetRangeShape[],
  coordinateMode: SheetCellMatrixCoordinateMode
): 'relative' | 'absolute' {
  if (coordinateMode === 'relative' || coordinateMode === 'absolute') {
    return coordinateMode
  }
  if (ranges.length === 0) {
    return 'absolute'
  }

  let sawCell = false
  let allFitAbsolute = true
  let allFitRelative = true
  let minRow = Number.POSITIVE_INFINITY
  let maxRow = Number.NEGATIVE_INFINITY
  let minCol = Number.POSITIVE_INFINITY
  let maxCol = Number.NEGATIVE_INFINITY

  for (const rowKey of Object.keys(explicit)) {
    const row = Number(rowKey)
    if (!Number.isFinite(row)) continue
    const rowCells = explicit[row]
    if (!rowCells || typeof rowCells !== 'object') continue
    for (const colKey of Object.keys(rowCells)) {
      const col = Number(colKey)
      if (!Number.isFinite(col)) continue
      sawCell = true
      minRow = Math.min(minRow, row)
      maxRow = Math.max(maxRow, row)
      minCol = Math.min(minCol, col)
      maxCol = Math.max(maxCol, col)
      if (!cellFitsAbsoluteInRanges(row, col, ranges)) {
        allFitAbsolute = false
      }
      if (!cellFitsRelativeInRanges(row, col, ranges)) {
        allFitRelative = false
      }
    }
  }

  if (!sawCell) {
    return 'absolute'
  }
  if (allFitAbsolute && !allFitRelative) {
    return 'absolute'
  }
  if (allFitRelative && !allFitAbsolute) {
    return 'relative'
  }

  const unionRange = ranges.reduce<SheetRangeShape>(
    (acc, range) => ({
      startRow: Math.min(acc.startRow, range.startRow),
      endRow: Math.max(acc.endRow, range.endRow),
      startColumn: Math.min(acc.startColumn, range.startColumn),
      endColumn: Math.max(acc.endColumn, range.endColumn)
    }),
    ranges[0]
  )
  const rangeHeight = unionRange.endRow - unionRange.startRow
  const rangeWidth = unionRange.endColumn - unionRange.startColumn
  if (minRow >= 0 && minCol >= 0 && maxRow <= rangeHeight && maxCol <= rangeWidth) {
    return 'relative'
  }

  if (!allFitAbsolute && !allFitRelative) {
    let offsetFitsAll = true
    for (const rowKey of Object.keys(explicit)) {
      const row = Number(rowKey)
      if (!Number.isFinite(row)) continue
      const rowCells = explicit[row]
      if (!rowCells || typeof rowCells !== 'object') continue
      for (const colKey of Object.keys(rowCells)) {
        const col = Number(colKey)
        if (!Number.isFinite(col)) continue
        const offsetRow = unionRange.startRow + row
        const offsetCol = unionRange.startColumn + col
        if (!cellFitsAbsoluteInRanges(offsetRow, offsetCol, ranges)) {
          offsetFitsAll = false
          break
        }
      }
      if (!offsetFitsAll) break
    }
    if (offsetFitsAll) {
      return 'relative'
    }
  }

  return 'absolute'
}

export function mapPayloadCellToAbsoluteCoordinates(
  payloadRow: number,
  payloadCol: number,
  ranges: SheetRangeShape[],
  coordinateMode: 'relative' | 'absolute'
): { rowIndex: number; colIndex: number } {
  if (coordinateMode === 'absolute') {
    return { rowIndex: payloadRow, colIndex: payloadCol }
  }
  const range =
    ranges.find(
      candidate =>
        payloadRow >= 0 &&
        payloadRow <= candidate.endRow - candidate.startRow &&
        payloadCol >= 0 &&
        payloadCol <= candidate.endColumn - candidate.startColumn
    ) ?? ranges[0]
  if (!range) {
    return { rowIndex: payloadRow, colIndex: payloadCol }
  }
  return {
    rowIndex: range.startRow + payloadRow,
    colIndex: range.startColumn + payloadCol
  }
}

/** Map every sparse payload cell to sheet coordinates (not clamped to declared ranges). */
export function mapPayloadCellMatrixToAbsoluteCoordinates(
  payload: SheetCellMatrix,
  ranges: SheetRangeShape[],
  coordinateMode: SheetCellMatrixCoordinateMode = 'auto'
): SheetCellMatrix {
  const effectiveMode = resolveMergeCoordinateMode(payload, ranges, coordinateMode)
  const out: SheetCellMatrix = {}
  for (const rowKey of Object.keys(payload)) {
    const payloadRow = Number(rowKey)
    if (!Number.isFinite(payloadRow)) continue
    const payloadRowCells = payload[rowKey]
    if (!payloadRowCells || typeof payloadRowCells !== 'object') continue
    for (const colKey of Object.keys(payloadRowCells)) {
      const payloadCol = Number(colKey)
      if (!Number.isFinite(payloadCol)) continue
      const { rowIndex, colIndex } = mapPayloadCellToAbsoluteCoordinates(payloadRow, payloadCol, ranges, effectiveMode)
      if (!out[rowIndex]) out[rowIndex] = {}
      ;(out[rowIndex] as Record<number, unknown>)[colIndex] = (payloadRowCells as Record<number, unknown>)[payloadCol]
    }
  }
  return out
}

export function mergeExplicitMutationCellsIntoDerived(
  derived: SheetCellMatrix | undefined,
  explicit: SheetCellMatrix | undefined,
  ranges: SheetRangeShape[] = [],
  coordinateMode: SheetCellMatrixCoordinateMode = 'auto'
): SheetCellMatrix | undefined {
  if (!explicit || typeof explicit !== 'object') return derived

  const effectiveCoordinateMode = resolveMergeCoordinateMode(explicit, ranges, coordinateMode)

  const out: SheetCellMatrix = {}
  if (derived) {
    for (const rk of Object.keys(derived)) {
      const ri = Number(rk)
      if (!Number.isFinite(ri)) continue
      const srcRow = derived[ri]
      if (!srcRow || typeof srcRow !== 'object') continue
      out[ri] = { ...(srcRow as Record<number, unknown>) }
    }
  }

  for (const rk of Object.keys(explicit)) {
    const payloadRowIndex = Number(rk)
    if (!Number.isFinite(payloadRowIndex)) continue
    const explicitRow = explicit[payloadRowIndex]
    if (!explicitRow || typeof explicitRow !== 'object') continue
    for (const ck of Object.keys(explicitRow)) {
      const payloadColIndex = Number(ck)
      if (!Number.isFinite(payloadColIndex)) continue
      const { rowIndex: ri, colIndex: ci } = mapPayloadCellToAbsoluteCoordinates(
        payloadRowIndex,
        payloadColIndex,
        ranges,
        effectiveCoordinateMode
      )
      const explicitCell = (explicitRow as Record<number, unknown>)[payloadColIndex]
      const derivedCell = out[ri]?.[ci]
      if (!out[ri]) out[ri] = {}
      if (
        explicitCell &&
        typeof explicitCell === 'object' &&
        !Array.isArray(explicitCell) &&
        derivedCell &&
        typeof derivedCell === 'object' &&
        !Array.isArray(derivedCell)
      ) {
        ;(out[ri] as Record<number, unknown>)[ci] = {
          ...(derivedCell as Record<string, unknown>),
          ...(explicitCell as Record<string, unknown>)
        }
      } else {
        ;(out[ri] as Record<number, unknown>)[ci] = explicitCell
      }
    }
  }

  return Object.keys(out).length > 0 ? out : derived
}

/** Matrix occupancy helpers — avoid treating whole-sheet `effectedRanges` as the mutation footprint when Univer still carries a sparse `cellValue` payload. */
export function countOccupiedCellsInSheetMatrix(matrix: SheetCellMatrix | undefined): number {
  if (!matrix || typeof matrix !== 'object') return 0
  let n = 0
  for (const rk of Object.keys(matrix)) {
    const ri = Number(rk)
    if (!Number.isFinite(ri)) continue
    const row = matrix[ri]
    if (!row || typeof row !== 'object') continue
    n += Object.keys(row).length
  }
  return n
}

export function computeOccupiedBoundingRange(matrix: SheetCellMatrix | undefined): SheetRangeShape | null {
  if (!matrix || typeof matrix !== 'object') return null
  let minR = Infinity
  let maxR = -Infinity
  let minC = Infinity
  let maxC = -Infinity
  let any = false
  for (const rk of Object.keys(matrix)) {
    const ri = Number(rk)
    if (!Number.isFinite(ri)) continue
    const row = matrix[ri]
    if (!row || typeof row !== 'object') continue
    for (const ck of Object.keys(row)) {
      const ci = Number(ck)
      if (!Number.isFinite(ci)) continue
      any = true
      minR = Math.min(minR, ri)
      maxR = Math.max(maxR, ri)
      minC = Math.min(minC, ci)
      maxC = Math.max(maxC, ci)
    }
  }
  if (!any) return null
  return { startRow: minR, endRow: maxR, startColumn: minC, endColumn: maxC }
}

export function intersectSheetRangeShapes(a: SheetRangeShape, b: SheetRangeShape): SheetRangeShape | null {
  const startRow = Math.max(a.startRow, b.startRow)
  const endRow = Math.min(a.endRow, b.endRow)
  const startColumn = Math.max(a.startColumn, b.startColumn)
  const endColumn = Math.min(a.endColumn, b.endColumn)
  if (startRow > endRow || startColumn > endColumn) return null
  return { startRow, endRow, startColumn, endColumn }
}

export function sheetRangeDeclaredArea(range: SheetRangeShape): number {
  return Math.max(0, range.endRow - range.startRow + 1) * Math.max(0, range.endColumn - range.startColumn + 1)
}

type ClearShapePredicate = (cell: unknown) => boolean

const isClearAllShapeCell: ClearShapePredicate = cell => cell === null
const isClearFormatShapeCell: ClearShapePredicate = cell => {
  if (!cell || typeof cell !== 'object' || Array.isArray(cell)) return false
  const obj = cell as Record<string, unknown>
  const keys = Object.keys(obj)
  if (keys.length !== 1 || keys[0] !== 's') return false
  return obj.s === null
}

/**
 * Build bounding rectangles (one per contiguous row stripe) for cells in the
 * matrix when EVERY cell entry matches `predicate`. Returns null if no entries
 * exist or any entry fails the predicate.
 */
const detectShapeRangesFromCellMatrix = (
  matrix: SheetCellMatrix | undefined,
  predicate: ClearShapePredicate
): SheetRangeShape[] | null => {
  if (!matrix || typeof matrix !== 'object') return null
  const rowKeys: number[] = []
  for (const rawRowKey of Object.keys(matrix)) {
    const rowIndex = Number(rawRowKey)
    if (Number.isNaN(rowIndex)) continue
    const rowCells = matrix[rowIndex]
    if (!rowCells || typeof rowCells !== 'object') continue
    const colKeys = Object.keys(rowCells)
    if (colKeys.length === 0) continue
    rowKeys.push(rowIndex)
    for (const rawColKey of colKeys) {
      const colIndex = Number(rawColKey)
      if (Number.isNaN(colIndex)) continue
      const cell = (rowCells as Record<number, unknown>)[colIndex]
      if (!predicate(cell)) return null
    }
  }
  if (rowKeys.length === 0) return null

  rowKeys.sort((a, b) => a - b)
  const stripes: SheetRangeShape[] = []
  let stripeStartRow = rowKeys[0]
  let stripeEndRow = stripeStartRow
  let stripeStartColumn = Number.POSITIVE_INFINITY
  let stripeEndColumn = Number.NEGATIVE_INFINITY
  const updateStripeColumnsForRow = (rowIndex: number): void => {
    const rowCells = matrix[rowIndex] as Record<number, unknown>
    for (const rawColKey of Object.keys(rowCells)) {
      const colIndex = Number(rawColKey)
      if (Number.isNaN(colIndex)) continue
      if (colIndex < stripeStartColumn) stripeStartColumn = colIndex
      if (colIndex > stripeEndColumn) stripeEndColumn = colIndex
    }
  }
  updateStripeColumnsForRow(stripeStartRow)
  for (let i = 1; i < rowKeys.length; i++) {
    const rowIndex = rowKeys[i]
    if (rowIndex === stripeEndRow + 1) {
      stripeEndRow = rowIndex
      updateStripeColumnsForRow(rowIndex)
      continue
    }
    if (Number.isFinite(stripeStartColumn) && Number.isFinite(stripeEndColumn)) {
      stripes.push({
        startRow: stripeStartRow,
        endRow: stripeEndRow,
        startColumn: stripeStartColumn,
        endColumn: stripeEndColumn
      })
    }
    stripeStartRow = rowIndex
    stripeEndRow = rowIndex
    stripeStartColumn = Number.POSITIVE_INFINITY
    stripeEndColumn = Number.NEGATIVE_INFINITY
    updateStripeColumnsForRow(rowIndex)
  }
  if (Number.isFinite(stripeStartColumn) && Number.isFinite(stripeEndColumn)) {
    stripes.push({
      startRow: stripeStartRow,
      endRow: stripeEndRow,
      startColumn: stripeStartColumn,
      endColumn: stripeEndColumn
    })
  }

  return stripes.length > 0 ? stripes : null
}

/**
 * Detect Univer's `ClearSelectionAllCommand` payload shape from a `set-range-values`
 * MUTATION's `cellValue`. Univer's `Lr(...)` builder writes a sparse matrix where
 * every covered (row, col) entry is the literal value `null` (the entire cell
 * record is dropped — not `{ v: null }`, not `{ s: null }`). This is the only
 * shape that means "wipe value + style + inline formatting" for the cells.
 *
 * Used as a collab-safe trigger for the dedicated `clear_all` op: matching by
 * COMMAND id (`sheet.command.clear-selection-all`) is fragile because the
 * COMMAND fires with no `params.ranges` from the menu/toolbar/shortcut and the
 * facade selection lookup may return null in the brief window between command
 * dispatch and selection commit. The MUTATION payload is always populated with
 * the resolved cells.
 */
export const detectClearAllRangesFromCellMatrix = (matrix: SheetCellMatrix | undefined): SheetRangeShape[] | null =>
  detectShapeRangesFromCellMatrix(matrix, isClearAllShapeCell)

/**
 * Detect Univer's `ClearSelectionFormatCommand` payload shape from a
 * `set-range-values` MUTATION's `cellValue`. Univer's `Nl(...)` builder writes
 * a sparse matrix where every covered (row, col) entry is exactly `{ s: null }`
 * — only the style ref is unset, value/formula/rich text are preserved. This
 * shape uniquely identifies "clear formatting only", distinct from `Lr(...)`
 * (literal `null` per cell — clear-all) and `Hr(...)` (`{ v: '', si: null, ... }` —
 * clear-content).
 *
 * Used as a collab-safe trigger for the dedicated `clear_format` op so peers
 * can authoritatively wipe both the style ref and any inline formatting
 * metadata on the receiver instead of merging the actor's post-mutation cell
 * (which loses the "clear" intent because the merged payload still preserves
 * any prior style ref the receiver holds).
 */
export const detectClearFormatRangesFromCellMatrix = (matrix: SheetCellMatrix | undefined): SheetRangeShape[] | null =>
  detectShapeRangesFromCellMatrix(matrix, isClearFormatShapeCell)

const isBlankLikeCellValue = (value: unknown): boolean => {
  if (value === undefined || value === null || value === '') return true
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const obj = value as Record<string, unknown>
  if (typeof obj.f === 'string' && obj.f.trim() !== '') return false
  if (Object.prototype.hasOwnProperty.call(obj, 'v')) {
    return isBlankLikeCellValue(obj.v)
  }
  if (Object.prototype.hasOwnProperty.call(obj, 'm')) {
    return isBlankLikeCellValue(obj.m)
  }
  return false
}

const pickPreferredCellValue = (preferredValue: unknown, fallbackValue: unknown): unknown => {
  if (isBlankLikeCellValue(preferredValue) && !isBlankLikeCellValue(fallbackValue)) {
    return fallbackValue
  }
  return preferredValue
}

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
      const mergedRow: Record<number, unknown> = {
        ...(fallbackRow && typeof fallbackRow === 'object' ? fallbackRow : {}),
        ...(preferredRow && typeof preferredRow === 'object' ? preferredRow : {})
      }
      if (preferredRow && fallbackRow && typeof preferredRow === 'object' && typeof fallbackRow === 'object') {
        const colKeys = new Set([...Object.keys(fallbackRow), ...Object.keys(preferredRow)])
        for (const colKey of colKeys) {
          const colIndex = Number(colKey)
          if (Number.isNaN(colIndex)) continue
          const hasPreferredValue = Object.prototype.hasOwnProperty.call(preferredRow, colIndex)
          const hasFallbackValue = Object.prototype.hasOwnProperty.call(fallbackRow, colIndex)
          if (!hasPreferredValue || !hasFallbackValue) continue
          mergedRow[colIndex] = pickPreferredCellValue(
            (preferredRow as Record<number, unknown>)[colIndex],
            (fallbackRow as Record<number, unknown>)[colIndex]
          )
        }
      }
      merged[Number(rowKey)] = mergedRow
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

const toComparableCellValue = (value: unknown): string => {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export const cellMatricesDisagreeForRanges = (
  ranges: SheetRangeShape[],
  left: SheetCellMatrix | undefined,
  right: SheetCellMatrix | undefined
): boolean => {
  for (const range of ranges) {
    for (let row = range.startRow; row <= range.endRow; row++) {
      for (let col = range.startColumn; col <= range.endColumn; col++) {
        const leftHasValue = hasCellInMatrix(left, row, col)
        const rightHasRelativeValue = hasCellInMatrix(right, row - range.startRow, col - range.startColumn)
        const rightHasAbsoluteValue = hasCellInMatrix(right, row, col)
        if (!leftHasValue || (!rightHasRelativeValue && !rightHasAbsoluteValue)) continue
        const leftValue = getCellFromMatrix(left, row, col)
        const rightValue = rightHasRelativeValue
          ? getCellFromMatrix(right, row - range.startRow, col - range.startColumn)
          : getCellFromMatrix(right, row, col)
        if (toComparableCellValue(leftValue) !== toComparableCellValue(rightValue)) {
          return true
        }
      }
    }
  }
  return false
}

export const buildAbsoluteCellMatrixForRanges = (
  ranges: SheetRangeShape[],
  preferredAbsolute: SheetCellMatrix | undefined,
  fallback: SheetCellMatrix | undefined,
  fallbackCoordinateMode: SheetCellMatrixCoordinateMode = 'auto'
): SheetCellMatrix | undefined => {
  if (ranges.length === 0) {
    return mergeCellMatrices(preferredAbsolute, fallback)
  }

  const absolute: SheetCellMatrix = {}
  for (const range of ranges) {
    for (let row = range.startRow; row <= range.endRow; row++) {
      for (let col = range.startColumn; col <= range.endColumn; col++) {
        const hasPreferredValue = hasCellInMatrix(preferredAbsolute, row, col)
        const hasRelativeFallbackValue =
          fallbackCoordinateMode !== 'absolute' &&
          hasCellInMatrix(fallback, row - range.startRow, col - range.startColumn)
        const hasAbsoluteFallbackValue = fallbackCoordinateMode !== 'relative' && hasCellInMatrix(fallback, row, col)
        if (!hasPreferredValue && !hasRelativeFallbackValue && !hasAbsoluteFallbackValue) continue
        const fallbackValue = hasRelativeFallbackValue
          ? getCellFromMatrix(fallback, row - range.startRow, col - range.startColumn)
          : getCellFromMatrix(fallback, row, col)
        const value = hasPreferredValue
          ? hasRelativeFallbackValue || hasAbsoluteFallbackValue
            ? pickPreferredCellValue(getCellFromMatrix(preferredAbsolute, row, col), fallbackValue)
            : getCellFromMatrix(preferredAbsolute, row, col)
          : fallbackValue
        if (!absolute[row]) absolute[row] = {}
        absolute[row][col] = value
      }
    }
  }

  return Object.keys(absolute).length > 0 ? absolute : undefined
}
