import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { DynamicFormConfiguration } from '@/components/dynamic-form/types'

type ValidationTranslator = (key: string, args?: Record<string, unknown>) => string

interface InvestmentValidationMessages {
  investmentNameRequired: string
  investmentOwnerRequired: string
  currencyRequired: string
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

const createValidationMessages = (translator?: ValidationTranslator): InvestmentValidationMessages => ({
  investmentNameRequired: translateValidationMessage(
    translator,
    'validation-investment-name-required',
    'Investment name is required'
  ),
  investmentOwnerRequired: translateValidationMessage(
    translator,
    'validation-investment-owner-required',
    'Investment owner is required'
  ),
  currencyRequired: translateValidationMessage(translator, 'validation-currency-required', 'Currency is required'),
  required: field =>
    translateValidationMessage(translator, 'validation-field-required', `${field} is required`, { field }),
  positive: field =>
    translateValidationMessage(translator, 'validation-field-positive', `${field} must be positive`, { field }),
  percentageMin: field =>
    translateValidationMessage(translator, 'validation-percentage-min', `${field} must be at least 0%`, { field }),
  percentageMax: field =>
    translateValidationMessage(translator, 'validation-percentage-max', `${field} must be at most 100%`, { field })
})

// Catalog entry schema - accepts either string ID, catalog object, or null (for clearing)
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

const createBaseInvestmentSchema = (messages: InvestmentValidationMessages) =>
  z.object({
    // Main investment object (required)
    investment: z
      .object({
        id: z.string().optional(),
        version: z.number().optional(),
        name: createRequiredStringRule(messages.investmentNameRequired),
        ownerEmployeeId: createRequiredStringRule(messages.investmentOwnerRequired),
        investmentStatus: catalogEntrySchema.optional(),
        code: z.string().nullable().optional(),
        currencyRef: createRequiredStringRule(messages.currencyRequired),
        investmentAccountId: z.string().nullable().optional(), // Deprecated - use investmentAccounts instead
        // Investment-Account Junction Table (many-to-many)
        investmentAccounts: z
          .array(
            z
              .object({
                id: z.string().optional(),
                version: z.number().optional(),
                investmentId: z.string().optional(),
                investmentAccountId: z.string().optional(),
                investmentAccountTypeRef: z.string().nullable().optional(),
                investmentAccountType: catalogEntrySchema.optional(),
                investmentAccount: z.any().optional() // Nested account object from GraphQL
              })
              .catchall(z.any())
          )
          .optional(),
        // Investment type field (leaf InvestmentType ID) - optional for create flow
        investmentTypeId: z.string().nullable().optional(),
        // Optional opportunity ID (when creating investment from opportunity)
        investmentOpportunityId: z.string().nullable().optional(),
        // Optional investment company ID
        investmentCompanyId: z.string().nullable().optional()
      })
      .catchall(z.any()),

    // Group-specific data (optional - one will be present based on group)
    equityInvestment: z.any().optional(),
    realEstateInvestment: z.any().optional(),
    liquidFundInvestment: z.any().optional(),

    // Report-specific fields (for InvestmentReportForm)
    investmentReportDate: z.string().optional(),
    investmentReportScope: z.string().optional()
  })

// Helper function to convert property path to field name for nested structure
// With nested structure, we use the FULL property path as the field name
// Examples:
// - "investment.name" → "investment.name"
// - "equityInvestment.marketValue" → "equityInvestment.marketValue"
// - "liquidFundInvestment.additionalProperties.name" → "liquidFundInvestment.additionalProperties.name"
// NOTE: For CATALOG_ fields, property is WITHOUT "Ref" suffix in both config and form state
// IMPORTANT: This must match the naming logic in DynamicForm component
const getPropertyName = (property: string): string => {
  // Use the property path as-is (no Ref suffix manipulation needed)
  // Form state uses catalog fields WITHOUT "Ref" suffix
  return property
}

/**
 * Number preprocessing function for validation
 */
const numberPreprocess = (val: unknown): number | undefined => {
  if (val === null || val === undefined || val === '') return undefined
  const num = Number(val)
  return Number.isNaN(num) ? undefined : num
}

/**
 * Create validation rule for REF_InvestmentRole field (required)
 */
const createRequiredInvestmentRoleRule = (errorMessage: string): z.ZodTypeAny => {
  return z.preprocess(
    val => (Array.isArray(val) ? val : []),
    z
      .array(
        z.object({
          id: z.string().optional(),
          version: z.number().optional(),
          investmentRole: catalogEntrySchema,
          displayOrder: z.number(),
          isDeleted: z.boolean().optional()
        })
      )
      .min(1, errorMessage)
  )
}

/**
 * Create validation rule for REF_InvestmentRole field (optional)
 */
const createOptionalInvestmentRoleRule = (): z.ZodTypeAny => {
  return z
    .array(
      z.object({
        id: z.string().optional(),
        version: z.number().optional(),
        investmentRole: catalogEntrySchema,
        displayOrder: z.number(),
        isDeleted: z.boolean().optional()
      })
    )
    .optional()
}

const createRequiredCatalogRule = (errorMessage: string): z.ZodTypeAny =>
  z.any().refine(hasRequiredSelectionValue, { message: errorMessage })

/**
 * Create validation rule for REF_ field types (required)
 */
const createRequiredRefRule = (
  field: { type: string; label: string },
  messages: InvestmentValidationMessages
): z.ZodTypeAny => {
  const errorMessage = messages.required(field.label)
  const entityType = field.type.replace('REF_', '')
  if (entityType === 'InvestmentRole') {
    return createRequiredInvestmentRoleRule(errorMessage)
  }
  // Default: Single reference
  return z.any().refine(hasRequiredSelectionValue, { message: errorMessage })
}

/**
 * Create validation rule for REF_ field types (optional)
 */
const createOptionalRefRule = (): z.ZodTypeAny => {
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
 * Create validation rule for required fields
 */
const createRequiredFieldRule = (
  field: { type: string; label: string },
  messages: InvestmentValidationMessages
): z.ZodTypeAny => {
  const errorMessage = messages.required(field.label)

  switch (field.type) {
    case 'TEXT':
    case 'TEXTAREA':
      return createRequiredStringRule(errorMessage)
    case 'AMOUNT':
      return z.preprocess(numberPreprocess, z.number({ message: errorMessage }).min(0, messages.positive(field.label)))
    case 'PERCENTAGE':
      return z.preprocess(
        numberPreprocess,
        z
          .number({ message: errorMessage })
          .min(0, messages.percentageMin(field.label))
          .max(100, messages.percentageMax(field.label))
      )
    case 'NUMBER':
      return z.preprocess(numberPreprocess, z.number({ message: errorMessage }))
    case 'DATE':
    case 'DATETIME':
      return createRequiredStringRule(errorMessage)
    default:
      if (field.type.startsWith('CATALOG_')) {
        return createRequiredCatalogRule(errorMessage)
      }
      if (field.type.startsWith('REF_')) {
        return createRequiredRefRule(field, messages)
      }
      return createRequiredStringRule(errorMessage)
  }
}

/**
 * Create validation rule for optional fields
 */
const createOptionalFieldRule = (
  field: { type: string; label: string },
  messages: InvestmentValidationMessages
): z.ZodTypeAny => {
  switch (field.type) {
    case 'TEXT':
    case 'TEXTAREA':
      return z.string().optional()
    case 'AMOUNT':
      return z.preprocess(numberPreprocess, z.number().min(0, messages.positive(field.label)).optional())
    case 'PERCENTAGE':
      return z.preprocess(
        numberPreprocess,
        z.number().min(0, messages.percentageMin(field.label)).max(100, messages.percentageMax(field.label)).optional()
      )
    case 'NUMBER':
      return z.preprocess(numberPreprocess, z.number().optional())
    case 'DATE':
    case 'DATETIME':
      return z.string().nullable().optional()
    default:
      if (field.type.startsWith('CATALOG_')) {
        return catalogEntrySchema.optional()
      }
      if (field.type.startsWith('REF_')) {
        const entityType = field.type.replace('REF_', '')
        if (entityType === 'InvestmentRole') {
          return createOptionalInvestmentRoleRule()
        }
        return createOptionalRefRule()
      }
      return z.string().optional()
  }
}

/**
 * Add validation rule to appropriate parent object
 */
const addFieldToParent = (
  parentObject: string,
  fieldPath: string,
  validationRule: z.ZodTypeAny,
  investmentFields: Record<string, z.ZodTypeAny>,
  equityInvestmentFields: Record<string, z.ZodTypeAny>,
  realEstateInvestmentFields: Record<string, z.ZodTypeAny>,
  liquidFundInvestmentFields: Record<string, z.ZodTypeAny>
): void => {
  switch (parentObject) {
    case 'investment':
      investmentFields[fieldPath] = validationRule
      break
    case 'equityInvestment':
      equityInvestmentFields[fieldPath] = validationRule
      break
    case 'realEstateInvestment':
      realEstateInvestmentFields[fieldPath] = validationRule
      break
    case 'liquidFundInvestment':
      liquidFundInvestmentFields[fieldPath] = validationRule
      break
  }
}

/**
 * Creates a dynamic Zod schema based on the form fields definition from catalog
 */
/**
 * Process form fields and populate field objects
 */
const processFormFields = (
  formFieldsDefinition: DynamicFormConfiguration,
  investmentFields: Record<string, z.ZodTypeAny>,
  equityInvestmentFields: Record<string, z.ZodTypeAny>,
  realEstateInvestmentFields: Record<string, z.ZodTypeAny>,
  liquidFundInvestmentFields: Record<string, z.ZodTypeAny>,
  messages: InvestmentValidationMessages
): void => {
  if (!formFieldsDefinition?.formFields) return

  for (const group of formFieldsDefinition.formFields) {
    for (const field of group.fields) {
      const fieldName = getPropertyName(field.property)
      const parts = fieldName.split('.')
      const parentObject = parts[0]
      const fieldPath = parts.slice(1).join('.')

      if (!fieldPath) continue

      const validationRule = field.required
        ? createRequiredFieldRule(field, messages)
        : createOptionalFieldRule(field, messages)
      addFieldToParent(
        parentObject,
        fieldPath,
        validationRule,
        investmentFields,
        equityInvestmentFields,
        realEstateInvestmentFields,
        liquidFundInvestmentFields
      )
    }
  }
}

/**
 * Build extended schema with dynamic fields
 */
const buildExtendedSchema = (
  investmentFields: Record<string, z.ZodTypeAny>,
  equityInvestmentFields: Record<string, z.ZodTypeAny>,
  realEstateInvestmentFields: Record<string, z.ZodTypeAny>,
  liquidFundInvestmentFields: Record<string, z.ZodTypeAny>,
  messages: InvestmentValidationMessages
) => {
  const baseInvestmentSchema = createBaseInvestmentSchema(messages)

  return z.object({
    investment: baseInvestmentSchema.shape.investment.extend(investmentFields),
    equityInvestment:
      Object.keys(equityInvestmentFields).length > 0
        ? z.object(equityInvestmentFields).catchall(z.any()).optional()
        : z.any().optional(),
    realEstateInvestment:
      Object.keys(realEstateInvestmentFields).length > 0
        ? z.object(realEstateInvestmentFields).catchall(z.any()).optional()
        : z.any().optional(),
    liquidFundInvestment:
      Object.keys(liquidFundInvestmentFields).length > 0
        ? z.object(liquidFundInvestmentFields).catchall(z.any()).optional()
        : z.any().optional(),
    // Report-specific fields (for InvestmentReportForm) - preserve from base schema
    investmentReportDate: baseInvestmentSchema.shape.investmentReportDate,
    investmentReportScope: baseInvestmentSchema.shape.investmentReportScope
  })
}

export const createDynamicInvestmentSchema = (
  formFieldsDefinition?: DynamicFormConfiguration,
  translator?: ValidationTranslator
) => {
  const messages = createValidationMessages(translator)
  // Separate dynamic fields by their parent object
  const investmentFields: Record<string, z.ZodTypeAny> = {}
  const equityInvestmentFields: Record<string, z.ZodTypeAny> = {}
  const realEstateInvestmentFields: Record<string, z.ZodTypeAny> = {}
  const liquidFundInvestmentFields: Record<string, z.ZodTypeAny> = {}

  if (formFieldsDefinition) {
    processFormFields(
      formFieldsDefinition,
      investmentFields,
      equityInvestmentFields,
      realEstateInvestmentFields,
      liquidFundInvestmentFields,
      messages
    )
  }

  return buildExtendedSchema(
    investmentFields,
    equityInvestmentFields,
    realEstateInvestmentFields,
    liquidFundInvestmentFields,
    messages
  )
}

/**
 * Creates a zodResolver with the dynamic schema
 */
export const createInvestmentFormResolver = (
  formFieldsDefinition?: DynamicFormConfiguration,
  translator?: ValidationTranslator
) => {
  const schema = createDynamicInvestmentSchema(formFieldsDefinition, translator)

  // Debug: Uncomment to see schema creation

  return zodResolver(schema)
}

// Base investment schema - can be extended by forms
export const investmentSchema = createDynamicInvestmentSchema()

// Export schema types
export type InvestmentSchema = z.infer<typeof investmentSchema>
export type InvestmentFormSchema = z.infer<ReturnType<typeof createDynamicInvestmentSchema>>
