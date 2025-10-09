/**
 * Currency utility functions for handling currency symbols and formatting
 */

/**
 * Convert Unicode code point string to actual character
 * @param unicodeString - String like "U+20AC" or "U+0024"
 * @returns The actual Unicode character
 */
function convertUnicodeCodePoint(unicodeString: string): string {
  // Check if it's a Unicode code point format (U+XXXX)
  const unicodeMatch = unicodeString.match(/^U\+([0-9A-Fa-f]{4,6})$/)
  if (unicodeMatch) {
    const codePoint = parseInt(unicodeMatch[1], 16)
    return String.fromCodePoint(codePoint)
  }

  // If it's not a Unicode code point, return as-is
  return unicodeString
}

/**
 * Get currency symbol from catalog entry
 * Uses additionalValue1 if available (which contains the symbol), otherwise falls back to code
 * Handles both direct symbols and Unicode code points
 *
 * @param currency - The currency catalog entry object
 * @returns The currency symbol or code
 *
 * @example
 * getCurrencySymbol({ code: 'EUR', additionalValue1: '€' }) // Returns '€'
 * getCurrencySymbol({ code: 'EUR', additionalValue1: 'U+20AC' }) // Returns '€'
 * getCurrencySymbol({ code: 'USD', additionalValue1: '$' }) // Returns '$'
 * getCurrencySymbol({ code: 'USD', additionalValue1: 'U+0024' }) // Returns '$'
 * getCurrencySymbol({ code: 'EUR', additionalValue1: '' }) // Returns 'EUR'
 * getCurrencySymbol({ code: 'GBP' }) // Returns 'GBP'
 */
export function getCurrencySymbol(
  currency?: {
    code?: string
    additionalValue1?: string
    value?: string
  } | null
): string {
  if (!currency) {
    return ''
  }

  // Use additionalValue1 if available and not empty (this typically contains the symbol)
  if (currency.additionalValue1 && currency.additionalValue1.trim() !== '') {
    const rawSymbol = currency.additionalValue1.trim()
    const symbol = convertUnicodeCodePoint(rawSymbol)
    return symbol
  }

  // Fall back to code
  return currency.code || ''
}

/**
 * Get currency symbol from currencyRef (catalog entry ID)
 * This requires loading the catalog entry
 *
 * @param currencyRef - The currency catalog entry reference (e.g., "Currency:v1:EUR")
 * @returns The currency code extracted from the reference
 *
 * @example
 * getCurrencyCodeFromRef('Currency:v1:EUR') // Returns 'EUR'
 * getCurrencyCodeFromRef('Currency:v1:USD') // Returns 'USD'
 */
export function getCurrencyCodeFromRef(currencyRef: string): string {
  if (!currencyRef) {
    return ''
  }

  // Extract code from reference format "Currency:v1:CODE"
  const parts = currencyRef.split(':')
  return parts[parts.length - 1] || ''
}
