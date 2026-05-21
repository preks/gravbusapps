import type { ColumnDefinition } from '../types'
import { InputType } from '../types'

export type EntityDataEditValue = string | number | boolean | string[] | null
export type EntityDataEditValues = Record<string, EntityDataEditValue>

export function getInitialEntityDataEditValue(rawValue: unknown, column: ColumnDefinition): EntityDataEditValue {
  if (rawValue == null) {
    return column.type === InputType.CHECKBOX ? false : column.type === InputType.MULTISELECT ? [] : ''
  }

  if (column.type === InputType.CHECKBOX) {
    return rawValue === true || rawValue === 'true'
  }

  if (column.type === InputType.MULTISELECT) {
    if (Array.isArray(rawValue)) {
      return rawValue.map(value => String(value))
    }
    return String(rawValue)
      .split(',')
      .map(value => value.trim())
      .filter(Boolean)
  }

  if (column.type === InputType.NUMBER) {
    const numberValue = typeof rawValue === 'number' ? rawValue : Number(rawValue)
    return Number.isNaN(numberValue) ? '' : numberValue
  }

  if (column.type === InputType.DATE) {
    return typeof rawValue === 'string' ? rawValue.split('T')[0] : String(rawValue)
  }

  return String(rawValue)
}

export function createEmptyEntityDataEditValues(columns: ColumnDefinition[]): EntityDataEditValues {
  return Object.fromEntries(columns.map(column => [column.fieldName, getInitialEntityDataEditValue(null, column)]))
}

export function serializeEntityDataEditValues(
  columns: ColumnDefinition[],
  values: EntityDataEditValues
): Record<string, unknown> {
  const serializedValues: Record<string, unknown> = {}

  for (const column of columns) {
    const value = values[column.fieldName]

    if (column.type === InputType.NUMBER) {
      if (value === '' || value == null) {
        serializedValues[column.fieldName] = null
        continue
      }
      const numberValue = typeof value === 'number' ? value : Number(value)
      serializedValues[column.fieldName] = Number.isNaN(numberValue) ? null : numberValue
      continue
    }

    if (column.type === InputType.CHECKBOX) {
      serializedValues[column.fieldName] = value === true
      continue
    }

    if (column.type === InputType.MULTISELECT) {
      serializedValues[column.fieldName] = Array.isArray(value) && value.length > 0 ? value : null
      continue
    }

    if (column.type === InputType.FILE) {
      serializedValues[column.fieldName] = value || null
      continue
    }

    serializedValues[column.fieldName] = value === '' || value == null ? null : value
  }

  return serializedValues
}

export function formatEntityDataDisplayValue(value: unknown, column: ColumnDefinition): string {
  if (value == null || value === '') {
    return ''
  }
  if (column.type === InputType.CHECKBOX) {
    return value === true || value === 'true' ? 'Yes' : 'No'
  }
  if (Array.isArray(value)) {
    return value.join(', ')
  }
  return String(value)
}
