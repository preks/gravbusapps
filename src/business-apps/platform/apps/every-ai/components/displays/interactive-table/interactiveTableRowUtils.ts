import type { ChipCellValue, CurrencyCellValue, InteractiveTableColumn } from '../../../types/models'
import { isIsoDateLike, sortKeyForDateCell } from './formatDateCell'

export type TableRow = Record<string, unknown>

function chipId(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null || !('id' in value)) {
    return undefined
  }
  const id = (value as ChipCellValue).id
  return id ? String(id) : undefined
}

/**
 * nw-design-system DataTable requires each row to have a stable `id` (see getRowId in TableStateManager).
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
  const existing = row.id
  if (existing !== null && existing !== undefined && String(existing) !== '') {
    return String(existing)
  }

  const entityCol = options.rowEntityIdColumn
  if (entityCol) {
    const fromEntityCol = chipId(row[entityCol]) ?? (typeof row[entityCol] === 'string' ? row[entityCol] : undefined)
    if (fromEntityCol) {
      return String(fromEntityCol)
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
 * Ensures each row has a unique `id` for DataTable (getRowId). Duplicate entity ids in
 * query results would otherwise produce duplicate React keys and break row identity.
 */
export function ensureDataTableRowIds(
  rows: TableRow[],
  options: {
    rowEntityIdColumn?: string
    columns: InteractiveTableColumn[]
  }
): TableRow[] {
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
    if (uniqueId === baseId && row.id === baseId) {
      return row
    }
    return { ...row, id: uniqueId }
  })
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
