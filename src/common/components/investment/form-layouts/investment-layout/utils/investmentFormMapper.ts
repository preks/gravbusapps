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
 * Resolve lookup path for field property
 */
const resolveLookupPath = (property: string): string => {
  if (property.startsWith('investment.')) {
    return property.replace('investment.', '')
  }
  return property
}

/**
 * Get field value with fallback for liquidFundInvestment.additionalProperties
 */
const getFieldValue = (rawInvestment: any, field: { property: string }, lookupPath: string): any => {
  let value = getValueByPath(rawInvestment, lookupPath)

  if (value === undefined && field.property.startsWith('liquidFundInvestment.additionalProperties.')) {
    const propertyName = field.property.replace('liquidFundInvestment.additionalProperties.', '')
    value = getValueByPath(rawInvestment, `additionalProperties.${propertyName}`)
  }

  return value
}

/**
 * Format value for form field
 */
const formatFieldValue = (value: any): any => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  return typeof value !== 'string' && typeof value !== 'object' ? String(value) : value
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
      const lookupPath = resolveLookupPath(field.property)
      const value = getFieldValue(rawInvestment, field, lookupPath)
      const valueToSet = formatFieldValue(value)

      if (valueToSet !== undefined) {
        setNestedValue(nestedData, field.property, valueToSet)
      }
    }
  }

  return nestedData
}
