import { z } from 'zod'
import { FormFieldsDefinition } from './useInvestmentProspectFields'

/**
 * Preprocess function for number fields (required)
 * Handles empty strings, null, undefined, and converts valid numbers
 * Allows 0 as a valid value
 * Converts null to undefined for required fields
 */
const preprocessNumber = (val: any): number | undefined => {
  // Handle empty/null/undefined
  if (val === null || val === undefined || val === '') return undefined
  // Convert to number - 0 is a valid value
  const num = Number(val)
  return Number.isNaN(num) ? undefined : num
}

/**
 * Preprocess function for number fields (optional)
 * Handles empty strings, null, undefined, and converts valid numbers
 * Allows 0 as a valid value
 * Preserves null for optional fields (to work with API null values)
 */
const preprocessNumberOptional = (val: any): number | null | undefined => {
  // Preserve null for optional fields (API may send null)
  if (val === null) return null
  // Handle empty/undefined
  if (val === undefined || val === '') return undefined
  // Convert to number - 0 is a valid value
  const num = Number(val)
  return Number.isNaN(num) ? undefined : num
}

/**
 * Creates a catalog entry validation rule (required)
 */
const createRequiredCatalogRule = (errorMessage: string): z.ZodTypeAny => {
  return z
    .union([
      z.string().min(1),
      z
        .object({
          id: z.string().min(1),
          code: z.string().optional(),
          value: z.string().optional()
        })
        .catchall(z.unknown()),
      z.null()
    ])
    .refine(val => val !== null && val !== undefined, {
      message: errorMessage
    })
}

/**
 * Creates a catalog entry validation rule (optional)
 */
const createOptionalCatalogRule = (): z.ZodTypeAny => {
  return z
    .union([
      z.string().min(1),
      z
        .object({
          id: z.string().min(1),
          code: z.string().optional(),
          value: z.string().optional()
        })
        .catchall(z.unknown()),
      z.null()
    ])
    .optional()
}

/**
 * Creates a reference field validation rule (required)
 */
const createRequiredReferenceRule = (errorMessage: string): z.ZodTypeAny => {
  return z
    .union([
      z.string().min(1, errorMessage),
      z
        .object({
          id: z.string().min(1, errorMessage)
        })
        .catchall(z.unknown())
    ])
    .refine(val => val !== null && val !== undefined, {
      message: errorMessage
    })
}

/**
 * Creates a reference field validation rule (optional)
 */
const createOptionalReferenceRule = (): z.ZodTypeAny => {
  return z
    .union([
      z.string().optional(),
      z
        .object({
          id: z.string().optional()
        })
        .catchall(z.unknown())
    ])
    .optional()
}

/**
 * Creates validation rule for required fields
 */
const createRequiredFieldRule = (field: { type: string; label: string }): z.ZodTypeAny => {
  const errorMessage = `${field.label} is required`

  switch (field.type) {
    case 'TEXT':
    case 'TEXTAREA':
      return z.string().min(1, errorMessage)
    case 'AMOUNT':
      return z.preprocess(
        preprocessNumber,
        z.number({ message: errorMessage }).min(0, `${field.label} must be positive`)
      )
    case 'PERCENTAGE':
      return z.preprocess(
        preprocessNumber,
        z
          .number({ message: errorMessage })
          .min(0, `${field.label} must be at least 0%`)
          .max(100, `${field.label} must be at most 100%`)
      )
    case 'NUMBER':
      return z.preprocess(preprocessNumber, z.number({ message: errorMessage }))
    case 'DATE':
    case 'DATETIME':
      return z.string().min(1, errorMessage)
    default:
      if (field.type.startsWith('CATALOG_')) {
        return createRequiredCatalogRule(errorMessage)
      }
      if (field.type.startsWith('REF_')) {
        return createRequiredReferenceRule(errorMessage)
      }
      return z.string().min(1, errorMessage)
  }
}

/**
 * Creates validation rule for optional fields
 */
const createOptionalFieldRule = (field: { type: string; label: string }): z.ZodTypeAny => {
  switch (field.type) {
    case 'TEXT':
    case 'TEXTAREA':
      return z.string().optional()
    case 'AMOUNT':
      return z
        .preprocess(preprocessNumberOptional, z.number().min(0, `${field.label} must be positive`).nullable())
        .optional()
    case 'PERCENTAGE':
      return z
        .preprocess(
          preprocessNumberOptional,
          z
            .number()
            .min(0, `${field.label} must be at least 0%`)
            .max(100, `${field.label} must be at most 100%`)
            .nullable()
        )
        .optional()
    case 'NUMBER':
      return z.preprocess(preprocessNumberOptional, z.number().nullable()).optional()
    case 'DATE':
    case 'DATETIME':
      return z.string().optional()
    default:
      if (field.type.startsWith('CATALOG_')) {
        return createOptionalCatalogRule()
      }
      if (field.type.startsWith('REF_')) {
        return createOptionalReferenceRule()
      }
      return z.string().optional()
  }
}

/**
 * Builds dynamic prospect field validations from FormFieldsDefinition
 * Returns only the dynamic fields as Record<string, z.ZodTypeAny>
 *
 * @param formFieldsDefinition - Prospect fields configuration from catalog
 * @param existingFields - Set of field names that already exist in schema (to skip)
 * @returns Record of dynamic field validations
 */
export const buildInvestmentProspectSchema = (
  formFieldsDefinition?: FormFieldsDefinition,
  existingFields?: Set<string>
): Record<string, z.ZodTypeAny> => {
  const dynamicFields: Record<string, z.ZodTypeAny> = {}

  if (!formFieldsDefinition?.formFields || formFieldsDefinition.formFields.length === 0) {
    return dynamicFields
  }

  for (const group of formFieldsDefinition.formFields) {
    for (const field of group.fields) {
      const fieldName = field.property

      // Skip if field already exists in schema
      if (existingFields?.has(fieldName)) {
        continue
      }

      // Build validation rule based on field type and required status
      const validationRule = field.required ? createRequiredFieldRule(field) : createOptionalFieldRule(field)

      dynamicFields[fieldName] = validationRule
    }
  }

  return dynamicFields
}
