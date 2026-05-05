import type { ColumnDefinition } from '../types'
import { InputType } from '../types'

const ENTITY_REFERENCE_DATA_SOURCE_TYPES = new Set(['CUSTOM_ENTITY', 'INTERNAL_ENTITY'])
const COLUMN_NAME_PATTERN = /^[a-z][a-z0-9_]*$/
const REDUNDANT_REFERENCE_ID_SUFFIX_PATTERN = /(?:_id|Id|ID)$/

export function sanitizeDefinitionKey(value: string): string {
  return value
    .toLowerCase()
    .replaceAll(/\s+/g, '_')
    .replaceAll(/[^a-z0-9_]/g, '')
    .replace(/^_+|_+$/g, '')
}

export function deriveDefinitionKeyFromDisplayName(displayName: string): string {
  return sanitizeDefinitionKey(displayName)
}

export function buildUniqueDefinitionKey(displayName: string, existingKeys: string[], currentKey?: string): string {
  const derivedDefinitionKey = deriveDefinitionKeyFromDisplayName(displayName)
  if (!derivedDefinitionKey) {
    return ''
  }

  const currentDefinitionKey = String(currentKey || '').trim()
  const conflictingKeys = new Set(
    existingKeys
      .map(existingKey => String(existingKey || '').trim())
      .filter(existingKey => existingKey && existingKey !== currentDefinitionKey)
  )

  if (!conflictingKeys.has(derivedDefinitionKey)) {
    return derivedDefinitionKey
  }

  let duplicateIndex = 2
  let candidateDefinitionKey = `${derivedDefinitionKey}_${duplicateIndex}`

  while (conflictingKeys.has(candidateDefinitionKey)) {
    duplicateIndex += 1
    candidateDefinitionKey = `${derivedDefinitionKey}_${duplicateIndex}`
  }

  return candidateDefinitionKey
}

export function toPascalCase(value: string): string {
  const normalizedValue = String(value || '').trim()
  if (!normalizedValue) return ''

  const parts = normalizedValue
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return ''

  return parts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('')
}

export function snakeToCamelCase(value: string): string {
  const normalizedValue = String(value || '').trim()
  if (!normalizedValue) return ''
  if (/^[a-z][a-zA-Z0-9]*$/.test(normalizedValue)) return normalizedValue

  const parts = normalizedValue
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return ''

  const [firstPart, ...remainingParts] = parts
  return `${firstPart.toLowerCase()}${remainingParts
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('')}`
}

function stripRedundantReferenceIdSuffix(value: string): string {
  if (value.endsWith('_id')) {
    return value.slice(0, -3)
  }

  if (value.endsWith('Id') || value.endsWith('ID')) {
    return value.slice(0, -2)
  }

  return value
}

export function isEntityReferenceColumn(column: ColumnDefinition): boolean {
  const dataSourceType = column.dataSource?.type
  return (
    typeof dataSourceType === 'string' &&
    ENTITY_REFERENCE_DATA_SOURCE_TYPES.has(dataSourceType) &&
    (column.type === InputType.SELECT || column.type === InputType.MULTISELECT)
  )
}

export function isSingularEntityReferenceColumn(column: ColumnDefinition): boolean {
  return isEntityReferenceColumn(column) && column.type === InputType.SELECT
}

export function sanitizeReferenceFieldName(value: string): string {
  return sanitizeDefinitionKey(value)
}

export function hasRedundantReferenceIdSuffix(value: string): boolean {
  return REDUNDANT_REFERENCE_ID_SUFFIX_PATTERN.test(value)
}

export function getReferenceFieldNameValidationError(value: string): string | null {
  const normalizedValue = String(value || '').trim()

  if (!normalizedValue) {
    return 'Field name is required'
  }

  if (hasRedundantReferenceIdSuffix(normalizedValue)) {
    const suggestedName = stripRedundantReferenceIdSuffix(normalizedValue) || 'company'
    return `Do not append Id or _id to entity reference field names. Use '${sanitizeReferenceFieldName(suggestedName)}' instead`
  }

  if (!COLUMN_NAME_PATTERN.test(normalizedValue)) {
    return 'Entity reference field names must use snake_case lowercase letters, numbers, and underscores'
  }

  return null
}

