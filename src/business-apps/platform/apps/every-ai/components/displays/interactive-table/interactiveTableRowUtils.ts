import type { ChipCellValue, CurrencyCellValue, InteractiveTableColumn } from '../../../types/models'
import { isIsoDateLike, sortKeyForDateCell } from './formatDateCell'

export type TableRow = Record<string, unknown>

/** Internal row key for TanStack DataTable — never overlaps with a data column named `id`. */
export const DATA_TABLE_ROW_ID_KEY = '__dataTableRowId'

function chipId(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null || !('id' in value)) {
    return undefined
  }
  const id = (value as ChipCellValue).id
  return id ? String(id) : undefined
}

function hasIdDataColumn(columns: InteractiveTableColumn[]): boolean {
  return columns.some(column => column.id === 'id')
}

/**
 * nw-design-system DataTable requires each row to have a stable id (see getRowId in TableStateManager).
 * GraphQL-flattened interactive rows often only expose entity ids inside chip columns.
 */
function resolveBaseRowId(
  row: TableRow,
  index: number,
  options: {
    rowEntityIdColumn?: string
    columns: InteractiveTableColumn[]
  }
): string {
  const idIsDataColumn = hasIdDataColumn(options.columns)

  if (!idIsDataColumn) {
    const existing = row.id
    if (typeof existing === 'string' && existing !== '') {
      return existing
    }
    const fromExistingChip = chipId(existing)
    if (fromExistingChip) {
      return fromExistingChip
    }
  }

  const entityCol = options.rowEntityIdColumn
  if (entityCol) {
    const fromEntityCol = chipId(row[entityCol]) ?? (typeof row[entityCol] === 'string' ? row[entityCol] : undefined)
    if (fromEntityCol) {
      return String(fromEntityCol)
    }
  }

  if (idIsDataColumn) {
    const fromIdColumn = chipId(row.id) ?? (typeof row.id === 'string' ? row.id : undefined)
    if (fromIdColumn) {
      return String(fromIdColumn)
    }
  }

  const chipCol = options.columns.find(c => c.dataType === 'chip')
  const fromChip = chipCol ? chipId(row[chipCol.id]) : undefined
  if (fromChip) {
    return fromChip
  }

  return `interactive-table-row-${index}`
}

/**
 * Ensures each row has a unique DataTable row id. Duplicate entity ids in query results would
 * otherwise produce duplicate React keys and break row identity.
 *
 * When a visible data column is named `id`, the row id is stored in {@link DATA_TABLE_ROW_ID_KEY}
 * so chip payloads in the `id` column are not overwritten.
 */
export function ensureDataTableRowIds(
  rows: TableRow[],
  options: {
    rowEntityIdColumn?: string
    columns: InteractiveTableColumn[]
  }
): TableRow[] {
  const idIsDataColumn = hasIdDataColumn(options.columns)
  const seen = new Set<string>()
  return rows.map((row, index) => {
    const baseId = resolveBaseRowId(row, index, options)
    let uniqueId = baseId
    let suffix = 0
    while (seen.has(uniqueId)) {
      suffix += 1
      uniqueId = `${baseId}::${suffix}`
    }
    seen.add(uniqueId)

    const existingRowId = idIsDataColumn ? row[DATA_TABLE_ROW_ID_KEY] : row.id
    if (uniqueId === baseId && existingRowId === baseId) {
      return row
    }

    if (idIsDataColumn) {
      return { ...row, [DATA_TABLE_ROW_ID_KEY]: uniqueId }
    }

    return { ...row, id: uniqueId }
  })
}

export function dataTableRowId(row: TableRow): string {
  const internal = row[DATA_TABLE_ROW_ID_KEY]
  if (internal !== null && internal !== undefined && String(internal) !== '') {
    return String(internal)
  }
  const existing = row.id
  if (typeof existing === 'string' && existing !== '') {
    return existing
  }
  const fromChip = chipId(existing)
  if (fromChip) {
    return fromChip
  }
  return String(existing ?? '')
}

/** Scalar sort key for TanStack client-side sorting (chips sort by label). */
export function sortableValueForColumn(column: InteractiveTableColumn, value: unknown): string | number {
  if (value === null || value === undefined) {
    return ''
  }
  if (column.dataType === 'chip' && typeof value === 'object' && value !== null && 'label' in value) {
    return String((value as ChipCellValue).label).toLowerCase()
  }
  if (column.dataType === 'chip_list' && Array.isArray(value)) {
    return value
      .map(item =>
        typeof item === 'object' && item !== null && 'label' in item
          ? String((item as ChipCellValue).label)
          : String(item)
      )
      .join(', ')
      .toLowerCase()
  }
  if (column.dataType === 'currency' && typeof value === 'object' && value !== null && 'value' in value) {
    return (value as CurrencyCellValue).value
  }
  if ((column.dataType === 'date' || column.dataType === 'text') && typeof value === 'string' && isIsoDateLike(value)) {
    return sortKeyForDateCell(value)
  }
  if (column.dataType === 'number' && typeof value === 'number') {
    return value
  }
  if (column.dataType === 'boolean') {
    return value ? 1 : 0
  }
  return String(value).toLowerCase()
}
