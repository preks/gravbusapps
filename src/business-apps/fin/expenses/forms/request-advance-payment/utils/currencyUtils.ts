/**
 * Currency utilities following DRY principle
 * Single source of truth for currency-related logic
 */

// Constants to avoid duplication
export const DEFAULT_CURRENCY = 'EUR'

/**
 * Utility function to get currency with fallback
 * Follows Single Responsibility Principle - only handles currency fallback logic
 */
export const getCurrencyWithFallback = (currencyCode?: string): string => {
  return currencyCode || DEFAULT_CURRENCY
}

/**
 * Validates if a currency code is valid
 * Follows Open/Closed Principle - can be extended with more validation rules
 */
export const isValidCurrency = (currencyCode: string): boolean => {
  if (!currencyCode || currencyCode.length !== 3) {
    return false
  }
  return /^[A-Z]{3}$/.test(currencyCode)
}

/**
 * Formats currency reference for API calls
 * Follows Single Responsibility Principle
 */
export const formatCurrencyRef = (currencyCode: string): string => {
  return `Currency:v1:${currencyCode}`
}
