import type { ColumnDefinition } from '../types'
import { InputType } from '../types'

const ENTITY_REFERENCE_DATA_SOURCE_TYPES = new Set(['CUSTOM_ENTITY', 'INTERNAL_ENTITY'])
const PUBLIC_FIELD_NAME_PATTERN = /^[a-z][a-z0-9]*(?:[A-Z][a-z0-9]*)*$/

interface DefinitionDisplayNameCandidate {
  id?: string
  namespace: string
  entityName: string
  displayName?: string | null
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

export function normalizeEntityDisplayNameKey(value: string): string {
  return String(value || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
}

export function getDuplicateDefinitionDisplayNameError(params: {
  displayName: string
  namespace: string
  definitions: DefinitionDisplayNameCandidate[]
  currentDefinitionId?: string
}): string | null {
  const normalizedDisplayNameKey = normalizeEntityDisplayNameKey(params.displayName)
  if (!normalizedDisplayNameKey) {
    return null
  }

  const duplicateDefinition = params.definitions.find(definition => {
    if (definition.namespace !== params.namespace) {
      return false
    }
    if (params.currentDefinitionId && definition.id === params.currentDefinitionId) {
      return false
    }
    return normalizeEntityDisplayNameKey(definition.displayName || definition.entityName) === normalizedDisplayNameKey
  })

  if (!duplicateDefinition) {
    return null
  }

  return `Entity display name must be unique in this namespace: ${duplicateDefinition.displayName || duplicateDefinition.entityName}`
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
  return value
}

export function hasRedundantReferenceIdSuffix(value: string): boolean {
  void value
  return false
}

export function getReferenceFieldNameValidationError(value: string): string | null {
  const normalizedValue = String(value || '').trim()

  if (!normalizedValue) {
    return 'Reference target is required'
  }

  return null
}

export function normalizeColumnNameInput(column: ColumnDefinition, value: string): string {
  return value
}

export function syncColumnNameWithLabel(column: ColumnDefinition): ColumnDefinition {
  const normalizedLabel = String(column.label || '').trim()
  if (!normalizedLabel) {
    return column
  }

  const nextFieldName = snakeToCamelCase(normalizedLabel)

  return {
    ...column,
    fieldName: column.fieldName || normalizeColumnNameInput(column, nextFieldName)
  }
}

export function getEditableReferenceFieldName(column: ColumnDefinition): string {
  if (!isEntityReferenceColumn(column)) {
    return column.fieldName || column.label
  }

  return column.fieldName || column.label
}

export function prepareColumnsForEditing(columns: ColumnDefinition[]): ColumnDefinition[] {
  return columns.map(column => ({
    ...column,
    fieldName: column.fieldName || ''
  }))
}

export function prepareColumnsForPersistence<T extends ColumnDefinition>(columns: T[]): T[] {
  return columns.map(column => ({
    ...column,
    fieldName: column.fieldName
  }))
}

export function getPersistedReferenceFieldNamePreview(column: ColumnDefinition): string | null {
  if (!isSingularEntityReferenceColumn(column)) {
    return null
  }

  const editableReferenceFieldName = String(column.fieldName || column.label || '').trim()
  if (!editableReferenceFieldName) {
    return 'companyId'
  }

  return editableReferenceFieldName
}

export function getColumnNameValidationError(column: ColumnDefinition, columnIndex: number): string | null {
  if (!column.label.trim()) {
    return `Column ${columnIndex + 1}: Label is required`
  }
  const fieldName = String(column.fieldName || '').trim()
  if (!fieldName) {
    return `Column ${columnIndex + 1}: Field name is required`
  }
  if (!PUBLIC_FIELD_NAME_PATTERN.test(fieldName)) {
    return `Column ${columnIndex + 1}: Field name must be camelCase letters and numbers`
  }

  if (isEntityReferenceColumn(column)) {
    const validationError = getReferenceFieldNameValidationError(fieldName)
    return validationError ? `Column ${columnIndex + 1}: ${validationError}` : null
  }

  return null
}

export function validateDefinitionForm(params: {
  displayName: string
  columns: ColumnDefinition[]
  namespace?: string
  definitions?: DefinitionDisplayNameCandidate[]
  currentDefinitionId?: string
}): string | null {
  const { displayName, columns } = params
  if (!displayName.trim()) return 'Display name is required'
  if (params.namespace && params.definitions) {
    const duplicateDisplayNameError = getDuplicateDefinitionDisplayNameError({
      displayName,
      namespace: params.namespace,
      definitions: params.definitions,
      currentDefinitionId: params.currentDefinitionId
    })
    if (duplicateDisplayNameError) {
      return duplicateDisplayNameError
    }
  }
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
  const labels = columns.map(c => c.label.trim())
  const duplicateLabels = labels.filter((label, index) => labels.indexOf(label) !== index)
  if (duplicateLabels.length > 0) {
    return `Duplicate column label: ${duplicateLabels[0]}`
  }

  const fieldNames = columns.map(c => c.fieldName.trim())
  const duplicateFieldNames = fieldNames.filter((fieldName, index) => fieldNames.indexOf(fieldName) !== index)
  if (duplicateFieldNames.length > 0) {
    return `Duplicate field name: ${duplicateFieldNames[0]}`
  }

  return null
}
