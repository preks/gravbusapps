export type FormulaSelectionMode = {
  editingCell: { rowId: string; colId: string }
  startCell: { rowIndex: number; colIndex: number } | null
  endCell: { rowIndex: number; colIndex: number } | null
  isRangeSelection: boolean
} | null

export function appendCellRef(formula: string, ref: string): string {
  const trimmed = formula.trim()
  if (trimmed === '' || trimmed === '=') return `${trimmed}${ref}`
  const lastChar = trimmed.slice(-1)
  if (/[+\-*/=(,]/.test(lastChar)) return `${formula}${ref}`
  return `${formula}+${ref}`
}

export function buildRangeCells(params: {
  start: { rowIndex: number; colIndex: number }
  end: { rowIndex: number; colIndex: number }
}): Array<{ rowIndex: number; colIndex: number }> {
  const startRow = Math.min(params.start.rowIndex, params.end.rowIndex)
  const endRow = Math.max(params.start.rowIndex, params.end.rowIndex)
  const startCol = Math.min(params.start.colIndex, params.end.colIndex)
  const endCol = Math.max(params.start.colIndex, params.end.colIndex)

  const cells: Array<{ rowIndex: number; colIndex: number }> = []
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      cells.push({ rowIndex: r, colIndex: c })
    }
  }
  return cells
}
