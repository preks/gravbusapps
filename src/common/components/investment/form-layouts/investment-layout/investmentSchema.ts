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
      investmentAccountId: z.string().min(1, 'Related account is required'),
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
 * Creates a dynamic Zod schema based on the form fields definition from catalog
 */
export const createDynamicInvestmentSchema = (formFieldsDefinition?: DynamicFormConfiguration) => {
  // Separate dynamic fields by their parent object
  const investmentFields: Record<string, z.ZodTypeAny> = {}
  const equityInvestmentFields: Record<string, z.ZodTypeAny> = {}
  const realEstateInvestmentFields: Record<string, z.ZodTypeAny> = {}
  const liquidFundInvestmentFields: Record<string, z.ZodTypeAny> = {}

  if (formFieldsDefinition?.formFields) {
    for (const group of formFieldsDefinition.formFields) {
      for (const field of group.fields) {
        // Use full property path
        const fieldName = getPropertyName(field.property)

        // Determine which nested object this field belongs to
        const parts = fieldName.split('.')
        const parentObject = parts[0] // "investment", "equityInvestment", etc.
        const fieldPath = parts.slice(1).join('.') // rest of the path

        // Skip if no field path (shouldn't happen)
        if (!fieldPath) continue

        // Build validation rule based on field type and required status
        let validationRule: z.ZodTypeAny

        if (field.required) {
          const errorMessage = `${field.label} is required`

          switch (field.type) {
            case 'TEXT':
            case 'TEXTAREA':
              validationRule = z.string().min(1, errorMessage)
              break
            case 'AMOUNT':
              validationRule = z.preprocess(
                val => {
                  if (val === null || val === undefined || val === '') return undefined
                  const num = Number(val)
                  return Number.isNaN(num) ? undefined : num
                },
                z.number({ message: errorMessage }).min(0, `${field.label} must be positive`)
              )
              break
            case 'PERCENTAGE':
              validationRule = z.preprocess(
                val => {
                  if (val === null || val === undefined || val === '') return undefined
                  const num = Number(val)
                  return Number.isNaN(num) ? undefined : num
                },
                z
                  .number({ message: errorMessage })
                  .min(0, `${field.label} must be at least 0%`)
                  .max(100, `${field.label} must be at most 100%`)
              )
              break
            case 'NUMBER':
              validationRule = z.preprocess(
                val => {
                  if (val === null || val === undefined || val === '') return undefined
                  const num = Number(val)
                  return Number.isNaN(num) ? undefined : num
                },
                z.number({ message: errorMessage })
              )
              break
            case 'DATE':
            case 'DATETIME':
              validationRule = z.string().min(1, errorMessage)
              break
            default:
              if (field.type.startsWith('CATALOG_')) {
                validationRule = catalogEntrySchema.refine(val => val, { message: errorMessage })
              } else if (field.type.startsWith('REF_')) {
                // Handle different reference field types
                const entityType = field.type.replace('REF_', '')
                switch (entityType) {
                  case 'InvestmentRole':
                    // Array of investment roles
                    validationRule = z
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
                    break
                  case 'InvestmentAccount':
                  default:
                    // Single reference - accepts string or object
                    validationRule = z.union([
                      z.string().min(1, errorMessage),
                      z
                        .object({
                          id: z.string().min(1, errorMessage)
                        })
                        .catchall(z.any())
                    ])
                    break
                }
              } else {
                validationRule = z.string().min(1, errorMessage)
              }
              break
          }
        } else {
          // Optional fields
          switch (field.type) {
            case 'TEXT':
            case 'TEXTAREA':
              validationRule = z.string().optional()
              break
            case 'AMOUNT':
              validationRule = z.preprocess(
                val => {
                  if (val === null || val === undefined || val === '') return undefined
                  const num = Number(val)
                  return Number.isNaN(num) ? undefined : num
                },
                z.number().min(0, `${field.label} must be positive`).optional()
              )
              break
            case 'PERCENTAGE':
              validationRule = z.preprocess(
                val => {
                  if (val === null || val === undefined || val === '') return undefined
                  const num = Number(val)
                  return Number.isNaN(num) ? undefined : num
                },
                z
                  .number()
                  .min(0, `${field.label} must be at least 0%`)
                  .max(100, `${field.label} must be at most 100%`)
                  .optional()
              )
              break
            case 'NUMBER':
              validationRule = z.preprocess(val => {
                if (val === null || val === undefined || val === '') return undefined
                const num = Number(val)
                return Number.isNaN(num) ? undefined : num
              }, z.number().optional())
              break
            case 'DATE':
            case 'DATETIME':
              validationRule = z.string().nullable().optional()
              break
            default:
              if (field.type.startsWith('CATALOG_')) {
                validationRule = catalogEntrySchema.optional()
              } else if (field.type.startsWith('REF_')) {
                // Handle different reference field types
                const entityType = field.type.replace('REF_', '')
                switch (entityType) {
                  case 'InvestmentRole':
                    // Array of investment roles (optional)
                    validationRule = z
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
                    break
                  case 'InvestmentAccount':
                  default:
                    // Single reference - accepts string or object
                    validationRule = z
                      .union([
                        z.string().optional(),
                        z
                          .object({
                            id: z.string().optional()
                          })
                          .catchall(z.any())
                      ])
                      .optional()
                    break
                }
              } else {
                validationRule = z.string().optional()
              }
              break
          }
        }

        // Add to appropriate object based on parent
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
    }
  }

  // Extend base schema with dynamic fields
  // Note: We need to extract the base object schema before superRefine, extend it, then re-apply superRefine
  const extendedSchema = z.object({
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

  return extendedSchema
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
