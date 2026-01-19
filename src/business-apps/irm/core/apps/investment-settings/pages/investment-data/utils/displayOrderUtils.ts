import { FieldDefinition } from '../types'

export interface FieldRow {
  row: number
  fields: FieldDefinition[]
}

/**
 * Parse display order X.Y format
 */
export const parseDisplayOrder = (displayOrder: string): { row: number; col: number } => {
  const parts = displayOrder.split('.')
  return {
    row: parseInt(parts[0]) || 1,
    col: parseInt(parts[1]) || 1
  }
}

/**
 * Group fields into rows based on display order
 */
export const groupFieldsIntoRows = (fields: FieldDefinition[]): FieldRow[] => {
  const rowMap = new Map<number, FieldDefinition[]>()

  fields.forEach(field => {
    const { row } = parseDisplayOrder(field.displayOrder)
    if (!rowMap.has(row)) {
      rowMap.set(row, [])
    }
    rowMap.get(row)!.push(field)
  })

  // Sort rows by row number
  const rows = Array.from(rowMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([row, rowFields]) => ({
      row,
      fields: rowFields.sort((a, b) => {
        const aCol = parseDisplayOrder(a.displayOrder).col
        const bCol = parseDisplayOrder(b.displayOrder).col
        return aCol - bCol
      })
    }))

  return rows
}

/**
 * Recalculate display orders after drag
 */
export const recalculateDisplayOrders = (rows: FieldRow[]): FieldDefinition[] => {
  const allFields: FieldDefinition[] = []

  rows.forEach((row, rowIndex) => {
    row.fields.forEach((field, colIndex) => {
      allFields.push({
        ...field,
        displayOrder: `${rowIndex + 1}.${colIndex + 1}`
      })
    })
  })

  return allFields
}
