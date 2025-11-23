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

    // Determine value type and transform accordingly
    let transformedValue: any
    const valueType =
      value instanceof Date
        ? 'date'
        : Array.isArray(value)
          ? 'array'
          : typeof value === 'object' && value !== null
            ? 'object'
            : 'primitive'

    switch (valueType) {
      case 'date':
        // Dates: Convert to ISO format (toISOFormat expects a string)
        transformedValue = toISOFormat((value as Date).toISOString())
        break

      case 'array':
        // Arrays: Empty array [] means explicit deletion - include it in payload
        // null/undefined means not set - ignore it
        if (value === null || value === undefined) {
          transformedValue = undefined
        } else {
          // Empty array [] should be included for explicit deletions
          transformedValue = transformIdFields(value)
        }
        break

      case 'object':
        // Objects: Transform Id fields and include only if not empty
        transformedValue = Object.keys(value).length > 0 ? transformIdFields(value) : undefined
        break

      case 'primitive':
        // Primitives: Keep numbers as numbers, convert others to string or undefined
        if (typeof value === 'number') {
          transformedValue = isNaN(value) ? undefined : value
        } else {
          transformedValue = toStringOrUndefined(value)
        }
        break

      default:
        transformedValue = undefined
    }

    if (transformedValue !== undefined) {
      // Use targetKey directly from formFields configuration
      payload[targetKey] = transformedValue
    }
  }

  return payload
}
