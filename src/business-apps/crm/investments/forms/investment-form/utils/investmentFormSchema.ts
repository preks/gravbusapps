import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormFieldsDefinition } from '../queries/InvestmentCatalogQueries';

// Base investment form schema - fields that are always required
const baseInvestmentSchema = z.object({
  // Basic investment info
  name: z.string().min(1, 'Investment name is required'),
  ownerEmployeeId: z.string().min(1, 'Investment owner is required'),
  group: z.string().min(1, 'Investment group is required'),

  // Required related entities - temporarily made optional for debugging
  accountId: z.string().min(1, 'Related account is required'),
  contactId: z.string().min(1, 'Related contact is required'),

  // Optional fields that might be present
  id: z.string().optional(),
  description: z.string().optional(),
  investmentTypeRef: z.string().optional(), // Made optional - will be conditionally required
  investmentLiquidFundTypeRef: z.string().optional(), // Added for liquid funds
});

// Helper function to extract field name from property path (e.g., "realEstateInvestment.totalCost" -> "totalCost")
// For additionalProperties, we flatten the path: "investment.additionalProperties.openingBalance" -> "additionalProperties_openingBalance"
// IMPORTANT: This must match the naming logic in DynamicGroupSegment.tsx
const getPropertyName = (property: string, fieldType?: string): string => {
  const parts = property.split('.');
  
  // Handle additionalProperties fields with special naming
  if (parts.includes('additionalProperties') && parts.length >= 3) {
    const additionalPropsIndex = parts.indexOf('additionalProperties');
    // Create flattened name: additionalProperties_fieldName
    const fieldName = parts.slice(additionalPropsIndex + 1).join('_');
    return `additionalProperties_${fieldName}`;
  }
  
  // Default behavior for regular fields
  const baseName = parts.pop() || property;
  
  // For REF_ types, if the property points to a relationship, add "Id" suffix for form field
  // This matches the logic in DynamicGroupSegment.tsx
  if (fieldType?.startsWith('REF_') && !baseName.endsWith('Id')) {
    return baseName + 'Id';
  }
  
  return baseName;
};

/**
 * Creates a dynamic Zod schema based on the form fields definition from catalog
 */
export const createDynamicInvestmentSchema = (formFieldsDefinition?: FormFieldsDefinition) => {
  let dynamicFields: Record<string, z.ZodTypeAny> = {};

  if (formFieldsDefinition?.formFields) {
    for (const group of formFieldsDefinition.formFields) {
      for (const field of group.fields) {
        // Use flattened property name to match DynamicGroupSegment implementation
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

  // Create base schema with dynamic fields
  const schemaWithDynamicFields = baseInvestmentSchema.extend(dynamicFields);

  // Add conditional validation for investment flow
  return schemaWithDynamicFields.refine(
    (data) => {
      // For liquid funds: either investmentTypeRef OR investmentLiquidFundTypeRef must be present
      if (data.group === 'LIQUID_FUND') {
        return data.investmentTypeRef || data.investmentLiquidFundTypeRef;
      }
      // For non-liquid funds: investmentTypeRef is required
      return !!data.investmentTypeRef;
    },
    {
      message: 'Investment type or liquid fund type is required',
      path: ['investmentTypeRef'], // This will show the error on the investmentTypeRef field
    },
  );
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
