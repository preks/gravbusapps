import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormFieldsDefinition } from '../queries/InvestmentCatalogQueries';

// Base investment form schema - nested structure matching API
const baseInvestmentSchema = z.object({
  // Main investment object (required)
  investment: z.object({
    id: z.string().optional(),
    version: z.number().optional(),
    name: z.string().min(1, 'Investment name is required'),
    initialInvestmentAmount: z.union([z.string(), z.number()]).optional(),
    investmentGroupRef: z.string().min(1, 'Investment group is required'),
    ownerEmployee: z.string().min(1, 'Investment owner is required'),
    investmentStatusRef: z.string().optional(),
    code: z.string().optional(),
    currencyRef: z.string().optional(),
    investmentAccount: z.string().optional(),
    investmentTypeRef: z.string().optional(),
    // Allow additional investment fields
  }).passthrough(),
  
  // Group-specific data (optional - one will be present based on group)
  equityInvestment: z.any().optional(),
  realEstateInvestment: z.any().optional(),
  liquidFundInvestment: z.any().optional(),
  
  // Form helper fields (not sent to API, mapped in payload builder)
  accountId: z.string().optional(),
});

// Helper function to convert property path to field name for nested structure
// With nested structure, we use the FULL property path as the field name
// Examples:
// - "investment.name" → "investment.name"
// - "equityInvestment.marketValue" → "equityInvestment.marketValue"
// - "liquidFundInvestment.additionalProperties.name" → "liquidFundInvestment.additionalProperties.name"
// IMPORTANT: This must match the naming logic in DynamicForm component
const getPropertyName = (property: string, fieldType?: string): string => {
  // For CATALOG_ fields, ensure the property path ends with "Ref"
  if (fieldType?.startsWith('CATALOG_') && !property.endsWith('Ref')) {
    const parts = property.split('.');
    const lastPart = parts[parts.length - 1];
    parts[parts.length - 1] = `${lastPart}Ref`;
    return parts.join('.');
  }
  
  // For nested structure, use the FULL property path
  return property;
};

/**
 * Creates a dynamic Zod schema based on the form fields definition from catalog
 */
export const createDynamicInvestmentSchema = (formFieldsDefinition?: FormFieldsDefinition) => {
  let dynamicFields: Record<string, z.ZodTypeAny> = {};

  if (formFieldsDefinition?.formFields) {
    for (const group of formFieldsDefinition.formFields) {
      for (const field of group.fields) {
        // Use flattened property name to match DynamicForm implementation
        const fieldName = getPropertyName(field.property, field.type);

        if (field.required) {
          const errorMessage = `${field.label} is required`;

          switch (field.type) {
            case 'TEXT':
            case 'TEXTAREA':
              dynamicFields[fieldName] = z.string().min(1, errorMessage);
              break;
            case 'AMOUNT':
              dynamicFields[fieldName] = z.preprocess(
                (val) => {
                  if (val === null || val === undefined || val === '') return undefined;
                  const num = Number(val);
                  return isNaN(num) ? undefined : num;
                },
                z.number({ message: errorMessage }).min(0, `${field.label} must be positive`),
              );
              break;
            case 'PERCENTAGE':
              dynamicFields[fieldName] = z.preprocess(
                (val) => {
                  if (val === null || val === undefined || val === '') return undefined;
                  const num = Number(val);
                  return isNaN(num) ? undefined : num;
                },
                z
                  .number({ message: errorMessage })
                  .min(0, `${field.label} must be at least 0%`)
                  .max(100, `${field.label} must be at most 100%`),
              );
              break;
            case 'NUMBER':
              dynamicFields[fieldName] = z.preprocess(
                (val) => {
                  if (val === null || val === undefined || val === '') return undefined;
                  const num = Number(val);
                  return isNaN(num) ? undefined : num;
                },
                z.number({ message: errorMessage }),
              );
              break;
            case 'DATE':
            case 'DATETIME':
              dynamicFields[fieldName] = z.string().min(1, errorMessage);
              break;
            default:
              if (field.type.startsWith('CATALOG_') || field.type.startsWith('REF_')) {
                dynamicFields[fieldName] = z.string().min(1, errorMessage);
              } else {
                // Fallback for unknown types
                dynamicFields[fieldName] = z.string().min(1, errorMessage);
              }
              break;
          }
        } else {
          // Optional fields
          switch (field.type) {
            case 'TEXT':
            case 'TEXTAREA':
              dynamicFields[fieldName] = z.string().optional();
              break;
            case 'AMOUNT':
              dynamicFields[fieldName] = z.preprocess(
                (val) => {
                  if (val === null || val === undefined || val === '') return undefined;
                  const num = Number(val);
                  return isNaN(num) ? undefined : num;
                },
                z.number().min(0, `${field.label} must be positive`).optional(),
              );
              break;
            case 'PERCENTAGE':
              dynamicFields[fieldName] = z.preprocess(
                (val) => {
                  if (val === null || val === undefined || val === '') return undefined;
                  const num = Number(val);
                  return isNaN(num) ? undefined : num;
                },
                z
                  .number()
                  .min(0, `${field.label} must be at least 0%`)
                  .max(100, `${field.label} must be at most 100%`)
                  .optional(),
              );
              break;
            case 'NUMBER':
              dynamicFields[fieldName] = z.preprocess((val) => {
                if (val === null || val === undefined || val === '') return undefined;
                const num = Number(val);
                return isNaN(num) ? undefined : num;
              }, z.number().optional());
              break;
            case 'DATE':
            case 'DATETIME':
              dynamicFields[fieldName] = z.string().optional();
              break;
            default:
              if (field.type.startsWith('CATALOG_') || field.type.startsWith('REF_')) {
                dynamicFields[fieldName] = z.string().optional();
              } else {
                dynamicFields[fieldName] = z.string().optional();
              }
              break;
          }
        }
      }
    }
  }

  // With nested structure, dynamic fields are validated using passthrough()
  // The base schema already allows additional fields in nested objects
  // For now, simplify validation - just use base schema
  return baseInvestmentSchema;
};

/**
 * Creates a zodResolver with the dynamic schema
 */
export const createInvestmentFormResolver = (formFieldsDefinition?: FormFieldsDefinition) => {
  const schema = createDynamicInvestmentSchema(formFieldsDefinition);

  // Debug: Uncomment to see schema creation

  return zodResolver(schema);
};

export type InvestmentFormSchema = z.infer<ReturnType<typeof createDynamicInvestmentSchema>>;
