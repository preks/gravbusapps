import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormFieldsDefinition } from '../queries/InvestmentCatalogQueries'

// Catalog entry schema - accepts either string ID, catalog object, or null (for clearing)
const catalogEntrySchema = z.union([
  z.string().min(1),
  z
    .object({
      id: z.string().min(1),
      code: z.string().optional(),
      value: z.string().optional()
    })
    .passthrough(),
  z.null()
])

// Account reference schema - accepts either string ID, account object, or null (for clearing)
const accountRefSchema = z.union([
  z.string().min(1),
  z
    .object({
      id: z.string().min(1),
      name: z.string().optional()
    })
    .passthrough(),
  z.null()
])

// Base investment form schema - nested structure matching form state
// NOTE: Form state stores full objects for catalog/entity fields
const baseInvestmentSchema = z
  .object({
    // Main investment object (required)
    investment: z
      .object({
        id: z.string().optional(),
        version: z.number().optional(),
        name: z.string().min(1, 'Investment name is required'),
        investmentGroup: catalogEntrySchema.optional().refine(val => val !== null && val !== undefined, {
          message: 'Investment group is required'
        }),
        ownerEmployeeId: z.string().min(1, 'Investment owner is required'),
        investmentStatus: catalogEntrySchema.optional(),
        code: z.string().optional(),
        currency: catalogEntrySchema
          .optional()
          .refine(val => val !== null && val !== undefined, { message: 'Currency is required' }),
        investmentAccount: accountRefSchema.optional().refine(val => val !== null && val !== undefined, {
          message: 'Related account is required'
        }),
        investmentType: catalogEntrySchema.optional().refine(val => val !== null && val !== undefined, {
          message: 'Investment type is required'
        })
      })
      .passthrough(),

    // Group-specific data (optional - one will be present based on group)
    equityInvestment: z.any().optional(),
    realEstateInvestment: z.any().optional(),
    liquidFundInvestment: z.any().optional()
  })
  .superRefine((data, ctx) => {
    // Check if investment group is LIQUID_FUND
    const investmentGroup = data.investment.investmentGroup as any
    const groupId = typeof investmentGroup === 'object' ? investmentGroup?.id : investmentGroup
    const groupCode = groupId?.split(':').pop()

    // If LIQUID_FUND group, require liquid fund type
    if (groupCode === 'LIQUID_FUND') {
      const liquidFundType = (data.liquidFundInvestment as any)?.investmentLiquidFundType
      if (!liquidFundType || liquidFundType === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Liquid fund type is required',
          path: ['liquidFundInvestment', 'investmentLiquidFundType']
        })
      }
    }
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
export const createDynamicInvestmentSchema = (formFieldsDefinition?: FormFieldsDefinition) => {
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
                  return isNaN(num) ? undefined : num
                },
                z.number({ message: errorMessage }).min(0, `${field.label} must be positive`)
              )
              break
            case 'PERCENTAGE':
              validationRule = z.preprocess(
                val => {
                  if (val === null || val === undefined || val === '') return undefined
                  const num = Number(val)
                  return isNaN(num) ? undefined : num
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
                  return isNaN(num) ? undefined : num
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
                    // Single account reference - accepts string or object
                    validationRule = z.union([
                      z.string().min(1, errorMessage),
                      z
                        .object({
                          id: z.string().min(1, errorMessage)
                        })
                        .passthrough()
                    ])
                    break
                  default:
                    // Default single reference - accepts string or object
                    validationRule = z.union([
                      z.string().min(1, errorMessage),
                      z
                        .object({
                          id: z.string().min(1, errorMessage)
                        })
                        .passthrough()
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
                  return isNaN(num) ? undefined : num
                },
                z.number().min(0, `${field.label} must be positive`).optional()
              )
              break
            case 'PERCENTAGE':
              validationRule = z.preprocess(
                val => {
                  if (val === null || val === undefined || val === '') return undefined
                  const num = Number(val)
                  return isNaN(num) ? undefined : num
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
                return isNaN(num) ? undefined : num
              }, z.number().optional())
              break
            case 'DATE':
            case 'DATETIME':
              validationRule = z.string().optional()
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
                    // Single account reference - accepts string or object
                    validationRule = z
                      .union([
                        z.string().optional(),
                        z
                          .object({
                            id: z.string().optional()
                          })
                          .passthrough()
                      ])
                      .optional()
                    break
                  default:
                    // Default single reference - accepts string or object
                    validationRule = z
                      .union([
                        z.string().optional(),
                        z
                          .object({
                            id: z.string().optional()
                          })
                          .passthrough()
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
  const extendedSchema = z
    .object({
      investment: baseInvestmentSchema.shape.investment.extend(investmentFields),
      equityInvestment:
        Object.keys(equityInvestmentFields).length > 0
          ? z.object(equityInvestmentFields).passthrough().optional()
          : z.any().optional(),
      realEstateInvestment:
        Object.keys(realEstateInvestmentFields).length > 0
          ? z.object(realEstateInvestmentFields).passthrough().optional()
          : z.any().optional(),
      liquidFundInvestment:
        Object.keys(liquidFundInvestmentFields).length > 0
          ? z.object(liquidFundInvestmentFields).passthrough().optional()
          : z.any().optional()
    })
    .superRefine((data, ctx) => {
      // Check if investment group is LIQUID_FUND
      const investmentGroup = data.investment.investmentGroup as any
      const groupId = typeof investmentGroup === 'object' ? investmentGroup?.id : investmentGroup
      const groupCode = groupId?.split(':').pop()

      // If LIQUID_FUND group, require liquid fund type
      if (groupCode === 'LIQUID_FUND') {
        const liquidFundType = (data.liquidFundInvestment as any)?.investmentLiquidFundType
        if (!liquidFundType || liquidFundType === null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Liquid fund type is required',
            path: ['liquidFundInvestment', 'investmentLiquidFundType']
          })
        }
      }
    })

  return extendedSchema
}

/**
 * Creates a zodResolver with the dynamic schema
 */
export const createInvestmentFormResolver = (formFieldsDefinition?: FormFieldsDefinition) => {
  const schema = createDynamicInvestmentSchema(formFieldsDefinition)

  // Debug: Uncomment to see schema creation

  return zodResolver(schema)
}

export type InvestmentFormSchema = z.infer<ReturnType<typeof createDynamicInvestmentSchema>>
