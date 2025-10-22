import { formatNumberFunction } from '@/common/utils/windowUtils'

/**
 * Extracts currency code from API format (e.g., "Currency:v1:EUR" -> "EUR")
 */
export const extractCurrencyCode = (currencyId: string): string => {
  return currencyId.split(':').pop() || 'EUR'
}

/**
 * Formats currency value with three-character currency code after the amount
 * Uses user's locale for number formatting
 * @param amount - The amount to format
 * @param currencyId - Currency ID in API format or currency code
 * @returns Formatted string like "1,234.56 EUR"
 */
export const formatCurrency = (amount: number | undefined | null, currencyId: string = 'EUR'): string => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    const currencyCode = extractCurrencyCode(currencyId)
    return `0 ${currencyCode}`
  }

  const currencyCode = extractCurrencyCode(currencyId)

  // Format the number with locale-specific number formatting using windowUtils
  const formattedNumber = formatNumberFunction(amount, '0,0.00')

  return `${formattedNumber} ${currencyCode}`
}

/**
 * Formats currency value with specific decimal places
 * @param amount - The amount to format
 * @param currencyId - Currency ID in API format or currency code
 * @param decimalPlaces - Number of decimal places to show
 * @returns Formatted string like "1,234.56 EUR"
 */
export const formatCurrencyWithDecimals = (
  amount: number | undefined | null,
  currencyId: string = 'EUR',
  decimalPlaces: number = 2
): string => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    const currencyCode = extractCurrencyCode(currencyId)
    return `0 ${currencyCode}`
  }

  const currencyCode = extractCurrencyCode(currencyId)

  // Build format string with specified decimal places
  const formatString = decimalPlaces > 0 ? `0,0.${'0'.repeat(decimalPlaces)}` : '0,0'
  const formattedNumber = formatNumberFunction(amount, formatString)

  return `${formattedNumber} ${currencyCode}`
}

/**
 * Custom formatter that only abbreviates millions and billions, not thousands
 * Used for large amounts where M/B suffixes are helpful
 * @param amount - The amount to format
 * @param currencyCode - Currency code (e.g., "EUR", "USD")
 * @returns Formatted string like "1.2M EUR" or "5.3B EUR"
 */
export const formatCurrencyLarge = (amount: number | undefined, currencyCode: string = 'EUR'): string => {
  if (amount === undefined || amount === null || !isFinite(amount)) return '-'

  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''

  if (abs >= 1_000_000_000) {
    // Billions
    const value = abs / 1_000_000_000
    const formatted = formatNumberFunction(value, '0,0.0')
    return `${sign}${formatted}B ${currencyCode}`
  }

  if (abs >= 1_000_000) {
    // Millions
    const value = abs / 1_000_000
    const formatted = formatNumberFunction(value, '0,0.0')
    return `${sign}${formatted}M ${currencyCode}`
  }

  // Thousands and below - show as normal currency
  const formatted = formatNumberFunction(amount, '0,0')
  return `${formatted} ${currencyCode}`
}
