/**
 * Investment-specific formatters
 * These wrap central utilities with investment-specific behavior
 */

import { formatCurrencyCompact, extractCurrencyCode } from '@/common/utils/numberFormatter'

/**
 * Format currency for investment views (no thousands abbreviation)
 * Shows €1,500 instead of €1.5K for better readability in investment contexts
 *
 * @param amount - The amount to format
 * @param currency - Currency code or catalog format (e.g., 'EUR' or 'Currency:v1:EUR')
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1500, 'EUR')                 // Returns: "€1,500"
 * formatCurrency(1500000, 'EUR')              // Returns: "€1.5M"
 * formatCurrency(500, 'Currency:v1:USD')      // Returns: "$500"
 */
export const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
  const currencyCode = extractCurrencyCode(currency)
  return formatCurrencyCompact(amount, currencyCode, undefined, 1, true) // skipThousands=true
}

/**
 * Calculate percentage change between current and previous values
 * Centralized function to ensure consistent comparison logic across all analytics
 *
 * @param current - Current value
 * @param previous - Previous value
 * @returns Object with formatted value string and positive/negative indicator
 *
 * @example
 * calculateChange(150, 100)  // Returns: { value: '+50.0%', positive: true }
 * calculateChange(80, 100)   // Returns: { value: '-20.0%', positive: false }
 * calculateChange(100, 0)    // Returns: { value: '+100%', positive: true }
 */
export const calculateChange = (current: number, previous: number): { value: string; positive: boolean } => {
  if (previous === 0) {
    return { value: current > 0 ? '+100%' : '0%', positive: current > 0 }
  }

  const change = ((current - previous) / Math.abs(previous)) * 100
  const formattedChange = Math.abs(change).toFixed(1)

  return {
    value: `${change >= 0 ? '+' : '-'}${formattedChange}%`,
    positive: change >= 0
  }
}
