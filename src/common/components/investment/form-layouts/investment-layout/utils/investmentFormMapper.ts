/**
 * Dynamic field mapping utilities for investment forms
 * Maps raw GraphQL investment data to nested form structure based on catalog field definitions
 */

import { getValueByPath } from '@/common/utils/objectUtils'
import { InvestmentFormValues } from '../types'

/**
 * Sets a value at a nested path in an object using dot notation
 * @param obj - The object to modify
 * @param path - Dot-notation path (e.g., "investment.name" or "equityInvestment.marketValue")
 * @param value - The value to set
 */
const setNestedValue = (obj: any, path: string, value: any): void => {
  const parts = path.split('.')
  let current = obj

  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) {
      current[parts[i]] = {}
    }
    current = current[parts[i]]
  }

  current[parts[parts.length - 1]] = value
}

/**
 * Maps raw investment data from GraphQL to the nested form structure
 * based on dynamic field definitions from the catalog
 *
 * @param rawInvestment - Raw investment object from GraphQL query
 * @param fieldsDef - Dynamic field definitions from investment catalog
 * @returns Partial nested form values with mapped dynamic fields
 *
 * @example
 * const formData = mapInvestmentDataToFormFields(rawInvestment, fieldsDef);
 * // Returns: { investment: { totalInvestmentAmount: "12000" }, equityInvestment: { marketValue: "50000" } }
 */
export const mapInvestmentDataToFormFields = (rawInvestment: any, fieldsDef: any): Partial<InvestmentFormValues> => {
  const nestedData: any = {}

  if (!fieldsDef?.formFields?.length) {
    return nestedData
  }

  for (const group of fieldsDef.formFields) {
    for (const field of group.fields) {
      // IMPORTANT: rawInvestment is the full investment object from GraphQL
      // For investment.* fields, we need to strip the "investment." prefix since rawInvestment IS the investment
      let lookupPath = field.property
      if (field.property.startsWith('investment.')) {
        lookupPath = field.property.replace('investment.', '')
      }

      let value = getValueByPath(rawInvestment, lookupPath)

      // SPECIAL FIX: If looking for liquidFundInvestment.additionalProperties but not found,
      // try the investment.additionalProperties instead
      if (value === undefined && field.property.startsWith('liquidFundInvestment.additionalProperties.')) {
        const propertyName = field.property.replace('liquidFundInvestment.additionalProperties.', '')
        value = getValueByPath(rawInvestment, `additionalProperties.${propertyName}`)
      }

      // CATALOG_ FIELD: Keep full catalog object in form state
      // This avoids re-fetching data and simplifies component code
      // The payload builder will extract .id when needed for API submission
      if (field.type.startsWith('CATALOG_')) {
        const catalogEntry = getValueByPath(rawInvestment, lookupPath)
        if (catalogEntry && typeof catalogEntry === 'object') {
          value = catalogEntry // Keep full catalog object
        }
        // If it's already a string ID, leave it as-is (backward compatibility)
      }

      if (value !== undefined && value !== null && value !== '') {
        // Format the value based on field type
        // DATE fields: DateInput handles formatting internally (accepts ISO strings directly)
        let formattedValue = value
        if (field.type.startsWith('CATALOG_') && typeof value === 'object') {
          formattedValue = value // Keep catalog object as-is
        } else if (typeof value !== 'string' && typeof value !== 'object') {
          formattedValue = String(value)
        } else {
          formattedValue = value // Keep as-is if string or object (including ISO date strings)
        }

        // Set value at the nested path in the result object
        // E.g., "equityInvestment.marketValue" creates { equityInvestment: { marketValue: ... } }
        setNestedValue(nestedData, field.property, formattedValue)
      }
    }
  }

  return nestedData
}
