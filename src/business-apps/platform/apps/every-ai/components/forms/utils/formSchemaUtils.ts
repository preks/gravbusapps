/**
 * Form Schema Utilities
 * Utility functions for parsing and working with JSON Schema
 */

/**
 * Check if field should be displayed based on conditional display logic
 */
export const evaluateDisplayCondition = (condition: any, formData: Record<string, any>, fieldPath: string): boolean => {
  if (!condition?.condition) {
    return true
  }

  const { field, operator, value: conditionValue } = condition.condition

  // Build the actual field path for the dependent field
  const pathParts = fieldPath.split('.')
  pathParts.pop() // Remove current field name
  const basePath = pathParts.join('.')
  const dependentFieldPath = basePath ? `${basePath}.${field}` : field

  // Get the dependent field value from formData
  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  const fieldValue = getNestedValue(formData, dependentFieldPath)

  // Handle array values (checkboxes, multi-select)
  if (Array.isArray(fieldValue)) {
    switch (operator) {
      case 'equals':
        return fieldValue.includes(conditionValue)
      case 'notEquals':
        return !fieldValue.includes(conditionValue)
      case 'contains':
        return fieldValue.some(v => String(v || '').includes(String(conditionValue || '')))
      case 'notContains':
        return !fieldValue.some(v => String(v || '').includes(String(conditionValue || '')))
      default:
        return fieldValue.includes(conditionValue)
    }
  }

  // Evaluate condition based on operator for non-array values
  switch (operator) {
    case 'equals':
      // Handle boolean vs string comparison
      if (typeof fieldValue === 'boolean' && typeof conditionValue === 'string') {
        return fieldValue === (conditionValue.toLowerCase() === 'yes' || conditionValue.toLowerCase() === 'true')
      }
      if (typeof conditionValue === 'boolean' && typeof fieldValue === 'string') {
        return (fieldValue.toLowerCase() === 'yes' || fieldValue.toLowerCase() === 'true') === conditionValue
      }
      return fieldValue === conditionValue
    case 'notEquals':
      // Handle boolean vs string comparison
      if (typeof fieldValue === 'boolean' && typeof conditionValue === 'string') {
        return fieldValue !== (conditionValue.toLowerCase() === 'yes' || conditionValue.toLowerCase() === 'true')
      }
      if (typeof conditionValue === 'boolean' && typeof fieldValue === 'string') {
        return (fieldValue.toLowerCase() === 'yes' || fieldValue.toLowerCase() === 'true') !== conditionValue
      }
      return fieldValue !== conditionValue
    case 'contains':
      return String(fieldValue || '').includes(String(conditionValue || ''))
    case 'notContains':
      return !String(fieldValue || '').includes(String(conditionValue || ''))
    default:
      return fieldValue === conditionValue
  }
}

/**
 * Check if field is a searchable UUID field (for entity selection)
 */
export const isSearchableUuidField = (fieldName: string, schema: any): boolean => {
  const employeeTimeFields = ['substituteEmployee', 'approverId', 'employee']
  const crmFields = ['ownerEmployee', 'account', 'contact', 'lead', 'opportunity', 'assignedEmployee']
  const irmFields = ['ownerEmployee', 'investmentAccount', 'contact']
  const searchableUuidFields = [...employeeTimeFields, ...crmFields, ...irmFields]

  return (
    searchableUuidFields.includes(fieldName) ||
    (schema?.format === 'uuid' &&
      ((fieldName.toLowerCase().includes('employee') &&
        (fieldName.toLowerCase().includes('substitute') ||
          fieldName.toLowerCase().includes('owner') ||
          fieldName.toLowerCase().includes('assigned'))) ||
        fieldName.toLowerCase().includes('approver') ||
        fieldName.toLowerCase().includes('account') ||
        fieldName.toLowerCase().includes('contact') ||
        fieldName.toLowerCase().includes('lead') ||
        fieldName.toLowerCase().includes('opportunity'))) ||
    fieldName.toLowerCase() === 'substituteemployee' ||
    (fieldName.toLowerCase().includes('substitute') && fieldName.toLowerCase().includes('employee'))
  )
}

/**
 * Check if field should be skipped (technical/internal fields)
 */
export const shouldSkipField = (fieldName: string, schema: any, isSearchableUuid: boolean): boolean => {
  const skipFields = [
    'id',
    'code',
    'version',
    'businessKey',
    'additionalProperties',
    'changeMode',
    'activeTo',
    'recordState',
    'approverId',
    'employeeDocument',
    'workingHours',
    'workingDays',
    'calendarDays',
    'effectiveDays',
    'balance',
    'status'
  ]

  return (
    skipFields.includes(fieldName) ||
    (schema.format === 'uuid' && !isSearchableUuid) ||
    // Don't skip array fields - they should be rendered
    (fieldName.toLowerCase().includes('id') && !isSearchableUuid) ||
    fieldName.toLowerCase().includes('absencetype')
  )
}

/**
 * Extract field type from schema (handles union types, oneOf, etc.)
 */
export const extractFieldType = (schema: any): string | undefined => {
  const rawFieldType = schema?.type
  if (Array.isArray(rawFieldType)) {
    return rawFieldType.find(type => typeof type === 'string' && type !== 'null') ?? rawFieldType[0]
  }
  if (rawFieldType === 'array') {
    return 'array'
  }
  if (rawFieldType) {
    return rawFieldType
  }
  if (schema?.oneOf || schema?.enum) {
    return 'string'
  }
  if (schema?.properties) {
    return 'object'
  }
  if (schema?.items) {
    return 'array'
  }
  return undefined
}

/**
 * Format flow name for display
 * Removes "save" prefix if present (since operation is shown in badge)
 */
export const formatFlowName = (flowName: string): string => {
  if (!flowName) return ''

  // Remove "save" prefix (case-insensitive) before formatting
  let formatted = flowName
  const lowerFlowName = flowName.toLowerCase().trim()
  if (lowerFlowName.startsWith('save')) {
    // Remove "save" prefix (preserving original case)
    formatted = flowName.substring(4).trim()
    // Also remove any leading underscore or space after "save"
    formatted = formatted.replace(/^[_\s]+/, '')
  }

  return formatted
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
}

/**
 * Extract operation type from flow name (Create, Update, Delete)
 */
export const extractOperation = (flowName: string): string | null => {
  if (!flowName) return null
  const lower = flowName.toLowerCase()
  if (lower.includes('create') || lower.includes('add') || lower.includes('new')) return 'Create'
  if (lower.includes('update') || lower.includes('edit') || lower.includes('modify')) return 'Update'
  if (lower.includes('delete') || lower.includes('remove')) return 'Delete'
  return null
}
