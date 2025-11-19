import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { opportunitySchema } from '@/common/components/common-relations/form-layouts/opportunity-layout'
import { FormFieldsDefinition } from '@/common/components/investment/form-segments/investment-prospect-segment/useProspectFields'

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

/**
 * Creates a dynamic Zod schema for Opportunity form based on prospect fields definition
 * Extends the base opportunitySchema with dynamic fields from FormFieldsDefinition
 */
export const createDynamicOpportunitySchema = (formFieldsDefinition?: FormFieldsDefinition) => {
  // Start with base opportunity schema extended with IRM-specific fields
  const baseOpportunitySchema = opportunitySchema.extend({
    // IRM-specific fields - consistent with LeadForm schema
    investmentName: z.string().nullable().optional(),
    investmentGroupRef: catalogEntrySchema.optional(),
    investmentTypeRef: catalogEntrySchema.optional(),
    dealType: z.string().nullable().optional()
  })

  // If no dynamic fields, return base schema
  if (!formFieldsDefinition?.formFields || formFieldsDefinition.formFields.length === 0) {
    return baseOpportunitySchema
  }

  // Collect all dynamic fields (prospect fields are at root level, not nested)
  const dynamicFields: Record<string, z.ZodTypeAny> = {}

  for (const group of formFieldsDefinition.formFields) {
    for (const field of group.fields) {
      // For Opportunity/Lead, fields are at root level (property is just the field name)
      // Example: "investmentName", "acquisitionDate", etc.
      const fieldName = field.property

      // Skip if field already exists in base schema
      if (fieldName in baseOpportunitySchema.shape) {
        continue
      }

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
              validationRule = catalogEntrySchema.refine(val => val !== null && val !== undefined, {
                message: errorMessage
              })
            } else if (field.type.startsWith('REF_')) {
              // Reference fields - accepts string or object
              validationRule = z
                .union([
                  z.string().min(1, errorMessage),
                  z
                    .object({
                      id: z.string().min(1, errorMessage)
                    })
                    .passthrough()
                ])
                .refine(val => val !== null && val !== undefined, {
                  message: errorMessage
                })
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
              // Reference fields - accepts string or object
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
            } else {
              validationRule = z.string().optional()
            }
            break
        }
      }

      dynamicFields[fieldName] = validationRule
    }
  }

  // Extend base schema with dynamic fields
  if (Object.keys(dynamicFields).length > 0) {
    return baseOpportunitySchema.extend(dynamicFields)
  }

  return baseOpportunitySchema
}

/**
 * Creates a zodResolver with the dynamic schema
 */
export const createOpportunityFormResolver = (formFieldsDefinition?: FormFieldsDefinition) => {
  const schema = createDynamicOpportunitySchema(formFieldsDefinition)
  return zodResolver(schema)
}

export type OpportunityFormSchema = z.infer<ReturnType<typeof createDynamicOpportunitySchema>>
