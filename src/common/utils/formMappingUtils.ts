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
 * Transforms ISO datetime string for form inputs
 * - Date-only fields (dueDate, closeDate, birthDate, etc.): strip time
 * - Datetime fields (occurredAt, completedAt, reminderDate, etc.): preserve time
 */
function transformDateForForm(value: string, fieldName: string): string {
  if (!value) return ''

  // List of fields that should be date-only (no time component)
  const dateOnlyFields = ['dueDate', 'closeDate', 'birthDate', 'foundationDate', 'startDate', 'endDate']

  // If it's a date-only field, strip the time
  if (dateOnlyFields.includes(fieldName)) {
    return value.split('T')[0]
  }

  // Otherwise preserve the full datetime string
  return value
}

/**
 * Automatically maps entity to form values by matching field names.
 * Only includes fields that exist in both the entity and the schema.
 * Handles automatic type conversions:
 * - ISO datetime strings → date-only strings (for date inputs)
 * - numbers → strings (for number inputs)
 */
/**
 * Helper to unwrap ZodOptional or ZodNullable to get inner type
 */
const unwrapZodType = (schemaField: z.ZodTypeAny): z.ZodTypeAny => {
  if (schemaField instanceof z.ZodOptional) {
    return schemaField.unwrap()
  }
  if (schemaField instanceof z.ZodNullable) {
    return schemaField.unwrap()
  }
  return schemaField
}

/**
 * Checks if schema field expects a number type
 */
const isNumberSchemaType = (schemaField: z.ZodTypeAny): boolean => {
  const unwrapped = unwrapZodType(schemaField)
  return unwrapped instanceof z.ZodNumber
}

/**
 * Transforms a number value based on schema type
 */
const transformNumberValue = (value: number, schemaField: z.ZodTypeAny): any => {
  if (isNumberSchemaType(schemaField)) {
    // Schema expects number (e.g., version), keep it as number
    return value
  }
  // Schema expects string (for form inputs), convert to string
  return value.toString()
}

/**
 * Transforms a single field value
 */
const transformFieldValue = (
  value: any,
  key: string,
  schemaField: z.ZodTypeAny,
  transformations?: Partial<Record<string, (value: any) => any>>
): any => {
  // Apply custom transformation if provided (takes precedence)
  if (transformations && key in transformations) {
    return transformations[key]?.(value)
  }
  // Automatic date transformation: ISO datetime → date-only string or preserve datetime
  if (isISODateTimeString(value)) {
    return transformDateForForm(value, key)
  }
  // Automatic number → string transformation (for form inputs)
  if (typeof value === 'number') {
    return transformNumberValue(value, schemaField)
  }
  // Default: use value as-is
  return value
}

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
      result[key] = transformFieldValue(value, key, schemaField, transformations)
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
