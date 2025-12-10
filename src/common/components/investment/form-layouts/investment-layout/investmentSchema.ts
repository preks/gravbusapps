import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { DynamicFormConfiguration } from '@/components/dynamic-form/types'

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

// Base investment form schema - nested structure matching form state
// NOTE: Form state stores only the leaf InvestmentType ID in investment.investmentTypeId
const baseInvestmentSchema = z.object({
  // Main investment object (required)
  investment: z
    .object({
      id: z.string().optional(),
      version: z.number().optional(),
      name: z.string().min(1, 'Investment name is required'),
      ownerEmployeeId: z.string().min(1, 'Investment owner is required'),
      investmentStatus: catalogEntrySchema.optional(),
      code: z.string().nullable().optional(),
      currencyRef: z.string().min(1, 'Currency is required'),
      investmentAccountId: z.string().nullable().optional(), // Deprecated - use investmentAccounts instead
      // Investment-Account Junction Table (many-to-many)
      investmentAccounts: z
        .array(
          z.object({
            id: z.string().optional(),
            version: z.number().optional(),
            investmentAccountId: z.string().optional(),
            investmentAccountType: z.string().nullable().optional(),
            investmentAccountTypeRef: z.string().nullable().optional()
          })
        )
        .optional(),
      // Investment type field (leaf InvestmentType ID)
      investmentTypeId: z.string().min(1, 'Investment type is required'),
      // Optional opportunity ID (when creating investment from opportunity)
      investmentOpportunityId: z.string().nullable().optional(),
      // Optional company ID
      companyId: z.string().nullable().optional()
    })
    .catchall(z.any()),

  // Group-specific data (optional - one will be present based on group)
  equityInvestment: z.any().optional(),
  realEstateInvestment: z.any().optional(),
  liquidFundInvestment: z.any().optional()
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
    .min(1, errorMessage)
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

/**
 * Create validation rule for REF_ field types (required)
 */
const createRequiredRefRule = (field: { type: string; label: string }): z.ZodTypeAny => {
  const entityType = field.type.replace('REF_', '')
  if (entityType === 'InvestmentRole') {
    return createRequiredInvestmentRoleRule(`${field.label} is required`)
  }
  // Default: Single reference
  return z.union([
    z.string().min(1, `${field.label} is required`),
    z
      .object({
        id: z.string().min(1, `${field.label} is required`)
      })
      .catchall(z.any())
  ])
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
const createRequiredFieldRule = (field: { type: string; label: string }): z.ZodTypeAny => {
  const errorMessage = `${field.label} is required`

  switch (field.type) {
    case 'TEXT':
    case 'TEXTAREA':
      return z.string().min(1, errorMessage)
    case 'AMOUNT':
      return z.preprocess(
        numberPreprocess,
        z.number({ message: errorMessage }).min(0, `${field.label} must be positive`)
      )
    case 'PERCENTAGE':
      return z.preprocess(
        numberPreprocess,
        z
          .number({ message: errorMessage })
          .min(0, `${field.label} must be at least 0%`)
          .max(100, `${field.label} must be at most 100%`)
      )
    case 'NUMBER':
      return z.preprocess(numberPreprocess, z.number({ message: errorMessage }))
    case 'DATE':
    case 'DATETIME':
      return z.string().min(1, errorMessage)
    default:
      if (field.type.startsWith('CATALOG_')) {
        return catalogEntrySchema.refine(val => val, { message: errorMessage })
      }
      if (field.type.startsWith('REF_')) {
        return createRequiredRefRule(field)
      }
      return z.string().min(1, errorMessage)
  }
}

/**
 * Create validation rule for optional fields
 */
const createOptionalFieldRule = (field: { type: string; label: string }): z.ZodTypeAny => {
  switch (field.type) {
    case 'TEXT':
    case 'TEXTAREA':
      return z.string().optional()
    case 'AMOUNT':
      return z.preprocess(numberPreprocess, z.number().min(0, `${field.label} must be positive`).optional())
    case 'PERCENTAGE':
      return z.preprocess(
        numberPreprocess,
        z
          .number()
          .min(0, `${field.label} must be at least 0%`)
          .max(100, `${field.label} must be at most 100%`)
          .optional()
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
  liquidFundInvestmentFields: Record<string, z.ZodTypeAny>
): void => {
  if (!formFieldsDefinition?.formFields) return

  for (const group of formFieldsDefinition.formFields) {
    for (const field of group.fields) {
      const fieldName = getPropertyName(field.property)
      const parts = fieldName.split('.')
      const parentObject = parts[0]
      const fieldPath = parts.slice(1).join('.')

      if (!fieldPath) continue

      const validationRule = field.required ? createRequiredFieldRule(field) : createOptionalFieldRule(field)
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
  liquidFundInvestmentFields: Record<string, z.ZodTypeAny>
) => {
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
        : z.any().optional()
  })
}

export const createDynamicInvestmentSchema = (formFieldsDefinition?: DynamicFormConfiguration) => {
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
      liquidFundInvestmentFields
    )
  }

  return buildExtendedSchema(
    investmentFields,
    equityInvestmentFields,
    realEstateInvestmentFields,
    liquidFundInvestmentFields
  )
}

/**
 * Creates a zodResolver with the dynamic schema
 */
export const createInvestmentFormResolver = (formFieldsDefinition?: DynamicFormConfiguration) => {
  const schema = createDynamicInvestmentSchema(formFieldsDefinition)

  // Debug: Uncomment to see schema creation

  return zodResolver(schema)
}

// Base investment schema - can be extended by forms
export const investmentSchema = createDynamicInvestmentSchema()

// Export schema types
export type InvestmentSchema = z.infer<typeof investmentSchema>
export type InvestmentFormSchema = z.infer<ReturnType<typeof createDynamicInvestmentSchema>>
