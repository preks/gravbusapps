import type { SpreadsheetColumn } from '../types/spreadsheet'

/**
 * Reads a cell payload from a viewer row map (name key, then id key only when name is `undefined`,
 * then case-insensitive fallback).
 *
 * - Use **`undefined` gaps only** between name and id: merged rows often carry `{ Name: undefined, col_id: value }`;
 *   peers must still resolve the id key (collaboration / echo).
 * - Do **not** use `??`: **`null` must stay** (`null` clears a cell; `null ?? row[id]` would wrongly read id).
 */
export function readSpreadsheetRowCellValue(row: Record<string, unknown>, column: SpreadsheetColumn): unknown {
  let value: unknown = row[column.name]
  if (value === undefined && column.id !== column.name) {
    value = row[column.id]
  }
  if (value === undefined) {
    const rowKeys = Object.keys(row)
    const matchingKey = rowKeys.find(
      key => key.toLowerCase() === column.name.toLowerCase() || key.toLowerCase() === column.id.toLowerCase()
    )
    if (matchingKey) value = row[matchingKey]
  }
  if (value && typeof value === 'object') {
    if (Array.isArray(value)) return value
    const cellObject = value as Record<string, unknown>
    if ('v' in cellObject || 'f' in cellObject || 'm' in cellObject || 'ct' in cellObject) {
      return cellObject
    }
    return ''
  }
  return value
}
