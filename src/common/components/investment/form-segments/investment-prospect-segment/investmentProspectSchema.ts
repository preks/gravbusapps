import { z } from 'zod'
import { FormFieldsDefinition } from './useInvestmentProspectFields'

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
              // Catalog entry - accepts either string ID, catalog object, or null (for clearing)
              validationRule = z
                .union([
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
                .refine(val => val !== null && val !== undefined, {
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
              // Catalog entry - accepts either string ID, catalog object, or null (for clearing)
              validationRule = z
                .union([
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
                .optional()
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

  return dynamicFields
}
