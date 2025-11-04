/**
 * @module shared/utils/currencyUtils
 * @description Investment-specific currency utilities for analytics views.
 * Provides safe handling of currency data from various formats (strings, objects, catalog entries).
 * Generic currency utilities are imported from @/common/utils/numberFormatter.
 */

import { extractCurrencyCode } from '@/common/utils/numberFormatter'

/**
 * @function safeCurrencyExtraction
 * @description Safely extracts a currency code from various input formats.
 * Handles null/undefined, objects with code/value properties, and strings.
 *
 * @param {any} currency - The currency value to extract from (can be string, object, or null)
 * @returns {string | null} The extracted currency code or null if extraction fails
 *
 * @example
 * // From catalog object
 * safeCurrencyExtraction({ code: "Currency:v1:EUR" }) // Returns: "EUR"
 * safeCurrencyExtraction({ value: "Currency:v2:USD" }) // Returns: "USD"
 *
 * // From string
 * safeCurrencyExtraction("Currency:v1:GBP") // Returns: "GBP"
 * safeCurrencyExtraction("EUR") // Returns: "EUR"
 *
 * // Edge cases
 * safeCurrencyExtraction(null) // Returns: null
 * safeCurrencyExtraction(undefined) // Returns: null
 * safeCurrencyExtraction({}) // Returns: null
 */
export const safeCurrencyExtraction = (currency: any): string | null => {
  if (!currency) return null

  if (typeof currency === 'object') {
    const currencyStr = currency.code || currency.value
    if (!currencyStr) return null
    return extractCurrencyCode(currencyStr)
  }

  if (typeof currency === 'string') {
    return extractCurrencyCode(currency)
  }

  return null
}

/**
 * @function extractAvailableCurrencies
 * @description Extracts unique currency codes from an array of investments.
 * Filters out null/undefined values and sorts alphabetically.
 *
 * @template T - The investment type
 * @param {T[]} investments - Array of investments with currency data
 * @param {(item: T) => any} currencyGetter - Function to extract currency from each investment
 * @returns {string[]} Sorted array of unique currency codes
 *
 * @example
 * const investments = [
 *   { currency: { code: "Currency:v1:EUR" } },
 *   { currency: { code: "Currency:v1:USD" } },
 *   { currency: { code: "Currency:v1:EUR" } }
 * ];
 *
 * extractAvailableCurrencies(
 *   investments,
 *   inv => inv.currency
 * ) // Returns: ["EUR", "USD"]
 *
 * @example
 * // With direct currency code field
 * const investments = [
 *   { currencyCode: "EUR" },
 *   { currencyCode: "USD" },
 *   { currencyCode: null }
 * ];
 *
 * extractAvailableCurrencies(
 *   investments,
 *   inv => inv.currencyCode
 * ) // Returns: ["EUR", "USD"]
 */
export function extractAvailableCurrencies<T>(investments: T[], currencyGetter: (item: T) => any): string[] {
  const currencies = new Set<string>()

  for (const investment of investments) {
    const currency = currencyGetter(investment)
    const code = safeCurrencyExtraction(currency)
    if (code) {
      currencies.add(code)
    }
  }

  return Array.from(currencies).sort((a, b) => a.localeCompare(b))
}

// Re-export commonly used generic functions from central utilities
export {
  getCurrencySymbol,
  validateCurrencyCode,
  formatCurrencyString as formatCurrencyDisplay
} from '@/common/utils/numberFormatter'
