import { EditableAllowanceRegionRule } from '../types'

interface TravelRegion {
  id: string
  code: string
  value: string
}

/**
 * Check if a region has any details in the current rules
 */
export const regionHasDetails = (region: TravelRegion, rules: EditableAllowanceRegionRule[]): boolean => {
  return rules.some(rule => rule.details?.some(detail => detail.travelRegion?.id === region.id))
}

/**
 * Check if a region has any saved allowance details
 */
export const regionHasSavedDetails = (regionId: string, rules: EditableAllowanceRegionRule[]): boolean => {
  const hasDetails = rules.some(rule => {
    const ruleHasDetailsForRegion = rule.details?.some(detail => {
      const matches = detail.travelRegion?.id === regionId && detail.id
      return matches
    })
    return ruleHasDetailsForRegion
  })

  return hasDetails
}

/**
 * Validate that amount is positive
 */
export const isValidAmount = (amount: number): boolean => {
  return amount > 0
}

/**
 * Validate that currency code is selected
 */
export const isValidCurrency = (currencyCode?: string): boolean => {
  return !!currencyCode && currencyCode.length > 0
}

/**
 * Validate cell data before save
 */
export const validateCellData = (cell: {
  amount: number
  currencyCode?: string
  currencyRef?: string
  activeFrom?: string
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!isValidAmount(cell.amount)) {
    errors.push('Amount must be greater than 0')
  }

  if (!isValidCurrency(cell.currencyCode)) {
    errors.push('Currency is required')
  }

  if (!cell.currencyRef) {
    errors.push('Currency reference is missing')
  }

  if (!cell.activeFrom) {
    errors.push('Valid From date is required')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}
