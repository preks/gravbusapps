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
 * Generic entity payload builder
 * Processes form fields with automatic type-based transformations
 *
 * Transformations are handled automatically:
 * - Dates → ISO format
 * - Arrays → included only if not empty
 * - Objects → included only if not empty
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
 *   accountFormFields
 * )
 * ```
 */
export const buildPayload = <T extends Record<string, any>>(entity: Partial<T>, formFields: Record<string, string>) => {
  const payload: any = {}

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
        // Arrays: Include only if not empty
        transformedValue = (value as any[]).length > 0 ? value : undefined
        break

      case 'object':
        // Objects: Include only if not empty
        transformedValue = Object.keys(value).length > 0 ? value : undefined
        break

      case 'primitive':
        // Primitives: Convert to string or undefined
        transformedValue = toStringOrUndefined(value)
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
