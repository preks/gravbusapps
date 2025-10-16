/**
 * @module shared/utils/currencyUtils
 * @description Currency extraction, validation, and formatting utilities for analytics views.
 * Provides safe handling of currency data from various formats (strings, objects, catalog entries).
 */

/**
 * @function extractCurrencyCode
 * @description Extracts the currency code from a catalog identifier string.
 * Handles formats like "Currency:v1:EUR" or "Currency:v2:USD".
 *
 * @param {string} currencyStr - The currency string to extract from
 * @returns {string} The extracted currency code (e.g., "EUR", "USD")
 *
 * @example
 * extractCurrencyCode("Currency:v1:EUR") // Returns: "EUR"
 * extractCurrencyCode("Currency:v2:USD") // Returns: "USD"
 * extractCurrencyCode("EUR") // Returns: "EUR" (already a code)
 */
export const extractCurrencyCode = (currencyStr: string): string => {
  const parts = currencyStr.split(':')
  return parts.length > 1 ? parts[parts.length - 1] : currencyStr
}

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

  investments.forEach(investment => {
    const currency = currencyGetter(investment)
    const code = safeCurrencyExtraction(currency)
    if (code) {
      currencies.add(code)
    }
  })

  return Array.from(currencies).sort()
}

/**
 * @function formatCurrencyDisplay
 * @description Formats a currency amount for display with proper localization.
 * Uses Intl.NumberFormat for consistent formatting across all analytics views.
 *
 * @param {number} amount - The amount to format
 * @param {string} currencyCode - The currency code (e.g., "EUR", "USD")
 * @param {object} [options] - Optional formatting options
 * @param {string} [options.locale='en-US'] - The locale to use for formatting
 * @param {'compact' | 'short'} [options.notation] - Display notation
 * @param {number} [options.minimumFractionDigits] - Minimum decimal places
 * @param {number} [options.maximumFractionDigits] - Maximum decimal places
 * @returns {string} Formatted currency string
 *
 * @example
 * formatCurrencyDisplay(1234567.89, "EUR")
 * // Returns: "€1,234,567.89"
 *
 * formatCurrencyDisplay(1234567.89, "USD", { notation: 'compact' })
 * // Returns: "$1.2M"
 *
 * formatCurrencyDisplay(1234.5, "GBP", {
 *   minimumFractionDigits: 2,
 *   maximumFractionDigits: 2
 * })
 * // Returns: "£1,234.50"
 */
export function formatCurrencyDisplay(
  amount: number,
  currencyCode: string,
  options: {
    locale?: string
    notation?: 'standard' | 'compact' | 'scientific' | 'engineering'
    minimumFractionDigits?: number
    maximumFractionDigits?: number
  } = {}
): string {
  const { locale = 'en-US', notation = 'standard', minimumFractionDigits = 0, maximumFractionDigits = 2 } = options

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      notation,
      minimumFractionDigits,
      maximumFractionDigits
    }).format(amount)
  } catch (error) {
    // Fallback if currency code is invalid
    console.warn(`Invalid currency code: ${currencyCode}`, error)
    return `${currencyCode} ${amount.toLocaleString(locale, {
      minimumFractionDigits,
      maximumFractionDigits
    })}`
  }
}

/**
 * @function getCurrencySymbol
 * @description Gets the currency symbol for a given currency code.
 *
 * @param {string} currencyCode - The currency code (e.g., "EUR", "USD")
 * @param {string} [locale='en-US'] - The locale to use
 * @returns {string} The currency symbol (e.g., "€", "$")
 *
 * @example
 * getCurrencySymbol("EUR") // Returns: "€"
 * getCurrencySymbol("USD") // Returns: "$"
 * getCurrencySymbol("GBP") // Returns: "£"
 */
export function getCurrencySymbol(currencyCode: string, locale: string = 'en-US'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
      .format(0)
      .replace(/\d/g, '')
      .trim()
  } catch {
    return currencyCode
  }
}

/**
 * @function validateCurrencyCode
 * @description Validates if a currency code is valid ISO 4217 format.
 *
 * @param {string} currencyCode - The currency code to validate
 * @returns {boolean} True if valid, false otherwise
 *
 * @example
 * validateCurrencyCode("EUR") // Returns: true
 * validateCurrencyCode("USD") // Returns: true
 * validateCurrencyCode("INVALID") // Returns: false
 * validateCurrencyCode("eu") // Returns: false (must be uppercase)
 */
export function validateCurrencyCode(currencyCode: string): boolean {
  if (!currencyCode || typeof currencyCode !== 'string') return false
  if (currencyCode.length !== 3) return false
  if (!/^[A-Z]{3}$/.test(currencyCode)) return false

  // Try to format with the currency code - if it fails, it's invalid
  try {
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode
    }).format(0)
    return true
  } catch {
    return false
  }
}
