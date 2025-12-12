/**
 * Generic Payload Builder Utilities
 * Shared payload generation logic for all entity types (Account, Contact, Lead, Opportunity, etc.)
 */

import { toISOFormat } from '@/common/utils/dateFormatter'

/**
 * Helper function to convert value to string or undefined
 * Ensures empty values are not included in payload
 */
export const toStringOrUndefined = (value: any): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  return String(value)
}

/**
 * Recursively transform fields ending with "Id" to remove the suffix
 * Example: accountId → account, contactId → contact
 * Preserves "id" and "version" fields as-is
 */
const transformIdFields = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(item => transformIdFields(item))
  }

  if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
    const transformed: any = {}

    for (const [key, val] of Object.entries(value)) {
      // Transform key: accountId → account, contactId → contact
      // But preserve "id" and "version" fields
      const newKey = key.endsWith('Id') && key !== 'id' ? key.slice(0, -2) : key

      // Recursively transform nested values
      transformed[newKey] = transformIdFields(val)
    }

    return transformed
  }

  return value
}

/**
 * Determines the type of a value for transformation
 */
const getValueType = (value: any): 'date' | 'array' | 'object' | 'primitive' => {
  if (value instanceof Date) return 'date'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object' && value !== null) return 'object'
  return 'primitive'
}

/**
 * Transforms a date value to ISO format
 */
const transformDateValue = (value: Date): string | undefined => {
  return toISOFormat(value.toISOString())
}

/**
 * Transforms an array value
 */
const transformArrayValue = (value: any): any => {
  // Arrays: Empty array [] means explicit deletion - include it in payload
  // null/undefined means not set - ignore it
  if (value === null || value === undefined) {
    return undefined
  }
  // Empty array [] should be included for explicit deletions
  return transformIdFields(value)
}

/**
 * Transforms an object value
 */
const transformObjectValue = (value: any): any => {
  // Objects: Transform Id fields and include only if not empty
  return Object.keys(value).length > 0 ? transformIdFields(value) : undefined
}

/**
 * Transforms a primitive value
 */
const transformPrimitiveValue = (value: any): any => {
  // Primitives: Keep numbers and booleans as-is, convert others to string or undefined
  if (typeof value === 'number') {
    return Number.isNaN(value) ? undefined : value
  }
  if (typeof value === 'boolean') {
    return value
  }
  return toStringOrUndefined(value)
}

/**
 * Transforms a value based on its type
 */
const transformValueByType = (value: any, valueType: 'date' | 'array' | 'object' | 'primitive'): any => {
  switch (valueType) {
    case 'date':
      return transformDateValue(value)
    case 'array':
      return transformArrayValue(value)
    case 'object':
      return transformObjectValue(value)
    case 'primitive':
      return transformPrimitiveValue(value)
    default:
      return undefined
  }
}

/**
 * Generic entity payload builder
 * Processes form fields with automatic type-based transformations
 *
 * Transformations are handled automatically:
 * - Dates → ISO format
 * - Arrays → included only if not empty, with Id field transformation
 * - Objects → included only if not empty, with Id field transformation
 * - Primitives → string or undefined
 *
 * @param entity - Partial entity object (Account, Contact, Lead, etc.)
 * @param formFields - Form field configuration (sourceKey → targetKey mapping)
 * @returns Payload object ready for API submission
 *
 * @example
 * ```typescript
 * const payload = buildPayload(
 *   account,
 *   AccountFormFields
 * )
 * ```
 */
export const buildPayload = <T extends Record<string, any>>(entity: Partial<T>, formFields: Record<string, string>) => {
  const payload: any = {}

  // Explicitly include id and version if present
  if (entity.id !== undefined) {
    payload.id = entity.id
  }
  if (entity.version !== undefined) {
    payload.version = entity.version
  }

  // Process all form fields
  for (const [sourceKey, targetKey] of Object.entries(formFields)) {
    const value: any = entity[sourceKey as keyof T]

    if (value === undefined) continue

    const valueType = getValueType(value)
    const transformedValue = transformValueByType(value, valueType)

    if (transformedValue !== undefined) {
      // Use targetKey directly from formFields configuration
      payload[targetKey] = transformedValue
    }
  }

  return payload
}
