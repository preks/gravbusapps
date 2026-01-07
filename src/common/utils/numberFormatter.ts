/**
 * Number and currency formatting helpers used across apps
 * - Compact formatting: 1,200 -> 1.2K, 5,000,000 -> 5M, etc.
 * - Currency formatting (string or parts) with locale awareness
 * - Single, extendable API points for future localization work
 *
 * Convention: K (thousand), M (million), B (billion), T (trillion)
 * Based on common product analytics conventions (e.g., YouTube, financial dashboards).
 */

import { getCurrentActiveUserLocale, formatNumberFunction as formatNumberWithMask } from '@/common/utils/windowUtils'

/**
 * Formats numbers with compact notation (K, M, B, T)
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string like "1.5M", "2.3B", "500K"
 *
 * @example
 * formatAmount(1500000)        → "1.5M"  (default 1 decimal)
 * formatAmount(1500000, 0)     → "2M"    (no decimals)
 * formatAmount(1500000, 2)     → "1.50M" (2 decimals)
 * formatAmount(-1000000)       → "-1.0M" (handles negatives)
 * formatAmount(1500000000000)  → "1.5T"  (supports trillions)
 */
export const formatAmount = (value: number | null | undefined, decimals: number = 1): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '0'
  }

  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''

  if (abs >= 1_000_000_000_000) {
    return `${sign}${(abs / 1_000_000_000_000).toFixed(decimals)}T`
  }
  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(decimals)}B`
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(decimals)}M`
  }
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(decimals)}K`
  }

  // For small numbers, show without abbreviation
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value as number)
}

export const formatCompactCurrency = (
  amount: number | null | undefined,
  currencyCode: string = 'USD',
  maximumFractionDigits: number = 1,
  skipThousands: boolean = false
): string => {
  if (amount === null || amount === undefined || !isFinite(amount as number)) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    }).format(0)
  }

  const abs = Math.abs(amount as number)
  const sign = (amount as number) < 0 ? '-' : ''

  const format = (num: number) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits,
      minimumFractionDigits: 0
    }).format(num)

  if (abs >= 1_000_000_000_000) return `${sign}${format(abs / 1_000_000_000_000)}T`
  if (abs >= 1_000_000_000) return `${sign}${format(abs / 1_000_000_000)}B`
  if (abs >= 1_000_000) return `${sign}${format(abs / 1_000_000)}M`

  // Skip thousands abbreviation if requested (used by investment management views)
  if (!skipThousands && abs >= 1_000) return `${sign}${format(abs / 1_000)}K`

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(amount as number)
}

/**
 * Format percentage with specified decimal places
 * @param value - The numeric value to format as percentage
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number | null | undefined, decimals: number = 1): string => {
  if (value === null || value === undefined || !isFinite(value)) {
    return '0%'
  }
  return `${value.toFixed(decimals)}%`
}

/**
 * Extract currency code from reference string (e.g., "Currency:v1:EUR" -> "EUR")
 * Common pattern in business applications
 * @param currencyRef - Currency reference string or object with id/value
 * @returns Currency code or default
 */
export const extractCurrencyCode = (
  currencyRef: string | null | undefined | { id?: string; value?: string; code?: string }
): string => {
  if (!currencyRef) return 'EUR'

  // Handle object with id or value property (GraphQL catalog entry)
  if (typeof currencyRef === 'object') {
    const currencyStr = currencyRef.id || currencyRef.value || currencyRef.code
    if (currencyStr && typeof currencyStr === 'string') {
      return currencyStr.split(':').pop() || 'EUR'
    }
    return 'EUR'
  }

  // Handle string
  if (typeof currencyRef === 'string') {
    return currencyRef.split(':').pop() || 'EUR'
  }

  return 'EUR'
}

// Resolve effective locale (defaults to platform locale when available)
const resolveLocale = (locale?: string): string | undefined => {
  try {
    const platformLocale = getCurrentActiveUserLocale?.()
    return locale || platformLocale || undefined
  } catch {
    return locale || undefined
  }
}

/**
 * Generic number formatter (decimal). Optional compact notation.
 */
export const formatNumber = (
  value: number | null | undefined,
  options?: {
    locale?: string
    minimumFractionDigits?: number
    maximumFractionDigits?: number
    useGrouping?: boolean
    compact?: boolean
  }
): string => {
  if (value === null || value === undefined || !isFinite(value)) return '0'
  const locale = resolveLocale(options?.locale)
  const notation = options?.compact ? 'compact' : 'standard'
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
    useGrouping: options?.useGrouping ?? true,
    notation
  }).format(value)
}

// New helpers for unified currency formatting across apps
export interface CurrencyParts {
  number: string
  symbol: string
}

/**
 * Format an amount returning number text and a narrow currency symbol separately.
 * Use this to render number-only plus right-aligned symbol consistently.
 */
export const formatCurrencyParts = (
  amount: number | null | undefined,
  options?: { currency?: string; locale?: string; minimumFractionDigits?: number; maximumFractionDigits?: number }
): CurrencyParts => {
  const currency = options?.currency || 'EUR'
  const locale = resolveLocale(options?.locale)
  const min = options?.minimumFractionDigits ?? 0
  const max = options?.maximumFractionDigits ?? 2

  if (amount === null || amount === undefined || !isFinite(amount as number)) {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: min,
      maximumFractionDigits: max
    }).formatToParts(0)
    const symbol = parts.find(p => p.type === 'currency')?.value || currency
    const number = parts
      .filter(p => p.type !== 'currency')
      .map(p => p.value)
      .join('')
    return { number, symbol }
  }

  const parts = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: min,
    maximumFractionDigits: max
  }).formatToParts(amount as number)
  return {
    number: parts
      .filter(p => p.type !== 'currency')
      .map(p => p.value)
      .join(''),
    symbol: parts.find(p => p.type === 'currency')?.value || currency
  }
}

/**
 * Convert Unicode code point string to actual character
 * @param unicodeString - String like "U+20AC" or "U+0024"
 * @returns The actual Unicode character
 */
function convertUnicodeCodePoint(unicodeString: string): string {
  const unicodeMatch = unicodeString.match(/^U\+([0-9A-Fa-f]{4,6})$/)
  if (unicodeMatch) {
    const codePoint = parseInt(unicodeMatch[1], 16)
    return String.fromCodePoint(codePoint)
  }
  return unicodeString
}

/**
 * Get currency symbol from either a currency code string or a catalog entry object
 * Handles both direct currency codes and catalog objects with symbol information
 *
 * @param currencyOrCode - Either a currency code string ('EUR') or catalog entry object
 * @param locale - Optional locale for formatting (only used when passing currency code)
 * @returns The currency symbol
 *
 * @example
 * // From currency code string
 * getCurrencySymbol('EUR') // Returns '€'
 * getCurrencySymbol('USD') // Returns '$'
 *
 * // From catalog object with direct symbol
 * getCurrencySymbol({ code: 'EUR', additionalValue1: '€' }) // Returns '€'
 * getCurrencySymbol({ code: 'USD', additionalValue1: '$' }) // Returns '$'
 *
 * // From catalog object with Unicode code point
 * getCurrencySymbol({ code: 'EUR', additionalValue1: 'U+20AC' }) // Returns '€'
 * getCurrencySymbol({ code: 'USD', additionalValue1: 'U+0024' }) // Returns '$'
 *
 * // Fallback scenarios
 * getCurrencySymbol({ code: 'EUR', additionalValue1: '' }) // Returns 'EUR'
 * getCurrencySymbol({ code: 'GBP' }) // Returns 'GBP'
 */
export function getCurrencySymbol(
  currencyOrCode?:
    | string
    | {
        code?: string
        additionalValue1?: string
        value?: string
      }
    | null,
  locale?: string
): string {
  // Handle null/undefined
  if (!currencyOrCode) {
    return ''
  }

  // Handle catalog object format
  if (typeof currencyOrCode === 'object') {
    // Use additionalValue1 if available (this typically contains the symbol)
    if (currencyOrCode.additionalValue1 && currencyOrCode.additionalValue1.trim() !== '') {
      const rawSymbol = currencyOrCode.additionalValue1.trim()
      return convertUnicodeCodePoint(rawSymbol)
    }
    // Fall back to code
    return currencyOrCode.code || ''
  }

  // Handle currency code string format
  try {
    const code = currencyOrCode || 'EUR'
    const parts = new Intl.NumberFormat(resolveLocale(locale), {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol'
    }).formatToParts(0)
    return parts.find(p => p.type === 'currency')?.value || code
  } catch {
    return '€'
  }
}

/** String version of currency formatter (non-compact). */
export const formatCurrencyString = (
  amount: number | null | undefined,
  options?: { currency?: string; locale?: string; minimumFractionDigits?: number; maximumFractionDigits?: number }
): string => {
  const currency = options?.currency || 'EUR'
  const locale = resolveLocale(options?.locale)
  const min = options?.minimumFractionDigits ?? 0
  const max = options?.maximumFractionDigits ?? 2
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: min,
    maximumFractionDigits: max
  }).format((amount ?? 0) as number)
}

/**
 * Simple currency formatter (non-compact) with basic signature for backward compatibility
 * @param amount - The amount to format
 * @param currency - Currency code or catalog reference (e.g., 'EUR' or 'Currency:v1:EUR')
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number | null | undefined, currency: string = 'EUR'): string => {
  const currencyCode = extractCurrencyCode(currency)
  return formatCurrencyString(amount, { currency: currencyCode, maximumFractionDigits: 2 })
}

/**
 * Convenience: returns a single string with compact currency (1.2M, etc.) honoring locale.
 * @param amount - The amount to format
 * @param currency - Currency code (e.g., 'EUR', 'USD') or catalog format (e.g., 'Currency:v1:EUR')
 * @param locale - Optional locale override
 * @param maximumFractionDigits - Maximum decimal places (default: 1)
 * @param skipThousands - If true, don't abbreviate thousands (shows €1,500 instead of €1.5K)
 */
export const formatCurrencyCompact = (
  amount: number | null | undefined,
  currency: string = 'EUR',
  locale?: string,
  maximumFractionDigits: number = 1,
  skipThousands: boolean = false
): string => {
  if (amount === null || amount === undefined || !isFinite(amount as number)) {
    return new Intl.NumberFormat(resolveLocale(locale), {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    }).format(0)
  }
  const abs = Math.abs(amount as number)
  const sign = (amount as number) < 0 ? '-' : ''
  const format = (num: number) =>
    new Intl.NumberFormat(resolveLocale(locale), {
      style: 'currency',
      currency,
      maximumFractionDigits,
      minimumFractionDigits: 0
    }).format(num)
  if (abs >= 1_000_000_000_000) return `${sign}${format(abs / 1_000_000_000_000)}T`
  if (abs >= 1_000_000_000) return `${sign}${format(abs / 1_000_000_000)}B`
  if (abs >= 1_000_000) return `${sign}${format(abs / 1_000_000)}M`

  // Skip thousands abbreviation if requested (used by investment management views)
  if (!skipThousands && abs >= 1_000) return `${sign}${format(abs / 1_000)}K`

  return new Intl.NumberFormat(resolveLocale(locale), {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(amount as number)
}

/**
 * Safely extracts a currency code from various input formats
 * Handles null/undefined, objects with code/value properties, and strings
 *
 * @param currency - The currency value to extract from (can be string, object, or null)
 * @returns The extracted currency code or null if extraction fails
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
 * Extracts unique currency codes from an array of items
 * Filters out null/undefined values and sorts alphabetically
 *
 * @param items - Array of items with currency data
 * @param currencyGetter - Function to extract currency from each item
 * @returns Sorted array of unique currency codes
 *
 * @example
 * const investments = [
 *   { currency: { code: "Currency:v1:EUR" } },
 *   { currency: { code: "Currency:v1:USD" } },
 *   { currency: { code: "Currency:v1:EUR" } }
 * ];
 *
 * extractAvailableCurrencies(investments, inv => inv.currency)
 * // Returns: ["EUR", "USD"]
 */
export function extractAvailableCurrencies<T>(items: T[], currencyGetter: (item: T) => any): string[] {
  const currencies = new Set<string>()

  for (const item of items) {
    const currency = currencyGetter(item)
    const code = safeCurrencyExtraction(currency)
    if (code) {
      currencies.add(code)
    }
  }

  return Array.from(currencies).sort((a, b) => a.localeCompare(b))
}

/**
 * Parse a localized number string with various formats (e.g., "1.234,56", "1,234.56", "1234.56")
 * Handles thousands separators and different decimal separator conventions.
 *
 * @param value - The value to parse (can be number or string with various separators)
 * @returns The parsed number or NaN if invalid
 *
 * @example
 * parseLocalizedNumber("1.234,56")  // 1234.56 (European format)
 * parseLocalizedNumber("1,234.56")  // 1234.56 (US format)
 * parseLocalizedNumber("€1.234,56") // 1234.56 (with currency symbol)
 * parseLocalizedNumber(1234.56)     // 1234.56 (already a number)
 */
export const parseLocalizedNumber = (value: any): number => {
  if (typeof value === 'number') return value

  const input = String(value).trim()
  if (!input) return Number.NaN

  // Strip non-numeric characters except dots, commas, and minus
  const cleaned = input.replace(/[^\d.,-]/g, '')
  if (!cleaned) return Number.NaN

  // Find last occurrence of separators
  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')
  const lastSep = Math.max(lastComma, lastDot)

  let normalized = cleaned
  if (lastSep > -1) {
    const fractional = cleaned.substring(lastSep + 1)
    // If followed by 1-2 digits, it's a decimal separator
    const isDecimal = /^\d{1,2}$/.test(fractional)
    if (isDecimal) {
      const before = cleaned.substring(0, lastSep).replace(/[.,]/g, '')
      normalized = `${before}.${fractional}`
    } else {
      // Otherwise remove all separators
      normalized = cleaned.replace(/[.,]/g, '')
    }
  }

  return Number.parseFloat(normalized)
}

/** Wrapper to use platform number mask formatting when available. */
export const formatWithPattern = (value: number | string, pattern: string): string => {
  try {
    const val = typeof value === 'number' ? String(value) : value
    return formatNumberWithMask ? formatNumberWithMask(val, pattern) : val
  } catch {
    return String(value ?? '')
  }
}
