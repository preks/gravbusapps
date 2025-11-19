import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { leadSchema } from '@/common/components/common-relations/form-layouts/lead-layout'
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
 * Creates a dynamic Zod schema for Lead form based on prospect fields definition
 * Extends the base leadSchema with dynamic fields from FormFieldsDefinition
 */
export const createDynamicLeadSchema = (formFieldsDefinition?: FormFieldsDefinition) => {
  // Start with base lead schema (no IRM-specific extensions needed for leads)
  let baseLeadSchema: z.ZodObject<any> = leadSchema

  const investmentFields: Record<string, z.ZodTypeAny> = {
    investmentName: z.string().optional(),
    investmentGroupRef: catalogEntrySchema.optional(),
    investmentTypeRef: catalogEntrySchema.optional()
  }

  baseLeadSchema = baseLeadSchema.extend(investmentFields)

  // If no dynamic fields, return base schema
  if (!formFieldsDefinition?.formFields || formFieldsDefinition.formFields.length === 0) {
    return baseLeadSchema
  }

  // Collect all dynamic fields (prospect fields are at root level, not nested)
  const dynamicFields: Record<string, z.ZodTypeAny> = {}

  for (const group of formFieldsDefinition.formFields) {
    for (const field of group.fields) {
      // For Lead, fields are at root level (property is just the field name)
      // Example: "investmentName", "acquisitionDate", etc.
      const fieldName = field.property

      // Skip if field already exists in base schema
      if (fieldName in baseLeadSchema.shape) {
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
    return baseLeadSchema.extend(dynamicFields)
  }

  return baseLeadSchema
}

/**
 * Creates a zodResolver with the dynamic schema
 */
export const createLeadFormResolver = (formFieldsDefinition?: FormFieldsDefinition) => {
  const schema = createDynamicLeadSchema(formFieldsDefinition)
  return zodResolver(schema)
}

export type LeadFormSchema = z.infer<ReturnType<typeof createDynamicLeadSchema>>
