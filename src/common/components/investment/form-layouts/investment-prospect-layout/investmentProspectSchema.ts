import { z } from 'zod'
import { DynamicFormConfiguration } from '@/components/dynamic-form/types'

/**
 * Preprocess function for number fields (required)
 * Handles empty strings, null, undefined, and converts valid numbers
 * Allows 0 as a valid value
 * Converts null to undefined for required fields
 */
const preprocessNumber = (val: any): number | undefined => {
  if (val === null || val === undefined || val === '') return undefined
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
  if (val === null) return null
  if (val === undefined || val === '') return undefined
  const num = Number(val)
  return Number.isNaN(num) ? undefined : num
}

/**
 * Catalog entry schema - accepts either string ID, catalog object, or null (for clearing)
 */
const catalogEntrySchema = z.union([
  z.string().min(1),
  z
    .object({
      id: z.string().min(1),
      code: z.string().optional(),
      value: z.string().optional()
    })
    .catchall(z.any()),
  z.null()
])

/**
 * Creates a catalog entry validation rule (required)
 */
const createRequiredCatalogRule = (errorMessage: string): z.ZodTypeAny => {
  return catalogEntrySchema.refine(val => val !== null && val !== undefined, {
    message: errorMessage
  })
}

/**
 * Creates a catalog entry validation rule (optional)
 */
const createOptionalCatalogRule = (): z.ZodTypeAny => {
  return catalogEntrySchema.optional()
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
        .catchall(z.any())
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
        .catchall(z.any())
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
      return z.string().nullable().optional()
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
 * Helper function to convert property path to field name
 * For prospect fields, properties are flat (not nested like investment.*)
 */
const getPropertyName = (property: string): string => {
  return property
}

/**
 * Creates a dynamic Zod schema based on the form fields definition from catalog
 * For prospect fields, all fields are at root level (not nested)
 */
export const createDynamicInvestmentProspectSchema = (
  formFieldsDefinition?: DynamicFormConfiguration | null,
  existingFields?: Set<string>
): Record<string, z.ZodTypeAny> => {
  const dynamicFields: Record<string, z.ZodTypeAny> = {}

  if (!formFieldsDefinition?.formFields || formFieldsDefinition.formFields.length === 0) {
    return dynamicFields
  }

  for (const group of formFieldsDefinition.formFields) {
    for (const field of group.fields) {
      // Use full property path
      const fieldName = getPropertyName(field.property)

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

/**
 * Creates a resolver function for investment prospect forms
 */
export const createInvestmentProspectFormResolver = (
  baseSchema: z.ZodObject<any>,
  formFieldsDefinition?: DynamicFormConfiguration | null
) => {
  const existingFields = new Set(Object.keys(baseSchema.shape))
  const dynamicFields = createDynamicInvestmentProspectSchema(formFieldsDefinition, existingFields)

  const extendedSchema = Object.keys(dynamicFields).length > 0 ? baseSchema.extend(dynamicFields) : baseSchema

  return extendedSchema
}

/**
 * Creates investment prospect schema for Lead forms
 * Extends leadSchema with investmentTypeId (leaf InvestmentType ID)
 */
export const createInvestmentLeadSchema = (baseLeadSchema: z.ZodObject<any>) => {
  return baseLeadSchema.extend({
    investmentName: z.string().min(1, 'Investment Name is required'),
    investmentTypeId: z.string().min(1, 'Investment type is required')
  })
}

/**
 * Creates investment prospect schema for Opportunity forms
 * Extends opportunitySchema with investmentTypeId (leaf InvestmentType ID)
 */
export const createInvestmentOpportunitySchema = (baseOpportunitySchema: z.ZodObject<any>) => {
  return baseOpportunitySchema.extend({
    investmentName: z.string().min(1, 'Investment Name is required'),
    investmentTypeId: z.string().min(1, 'Investment type is required')
  })
}
