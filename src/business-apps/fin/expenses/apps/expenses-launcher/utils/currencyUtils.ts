import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

/**
 * Format currency using the active user locale and place the code accordingly:
 * - en-* locales: "CODE amount" (e.g., "EUR 1,234")
 * - de-* and ro-* locales: "amount CODE" (e.g., "1.234 EUR")
 */
export const formatCurrencyLocalized = (
  amount: number | null | undefined,
  currencyCode: string = 'EUR',
  decimalPlaces = 2
): string => {
  const value = typeof amount === 'number' ? amount : 0
  const locale = (getCurrentActiveUserLocale() || 'en-US').toLowerCase()

  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  })

  const formatted = formatter.format(value)
  // Trailing code for German and Romanian locales only (exact primary language match)
  // Valid matches: "de", "de-DE", "de_AT", "ro", "ro-RO" etc.
  const isTrailingCode = /^(de|ro)(?:[-_]|$)/i.test(locale)
  return isTrailingCode ? `${formatted} ${currencyCode}` : `${currencyCode} ${formatted}`
}
