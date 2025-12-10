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
 * Checks if schema field is a nested ZodObject
 */
const isNestedObjectSchema = (schemaField: z.ZodTypeAny): boolean => {
  const unwrapped = unwrapZodType(schemaField)
  return unwrapped instanceof z.ZodObject
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
 * Configuration for array-to-object conversion
 */
export interface ArrayToObjectConfig {
  /**
   * Field names that should be converted from array[0] to object
   * Example: ['equityInvestment', 'realEstateInvestment'] will convert
   * entity.equityInvestment[0] → result.equityInvestment
   */
  arrayFields?: string[]
}

/**
 * Transforms a single field value, handling nested objects and arrays
 */
const transformFieldValue = (
  value: any,
  key: string,
  schemaField: z.ZodTypeAny,
  transformations?: Partial<Record<string, (value: any) => any>>,
  arrayToObjectConfig?: ArrayToObjectConfig
): any => {
  // Apply custom transformation if provided (takes precedence)
  if (transformations && key in transformations) {
    return transformations[key]?.(value)
  }

  // Handle array-to-object conversion (e.g., equityInvestment[0] → equityInvestment)
  if (arrayToObjectConfig?.arrayFields?.includes(key) && Array.isArray(value) && value.length > 0) {
    // Convert array[0] to object
    return value[0]
  }

  // Handle nested objects: recursively map if schema expects nested object
  if (
    isNestedObjectSchema(schemaField) &&
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  ) {
    const nestedSchema = unwrapZodType(schemaField) as z.ZodObject<any>
    // Recursively map nested structure
    return mapToFormValuesRecursive(value, nestedSchema, transformations, undefined, arrayToObjectConfig)
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

/**
 * Recursive helper for mapping nested structures
 */
const mapToFormValuesRecursive = <TEntity extends Record<string, any>, TSchema extends z.ZodObject<any>>(
  entity: TEntity | null,
  schema: TSchema,
  transformations?: Partial<Record<string, (value: any) => any>>,
  defaultValues?: Partial<z.infer<TSchema>>,
  arrayToObjectConfig?: ArrayToObjectConfig
): Partial<z.infer<TSchema>> => {
  if (!entity) {
    return defaultValues || {}
  }

  const schemaKeys = Object.keys(schema.shape)
  const result: any = { ...defaultValues }

  for (const key of schemaKeys) {
    if (key in entity) {
      const value = entity[key]
      const schemaField = schema.shape[key]
      const transformedValue = transformFieldValue(
        value,
        key,
        schemaField,
        transformations,
        arrayToObjectConfig,
        schema
      )
      result[key] = transformedValue
    }
  }

  return result
}

/**
 * Automatically maps entity to form values by matching field names.
 * Supports nested structures and optional array-to-object conversion.
 *
 * @param entity - The entity data to map (can be null)
 * @param schema - Zod schema defining the form structure (supports nested objects)
 * @param transformations - Optional custom transformations for specific fields
 * @param defaultValues - Optional default values to merge with mapped values
 * @param arrayToObjectConfig - Optional configuration for converting arrays to objects
 *
 * @example
 * // Simple flat mapping
 * mapToFormValues(account, accountSchema)
 *
 * @example
 * // Nested structure mapping
 * const schema = z.object({
 *   investment: z.object({
 *     name: z.string(),
 *     id: z.string()
 *   })
 * })
 * mapToFormValues(investmentData, schema)
 *
 * @example
 * // Array to object conversion
 * mapToFormValues(investmentData, schema, undefined, undefined, {
 *   arrayFields: ['equityInvestment', 'realEstateInvestment']
 * })
 * // Converts: entity.equityInvestment[0] → result.equityInvestment
 */
export function mapToFormValues<TEntity extends Record<string, any>, TSchema extends z.ZodObject<any>>(
  entity: TEntity | null,
  schema: TSchema,
  transformations?: Partial<Record<keyof TEntity, (value: any) => any>>,
  defaultValues?: Partial<z.infer<TSchema>>,
  arrayToObjectConfig?: ArrayToObjectConfig
): Partial<z.infer<TSchema>> {
  return mapToFormValuesRecursive(entity, schema, transformations, defaultValues, arrayToObjectConfig)
}

/**
 * Helper to create transformation map for common type conversions
 */
export const commonTransformations = {
  estimatedAmount: (value: number | undefined): string => value?.toString() || '',
  closeDate: (value: string | undefined): string => (value ? new Date(value).toISOString().split('T')[0] : ''),
  foundationDate: (value: string | undefined): string => (value ? value.split('T')[0] : '')
}
