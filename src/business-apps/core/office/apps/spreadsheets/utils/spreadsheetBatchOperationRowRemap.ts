import type { SpreadsheetBatchOperation } from '../services/SpreadsheetApiService'

/**
 * Rewrites `rowId` fields in cell persistence ops using a UI→backend map
 * (e.g. after `add_rows` materializes `client_*` ids to server UUIDs).
 */
export function remapBatchOperationsWithUiToBackendRowMap(
  operations: SpreadsheetBatchOperation[],
  uiToBackend: Map<string, string>
): SpreadsheetBatchOperation[] {
  if (uiToBackend.size === 0) return operations

  const mapRowId = (rowId: string): string => uiToBackend.get(rowId) ?? rowId

  return operations.map(op => {
    if (op.type === 'set_range') {
      const cells = op.data?.cells
      if (!Array.isArray(cells)) return op
      return {
        ...op,
        data: {
          ...op.data,
          cells: cells.map((cell: Record<string, unknown>) => {
            const rowId = String(cell.rowId ?? '')
            const mapped = mapRowId(rowId)
            return mapped === rowId ? cell : { ...cell, rowId: mapped }
          })
        }
      }
    }
    if (op.type === 'set_cell') {
      const rowId = String(op.data?.rowId ?? '')
      const mapped = mapRowId(rowId)
      if (mapped === rowId) return op
      return { ...op, data: { ...op.data, rowId: mapped } }
    }
    if (op.type === 'clear_cell') {
      const rowId = String(op.data?.rowId ?? '')
      const mapped = mapRowId(rowId)
      if (mapped === rowId) return op
      return { ...op, data: { ...op.data, rowId: mapped } }
    }
    return op
  })
}
