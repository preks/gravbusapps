import { z } from 'zod'

/**
 * Automatically maps entity to form values by matching field names.
 * Only includes fields that exist in both the entity and the schema.
 * Handles automatic type conversions:
 * - Date objects → ISO strings
 * - numbers → strings (for form inputs)
 */
/**
 * Helper to unwrap ZodOptional or ZodNullable to get inner type (recursively)
 */
const unwrapZodType = (schemaField: z.ZodTypeAny): z.ZodTypeAny => {
  if (schemaField instanceof z.ZodOptional) {
    return unwrapZodType(schemaField.unwrap() as z.ZodTypeAny)
  }
  if (schemaField instanceof z.ZodNullable) {
    return unwrapZodType(schemaField.unwrap() as z.ZodTypeAny)
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

  // Convert Date objects to ISO strings (API might return Date objects)
  if (value instanceof Date) {
    return value.toISOString()
  }

  // Automatic number → string transformation (for form inputs)
  if (typeof value === 'number') {
    return transformNumberValue(value, schemaField)
  }

  // Default: use value as-is (strings, null, undefined, etc.)
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
      const transformedValue = transformFieldValue(value, key, schemaField, transformations)
      result[key] = transformedValue
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
