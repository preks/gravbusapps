/**
 * Utility functions for currency formatting and processing
 * Follows the same pattern as manager-expenses for consistency
 */
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

/**
 * Helper function to extract currency code from currency reference
 * @param currencyRef - Currency reference string (e.g., 'Currency:v1:EUR')
 * @returns The extracted currency code or null if invalid format
 */
export const extractCurrencyCode = (currencyRef: string): string | null => {
  if (!currencyRef) return null

  const regex = /Currency:v1:([A-Z]{3})/i
  const match = regex.exec(currencyRef)
  if (match) return match[1].toUpperCase()

  // If it's already just a currency code (e.g., 'EUR')
  if (/^[A-Z]{3}$/i.test(currencyRef)) {
    return currencyRef.toUpperCase()
  }

  return null
}

/**
 * Format a number with thousand separators and fixed decimal places
 * Uses user's active locale for formatting
 * @param amount - The amount to format
 * @param decimalPlaces - Number of decimal places (default: 2)
 * @returns Formatted amount string
 */
export const formatAmount = (amount: number | null | undefined, decimalPlaces = 2): string => {
  amount ??= 0

  const userLocale = getCurrentActiveUserLocale()
  return new Intl.NumberFormat(userLocale, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  }).format(amount)
}

/**
 * Format amount with currency using Intl.NumberFormat
 * Automatically positions currency before/after amount based on locale
 * Uses currency codes (not symbols) for clarity
 *
 * @param amount - The amount to format
 * @param currencyCode - The currency code (e.g., 'EUR', 'USD', 'RON')
 * @param decimalPlaces - Number of decimal places (default: 2)
 * @returns Locale-aware formatted currency
 *
 * Examples:
 * - German (de-DE): "1.234,56 EUR" (currency after)
 * - US (en-US): "USD 1,234.56" (currency before)
 * - Romanian (ro-RO): "1.234,56 RON" (currency after)
 */
export const formatCurrency = (
  amount: number | null | undefined,
  currencyCode: string = 'EUR',
  decimalPlaces = 2
): string => {
  amount ??= 0

  const userLocale = getCurrentActiveUserLocale()

  return new Intl.NumberFormat(userLocale, {
    style: 'currency',
    currency: currencyCode,
    currencyDisplay: 'code', // Always show currency code (EUR, USD) not symbol (€, $)
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  }).format(amount)
}

/**
 * Format currency for chart axes (no decimals, locale-aware positioning)
 * @param value - The value to format
 * @param currencyCode - The currency code
 * @returns Formatted currency string with locale-appropriate positioning
 */
export const formatCurrencyForChart = (value: number, currencyCode: string = 'EUR'): string => {
  return formatCurrency(value, currencyCode, 0)
}
