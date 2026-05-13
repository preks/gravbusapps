/** Echo suppression entries for remote cell applies (collaboration dedup). */
export type RemoteEchoSuppressionEntry = {
  expiresAt: number
  /**
   * Accept multiple candidate signatures because Univer may emit the post-apply
   * cell-change as a delta or as the full cell state.
   */
  signatures: ReadonlySet<string>
}

export interface SnapshotDimensions {
  defaultColWidth: number
  defaultRowHeight: number
  columnData: Record<string | number, { w?: number; hd?: number }>
  rowData: Record<string | number, { h?: number; hd?: number }>
  rowHeaderWidth: number
  columnHeaderHeight: number
  zoomRatio: number
}

export type ActiveSelectionPosition = {
  sheetId: string
  row: number
  col: number
}
