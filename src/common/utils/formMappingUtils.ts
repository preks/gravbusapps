import { z } from 'zod'

/**
 * Checks if a value is an ISO datetime string (e.g., "2024-01-15T00:00:00Z" or "2024-01-15T00:00:00")
 */
function isISODateTimeString(value: any): boolean {
  if (typeof value !== 'string') return false
  // Matches ISO datetime format: YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss with optional timezone
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)
}

/**
 * Transforms ISO datetime string to date-only string for form inputs
 * "2024-01-15T00:00:00Z" → "2024-01-15"
 */
function transformDateForForm(value: string): string {
  if (!value) return ''
  // Remove time part: "2024-01-15T00:00:00Z" → "2024-01-15"
  return value.split('T')[0]
}

/**
 * Automatically maps entity to form values by matching field names.
 * Only includes fields that exist in both the entity and the schema.
 * Handles automatic type conversions:
 * - ISO datetime strings → date-only strings (for date inputs)
 * - numbers → strings (for number inputs)
 */
export function mapToFormValues<TEntity extends Record<string, any>, TSchema extends z.ZodObject<any>>(
  entity: TEntity | null,
  schema: TSchema,
  transformations?: Partial<Record<keyof TEntity, (value: any) => any>>,
  defaultValues?: Partial<z.infer<TSchema>>
): Partial<z.infer<TSchema>> {
  if (!entity) {
    return defaultValues || {}
  }

  const schemaKeys = Object.keys(schema.shape)
  const result: any = { ...defaultValues }

  for (const key of schemaKeys) {
    if (key in entity) {
      const value = entity[key]
      const schemaField = schema.shape[key]

      // Apply custom transformation if provided (takes precedence)
      if (transformations && key in transformations) {
        result[key] = transformations[key as keyof TEntity]?.(value)
      }
      // Automatic date transformation: ISO datetime → date-only string
      else if (isISODateTimeString(value)) {
        result[key] = transformDateForForm(value)
      }
      // Automatic number → string transformation (for form inputs)
      // BUT: Keep numbers as numbers if schema expects number type (e.g., version from BaseEntity)
      else if (typeof value === 'number') {
        // Check if schema field is z.number() or z.number().optional()
        const isNumberType =
          schemaField instanceof z.ZodNumber ||
          (schemaField instanceof z.ZodOptional && schemaField._def.innerType instanceof z.ZodNumber) ||
          (schemaField instanceof z.ZodNullable && schemaField._def.innerType instanceof z.ZodNumber)

        if (isNumberType) {
          // Schema expects number (e.g., version), keep it as number
          result[key] = value
        } else {
          // Schema expects string (for form inputs), convert to string
          result[key] = value.toString()
        }
      }
      // Default: use value as-is
      else {
        result[key] = value
      }
    }
  }

  return result
}

/**
 * Helper to create transformation map for common type conversions
 */
export const commonTransformations = {
  estimatedAmount: (value: number | undefined): string => value?.toString() || '',
  closeDate: (value: string | undefined): string => (value ? new Date(value).toISOString().split('T')[0] : ''),
  foundationDate: (value: string | undefined): string => (value ? value.split('T')[0] : '')
}
