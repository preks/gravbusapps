export interface FormulaRangeBounds {
  dataStartRow?: number
  rowCount: number
}

/**
 * Convert full-column references (e.g. B:B, A:G, $B:$B) into bounded ranges
 * using detected data rows (e.g. B2:B41, A2:G41).
 */
export function expandFormulaFullColumnRanges(formula: string, bounds: FormulaRangeBounds): string {
  if (!formula || typeof formula !== 'string') return formula

  const dataStartRow = Math.max(1, bounds.dataStartRow ?? 2)
  const rowCount = Math.max(1, bounds.rowCount)
  const dataEndRow = dataStartRow + rowCount - 1
  const normalized = formula.trim().startsWith('=') ? formula.trim() : `=${formula.trim()}`

  // Match only full-column refs like A:A, A:G, $B:$B, $A:G
  return normalized.replace(/\$?([A-Z]+)\$?:\$?([A-Z]+)\$?/gi, (_match, startCol: string, endCol: string) => {
    const from = startCol.toUpperCase()
    const to = endCol.toUpperCase()
    return `${from}${dataStartRow}:${to}${dataEndRow}`
  })
}
