/**
 * Dynamic field mapping utilities for Opportunity and Lead forms
 * Maps raw GraphQL opportunity/lead data to form structure based on catalog field definitions
 */

import { FormFieldsDefinition } from '@/common/components/investment/form-segments/investment-prospect-segment/useProspectFields'

/**
 * Get value from object by path (e.g., "field.subfield" -> obj.field.subfield)
 */
const getValueByPath = (obj: any, path: string): any => {
  if (!obj || !path) return undefined
  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' ? current[key] : undefined
  }, obj)
}

/**
 * Maps raw opportunity/lead data to form values based on dynamic field definitions
 * For Opportunity/Lead forms, fields are at root level (not nested like Investment form)
 *
 * @param rawData - Raw opportunity or lead object from GraphQL query
 * @param fieldsDef - Dynamic field definitions from investment catalog
 * @returns Partial form values with mapped dynamic fields
 */
export const mapDynamicFieldsToFormValues = (
  rawData: any,
  fieldsDef?: FormFieldsDefinition | null
): Record<string, any> => {
  const dynamicValues: Record<string, any> = {}

  if (!fieldsDef?.formFields?.length || !rawData) {
    return dynamicValues
  }

  for (const group of fieldsDef.formFields) {
    for (const field of group.fields) {
      // For Opportunity/Lead, property is just the field name (e.g., "acquisitionDate", "marketValue")
      // No "investment." prefix needed since fields are at root level
      const propertyPath = field.property

      // Get value from raw data
      const value = getValueByPath(rawData, propertyPath)

      // Skip if field doesn't exist or is undefined/null
      if (value === undefined || value === null) {
        continue
      }

      // Handle CATALOG_ fields - keep full catalog object if available
      if (field.type.startsWith('CATALOG_')) {
        // If value is already a catalog object, keep it
        if (value && typeof value === 'object' && 'id' in value) {
          dynamicValues[propertyPath] = value
        } else if (typeof value === 'string') {
          // If it's a string ID, leave it as-is (will be handled by CatalogSelect)
          dynamicValues[propertyPath] = value
        }
        continue
      }

      // Handle REF_ fields - keep full object if available
      if (field.type.startsWith('REF_')) {
        if (value && typeof value === 'object' && 'id' in value) {
          dynamicValues[propertyPath] = value
        } else if (typeof value === 'string') {
          dynamicValues[propertyPath] = value
        }
        continue
      }

      // Handle DATE/DATETIME fields - format for input
      if (field.type === 'DATE' || field.type === 'DATETIME') {
        if (value) {
          try {
            const date = new Date(value)
            if (!isNaN(date.getTime())) {
              dynamicValues[propertyPath] = date.toISOString().split('T')[0]
            }
          } catch {
            // Invalid date, skip
          }
        }
        continue
      }

      // Handle AMOUNT/NUMBER fields - convert to string for form input
      if (field.type === 'AMOUNT' || field.type === 'NUMBER' || field.type === 'PERCENTAGE') {
        if (value !== null && value !== undefined) {
          dynamicValues[propertyPath] = String(value)
        }
        continue
      }

      // Default: use value as-is (TEXT, TEXTAREA, etc.)
      dynamicValues[propertyPath] = value
    }
  }

  return dynamicValues
}
