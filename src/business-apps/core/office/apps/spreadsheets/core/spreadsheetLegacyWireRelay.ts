import {
  SPREADSHEET_COMMITTED_DELTA_PAYLOAD_SCHEMA_VERSION,
  type SpreadsheetCommittedBatchEnvelope,
  type SpreadsheetCommittedOperation
} from './spreadsheetCommittedDeltaContract'

/** Op types the v2 gateway no longer relays; may still appear in HTTP replay logs. */
export const LEGACY_WS_RELAY_OP_TYPES = new Set(['cells_changed', 'row_update', 'set_cell', 'set_range', 'clear_cell'])

/** Structural ops that must arrive inside committed `batch_operations` on live WS. */
export const DEPRECATED_WS_STRUCTURAL_RELAY_OP_TYPES = new Set([
  'row_add',
  'row_delete',
  'add_rows',
  'insert_rows_at',
  'insert_row_slots',
  'delete_rows',
  'delete_row_slots',
  'move_row_slots',
  'move_cell_range'
])

export function isLegacyWsRelayOperation(operationType: string): boolean {
  return LEGACY_WS_RELAY_OP_TYPES.has(operationType)
}

export function isDeprecatedWsStructuralRelayOperation(operationType: string): boolean {
  return DEPRECATED_WS_STRUCTURAL_RELAY_OP_TYPES.has(operationType)
}

const toFiniteVersion = (value: unknown): number | null => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) return null
  return Math.trunc(numeric)
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null

type CellsChangedWireCell = {
  rowId?: string
  column?: string
  value?: unknown
  cellRef?: string
  univerCell?: Record<string, unknown>
}

/**
 * Builds a committed-batch envelope from a deprecated single-op WS payload so delta replay can apply it.
 */
export function synthesizeCommittedBatchFromWireOperation(params: {
  operationType: string
  data: unknown
  sheetId: string
  appliedVersion: number | null
}): SpreadsheetCommittedBatchEnvelope | null {
  const { operationType, data, sheetId } = params
  const appliedVersion = params.appliedVersion
  if (!sheetId || appliedVersion == null) return null
  const baseVersion = Math.max(0, appliedVersion - 1)
  const payload = asRecord(data)
  if (!payload) return null

  const wrap = (operations: SpreadsheetCommittedOperation[]): SpreadsheetCommittedBatchEnvelope => ({
    sheetId,
    baseVersion,
    appliedVersion,
    operations,
    payloadSchemaVersion: SPREADSHEET_COMMITTED_DELTA_PAYLOAD_SCHEMA_VERSION
  })

  if (operationType === 'set_cell' || operationType === 'set_range' || operationType === 'clear_cell') {
    return wrap([
      {
        type: operationType,
        data: { sheetId, ...payload },
        baseVersion,
        appliedVersion
      }
    ])
  }

  if (operationType === 'cells_changed') {
    const cells = Array.isArray(payload.cells) ? (payload.cells as CellsChangedWireCell[]) : []
    if (cells.length === 0) return null
    const wireCells = cells
      .filter(cell => cell?.rowId && cell.column != null)
      .map(cell => ({
        rowId: String(cell.rowId),
        columnName: String(cell.column),
        value: Object.prototype.hasOwnProperty.call(cell, 'value') ? cell.value : null,
        cellRef: typeof cell.cellRef === 'string' ? cell.cellRef : undefined,
        univerCell: cell.univerCell
      }))
    if (wireCells.length === 0) return null
    return wrap([
      {
        type: 'set_range',
        data: { sheetId, cells: wireCells },
        baseVersion,
        appliedVersion
      }
    ])
  }

  if (operationType === 'row_update') {
    return wrap([
      {
        type: 'row_update',
        data: { sheetId, ...payload },
        baseVersion,
        appliedVersion
      }
    ])
  }

  return null
}

export function resolveWireOperationAppliedVersion(
  incomingVersion: number | undefined,
  operation: { baseVersion?: number; version?: number; data?: unknown }
): number | null {
  const data = asRecord(operation.data)
  return (
    toFiniteVersion(incomingVersion) ??
    toFiniteVersion(operation.version) ??
    toFiniteVersion(data?.appliedVersion) ??
    null
  )
}
