export const isSpreadsheetCellProbeEnabled = (): boolean => {
  try {
    return globalThis.localStorage?.getItem('debug:spreadsheet-cell-probe') === '1'
  } catch {
    return false
  }
}

export const recordSpreadsheetCellProbe = (stage: string, detail: Record<string, unknown>): void => {
  if (!isSpreadsheetCellProbeEnabled()) return

  try {
    const root = globalThis as typeof globalThis & {
      __spreadsheetCellProbe?: Array<{ at: number; stage: string; detail: Record<string, unknown> }>
    }
    const nextEntry = {
      at: Date.now(),
      stage,
      detail
    }
    const previous = Array.isArray(root.__spreadsheetCellProbe) ? root.__spreadsheetCellProbe : []
    root.__spreadsheetCellProbe = [...previous.slice(-199), nextEntry]
    console.debug('[spreadsheet-cell-probe]', stage, detail)
  } catch {
    // Ignore debug probe failures.
  }
}
