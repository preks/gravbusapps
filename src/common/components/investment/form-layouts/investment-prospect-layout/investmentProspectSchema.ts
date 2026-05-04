import { z } from 'zod'
import { DynamicFormConfiguration } from '@/components/dynamic-form/types'

type ValidationTranslator = (key: string, args?: Record<string, unknown>) => string

interface ProspectValidationMessages {
  investmentNameRequired: string
  investmentTypeRequired: string
  required: (field: string) => string
  positive: (field: string) => string
  percentageMin: (field: string) => string
  percentageMax: (field: string) => string
}

const translateValidationMessage = (
  translator: ValidationTranslator | undefined,
  key: string,
  defaultValue: string,
  args?: Record<string, unknown>
): string => {
  if (!translator) {
    return defaultValue
  }

  return translator(key, { defaultValue, ...(args || {}) }) || defaultValue
}

const createValidationMessages = (translator?: ValidationTranslator): ProspectValidationMessages => ({
  investmentNameRequired: translateValidationMessage(
    translator,
    'validation-investment-name-required',
    'Investment Name is required'
  ),
  investmentTypeRequired: translateValidationMessage(
    translator,
    'validation-investment-type-required',
    'Investment type is required'
  ),
  required: field =>
    translateValidationMessage(translator, 'validation-field-required', `${field} is required`, { field }),
  positive: field =>
    translateValidationMessage(translator, 'validation-field-positive', `${field} must be positive`, { field }),
  percentageMin: field =>
    translateValidationMessage(translator, 'validation-percentage-min', `${field} must be at least 0%`, { field }),
  percentageMax: field =>
    translateValidationMessage(translator, 'validation-percentage-max', `${field} must be at most 100%`, { field })
})

const createRequiredStringRule = (errorMessage: string): z.ZodTypeAny =>
  z.string({ message: errorMessage }).min(1, errorMessage)

const hasRequiredObjectId = (value: unknown): boolean => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const id = (value as { id?: unknown }).id
  return typeof id === 'string' && id.length > 0
}

const hasRequiredSelectionValue = (value: unknown): boolean => {
  if (typeof value === 'string') {
    return value.length > 0
  }

  return hasRequiredObjectId(value)
}

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
  return z.any().refine(hasRequiredSelectionValue, { message: errorMessage })
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
  return z.any().refine(hasRequiredSelectionValue, { message: errorMessage })
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
const createRequiredFieldRule = (
  field: { type: string; label: string },
  messages: ProspectValidationMessages
): z.ZodTypeAny => {
  const errorMessage = messages.required(field.label)

  switch (field.type) {
    case 'TEXT':
    case 'TEXTAREA':
      return createRequiredStringRule(errorMessage)
    case 'AMOUNT':
      return z.preprocess(preprocessNumber, z.number({ message: errorMessage }).min(0, messages.positive(field.label)))
    case 'PERCENTAGE':
      return z.preprocess(
        preprocessNumber,
        z
          .number({ message: errorMessage })
          .min(0, messages.percentageMin(field.label))
          .max(100, messages.percentageMax(field.label))
      )
    case 'NUMBER':
      return z.preprocess(preprocessNumber, z.number({ message: errorMessage }))
    case 'DATE':
    case 'DATETIME':
      return createRequiredStringRule(errorMessage)
    default:
      if (field.type.startsWith('CATALOG_')) {
        return createRequiredCatalogRule(errorMessage)
      }
      if (field.type.startsWith('REF_')) {
        return createRequiredReferenceRule(errorMessage)
      }
      return createRequiredStringRule(errorMessage)
  }
}

/**
 * Creates validation rule for optional fields
 */
const createOptionalFieldRule = (
  field: { type: string; label: string },
  messages: ProspectValidationMessages
): z.ZodTypeAny => {
  switch (field.type) {
    case 'TEXT':
    case 'TEXTAREA':
      return z.string().optional()
    case 'AMOUNT':
      return z
        .preprocess(preprocessNumberOptional, z.number().min(0, messages.positive(field.label)).nullable())
        .optional()
    case 'PERCENTAGE':
      return z
        .preprocess(
          preprocessNumberOptional,
          z
            .number()
            .min(0, messages.percentageMin(field.label))
            .max(100, messages.percentageMax(field.label))
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
  existingFields?: Set<string>,
  translator?: ValidationTranslator
): Record<string, z.ZodTypeAny> => {
  const messages = createValidationMessages(translator)
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
      const validationRule = field.required
        ? createRequiredFieldRule(field, messages)
        : createOptionalFieldRule(field, messages)

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
  formFieldsDefinition?: DynamicFormConfiguration | null,
  translator?: ValidationTranslator
) => {
  const existingFields = new Set(Object.keys(baseSchema.shape))
  const dynamicFields = createDynamicInvestmentProspectSchema(formFieldsDefinition, existingFields, translator)

  const extendedSchema = Object.keys(dynamicFields).length > 0 ? baseSchema.extend(dynamicFields) : baseSchema

  return extendedSchema
}

/**
 * Creates investment prospect schema for Lead forms
 * Extends leadSchema with investmentTypeId (leaf InvestmentType ID)
 * investmentTypeId is the single source of truth - group/type are derived from it
 */
export const createInvestmentLeadSchema = (baseLeadSchema: z.ZodObject<any>, translator?: ValidationTranslator) => {
  const messages = createValidationMessages(translator)

  return baseLeadSchema.extend({
    investmentName: createRequiredStringRule(messages.investmentNameRequired),
    investmentTypeId: createRequiredStringRule(messages.investmentTypeRequired)
  })
}

/**
 * Creates investment prospect schema for Opportunity forms
 * Extends opportunitySchema with investmentTypeId (leaf InvestmentType ID)
 * investmentTypeId is the single source of truth - group/type are derived from it
 */
export const createInvestmentOpportunitySchema = (
  baseOpportunitySchema: z.ZodObject<any>,
  translator?: ValidationTranslator
) => {
  const messages = createValidationMessages(translator)

  return baseOpportunitySchema.extend({
    investmentName: createRequiredStringRule(messages.investmentNameRequired),
    investmentTypeId: createRequiredStringRule(messages.investmentTypeRequired)
  })
}
