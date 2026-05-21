import type { ChipCellValue, InteractiveTableColumn } from '../../../types/models'

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
export function ensureDataTableRowIds(
  rows: TableRow[],
  options: {
    rowEntityIdColumn?: string
    columns: InteractiveTableColumn[]
  }
): TableRow[] {
  return rows.map((row, index) => {
    const existing = row.id
    if (existing !== null && existing !== undefined && String(existing) !== '') {
      return row
    }

    const entityCol = options.rowEntityIdColumn
    if (entityCol) {
      const fromEntityCol = chipId(row[entityCol]) ?? (typeof row[entityCol] === 'string' ? row[entityCol] : undefined)
      if (fromEntityCol) {
        return { ...row, id: String(fromEntityCol) }
      }
    }

    const chipCol = options.columns.find(c => c.dataType === 'chip')
    const fromChip = chipCol ? chipId(row[chipCol.id]) : undefined
    if (fromChip) {
      return { ...row, id: fromChip }
    }

    return { ...row, id: `interactive-table-row-${index}` }
  })
}
