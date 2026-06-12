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
const SEARCHABLE_DATA_SOURCE_TYPES = new Set(['CUSTOM_ENTITY', 'INTERNAL_ENTITY'])

export const isSearchableUuidField = (fieldName: string, schema: any): boolean => {
  // Flow engine / custom flows: entity picker from schema extension
  if (SEARCHABLE_DATA_SOURCE_TYPES.has(schema?.['x-dataSource']?.type) && schema?.['x-dataSource']?.entity) {
    return true
  }

  const employeeTimeFields = ['substituteEmployee', 'approverId', 'employee']
  const crmFields = ['ownerEmployee', 'account', 'contact', 'lead', 'opportunity', 'assignedEmployee']
  const irmFields = ['ownerEmployee', 'investmentAccount', 'contact']
  const feedbackFields = ['employeeId', 'senderEmployeeId']
  const searchableUuidFields = [...employeeTimeFields, ...crmFields, ...irmFields, ...feedbackFields]

  return (
    searchableUuidFields.includes(fieldName) ||
    (schema?.format === 'uuid' &&
      ((fieldName.toLowerCase().includes('employee') &&
        (fieldName.toLowerCase().includes('substitute') ||
          fieldName.toLowerCase().includes('owner') ||
          fieldName.toLowerCase().includes('assigned'))) ||
        fieldName.toLowerCase() === 'employeeid' ||
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
 * Convert a camelCase or snake_case field key to a human-readable label.
 */
export const formatFieldName = (key: string): string => {
  if (!key) return ''
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
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

const FLOW_OBJECT_KEY_EXCLUSIONS = new Set(['changeMode', 'id', 'version', 'businessKey'])

type FlowProposalSourceType = 'flow' | 'task'

export type FlowProposalFormResolution = {
  initialValues: Record<string, unknown>
  objectKey: string | null
  sourceType: FlowProposalSourceType | null
}

export type ResolvedFlowProposalSchema = {
  type: 'object'
  properties: Record<string, unknown>
  required?: string[]
}

/**
 * Find the primary nested entity object inside flow/task arguments.
 */
export const findNestedFlowObjectKey = (data: Record<string, unknown>): string | null => {
  return (
    Object.keys(data).find(
      key =>
        typeof data[key] === 'object' &&
        data[key] !== null &&
        !Array.isArray(data[key]) &&
        !FLOW_OBJECT_KEY_EXCLUSIONS.has(key)
    ) ?? null
  )
}

/**
 * Resolve initial form values and the nested entity key from a flow proposal payload.
 */
export const resolveFlowProposalFormResolution = (
  argumentsData:
    | {
        flow?: Record<string, unknown>
        task?: Record<string, unknown>
      }
    | null
    | undefined
): FlowProposalFormResolution => {
  const flowData = (argumentsData?.flow ?? {}) as Record<string, unknown>
  const taskData = (argumentsData?.task ?? {}) as Record<string, unknown>

  const taskObjectKey = findNestedFlowObjectKey(taskData)
  if (taskObjectKey && taskData[taskObjectKey] && typeof taskData[taskObjectKey] === 'object') {
    return {
      initialValues: { ...(taskData[taskObjectKey] as Record<string, unknown>) },
      objectKey: taskObjectKey,
      sourceType: 'task'
    }
  }

  const flowObjectKey = findNestedFlowObjectKey(flowData)
  if (flowObjectKey && flowData[flowObjectKey] && typeof flowData[flowObjectKey] === 'object') {
    return {
      initialValues: { ...(flowData[flowObjectKey] as Record<string, unknown>) },
      objectKey: flowObjectKey,
      sourceType: 'flow'
    }
  }

  const restFlowData = { ...flowData }
  delete restFlowData.changeMode

  return {
    initialValues: restFlowData,
    objectKey: null,
    sourceType: 'flow'
  }
}

/**
 * Resolve the JSON schema used to render a flow proposal form.
 * Nested entities live under flow.properties.<objectKey>, not at the wrapper root.
 */
export const resolveFlowProposalSchema = (
  flowSchema: { properties?: Record<string, unknown>; required?: string[] } | null | undefined,
  objectKey: string | null,
  sourceType: FlowProposalSourceType | null
): ResolvedFlowProposalSchema => {
  if (!flowSchema?.properties) {
    return { type: 'object', properties: {} }
  }

  const schemaProps = flowSchema.properties

  if (objectKey && sourceType === 'task') {
    const taskSection = schemaProps.task as { properties?: Record<string, unknown> } | undefined
    const nested = taskSection?.properties?.[objectKey] as
      | { properties?: Record<string, unknown>; required?: string[] }
      | undefined
    if (nested?.properties) {
      return {
        type: 'object',
        properties: nested.properties,
        required: nested.required
      }
    }
  }

  if (objectKey && sourceType === 'flow') {
    const flowSection = schemaProps.flow as { properties?: Record<string, unknown> } | undefined
    const nested = flowSection?.properties?.[objectKey] as
      | { properties?: Record<string, unknown>; required?: string[] }
      | undefined
    if (nested?.properties) {
      return {
        type: 'object',
        properties: { ...nested.properties },
        required: nested.required
      }
    }
  }

  const restProps = { ...schemaProps }
  delete restProps.changeMode
  delete restProps.reason
  delete restProps.meta
  return {
    type: 'object',
    properties: restProps,
    required: flowSchema.required
  }
}

/**
 * Enrich nested-entity initial values with sibling flow fields referenced by the schema.
 */
export const enrichNestedFlowInitialValues = (
  initialValues: Record<string, unknown>,
  objectKey: string,
  flowData: Record<string, unknown>,
  schema: ResolvedFlowProposalSchema
): Record<string, unknown> => {
  const enriched = { ...initialValues }
  for (const fieldName of Object.keys(schema.properties ?? {})) {
    if (enriched[fieldName] !== undefined) continue
    if (flowData[fieldName] !== undefined) {
      enriched[fieldName] = flowData[fieldName]
    }
  }
  return enriched
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