export function normalizeColumnNameInput(column: ColumnDefinition, value: string): string {
  if (isEntityReferenceColumn(column)) {
    return sanitizeReferenceFieldName(value)
  }

  return sanitizeDefinitionKey(value)
}

export function syncColumnNameWithLabel(column: ColumnDefinition): ColumnDefinition {
  const normalizedLabel = String(column.label || '').trim()
  if (!normalizedLabel) {
    return column
  }

  return {
    ...column,
    name: normalizeColumnNameInput(column, normalizedLabel)
  }
}

export function getEditableReferenceFieldName(column: ColumnDefinition): string {
  if (!isEntityReferenceColumn(column)) {
    return column.name
  }

  if (column.name.endsWith('_id')) {
    return column.name.slice(0, -3)
  }

  if (column.name.endsWith('Id') || column.name.endsWith('ID')) {
    return sanitizeReferenceFieldName(column.name.slice(0, -2))
  }

  return column.name
}

export function prepareColumnsForEditing(columns: ColumnDefinition[]): ColumnDefinition[] {
  return columns.map(column => {
    if (!isEntityReferenceColumn(column)) {
      return column
    }

    return {
      ...column,
      name: getEditableReferenceFieldName(column)
    }
  })
}

export function prepareColumnsForPersistence<T extends ColumnDefinition>(columns: T[]): T[] {
  return columns.map(column => {
    if (!isSingularEntityReferenceColumn(column)) {
      return column
    }

    return {
      ...column,
      name: `${column.name}_id`
    }
  })
}

export function getPersistedReferenceFieldNamePreview(column: ColumnDefinition): string | null {
  if (!isSingularEntityReferenceColumn(column)) {
    return null
  }

  const editableReferenceFieldName = String(column.name || '').trim()
  if (!editableReferenceFieldName) {
    return 'company_id'
  }

  return `${editableReferenceFieldName}_id`
}

export function getColumnNameValidationError(column: ColumnDefinition, columnIndex: number): string | null {
  if (!column.name.trim()) {
    return `Column ${columnIndex + 1}: Name is required`
  }

  if (isEntityReferenceColumn(column)) {
    const validationError = getReferenceFieldNameValidationError(column.name)
    return validationError ? `Column ${columnIndex + 1}: ${validationError}` : null
  }

  if (!COLUMN_NAME_PATTERN.test(column.name)) {
    return `Column ${columnIndex + 1}: Name must start with a letter and contain only lowercase letters, numbers, and underscores`
  }

  return null
}

export function validateDefinitionForm(params: { displayName: string; columns: ColumnDefinition[] }): string | null {
  const { displayName, columns } = params
  const derivedDefinitionKey = deriveDefinitionKeyFromDisplayName(displayName)

  if (!displayName.trim()) return 'Display name is required'
  if (!derivedDefinitionKey) return 'Display name must contain at least one letter or number'
  if (derivedDefinitionKey.length < 3) return 'Display name must generate a key with at least 3 characters'
  if (!/^[a-z][a-z0-9_]*$/.test(derivedDefinitionKey))
    return 'Display name must generate a key that starts with a letter and contains only lowercase letters, numbers, and underscores'
  if (columns.length === 0) return 'At least one column is required'

  // Validate each column
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i]
    if (!col.label.trim()) return `Column ${i + 1}: Label is required`

    const columnNameValidationError = getColumnNameValidationError(col, i)
    if (columnNameValidationError) {
      return columnNameValidationError
    }
  }

  // Check for duplicate column names
  const names = columns.map(c => c.name)
  const duplicates = names.filter((name, index) => names.indexOf(name) !== index)
  if (duplicates.length > 0) {
    return `Duplicate column name: ${duplicates[0]}`
  }

  return null
}
