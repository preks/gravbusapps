import { getCurrentActiveUserLocale, formatNumberFunction } from '@/common/utils/windowUtils'

/**
 * Extracts currency code from amount string if present
 */
const extractCurrencyFromAmount = (amount: string): string => {
  if (!amount.includes(' ')) return 'EUR'

  const parts = amount.split(' ')
  const lastPart = parts[parts.length - 1]
  return /^[A-Z]{3}$/.test(lastPart) ? lastPart : 'EUR'
}

/**
 * Formats amount using available formatting function
 */
const formatAmount = (amount: string, userLocale: string): string => {
  try {
    if (formatNumberFunction && typeof formatNumberFunction === 'function') {
      const result = formatNumberFunction(amount)
      if (result && result !== 'undefined' && result !== 'null') {
        return result
      }
    }
    return new Intl.NumberFormat(userLocale).format(Number(amount))
  } catch {
    return amount
  }
}

/**
 * Formats currency display based on locale
 */
const formatWithCurrency = (formattedAmount: string, currencyCode: string, locale: string): string => {
  const language = locale.split('-')[0].toLowerCase()

  if (language === 'en') {
    return `${currencyCode} ${formattedAmount}`
  }

  return `${formattedAmount} ${currencyCode}`
}

export const formatCurrencyDisplay = (
  amount: number | string | null | undefined,
  currencyCode: string | null | undefined
): string => {
  // Handle invalid amounts
  if (amount === null || amount === undefined || amount === '' || Number.isNaN(Number(amount))) {
    return `0 ${currencyCode || 'EUR'}`
  }

  // Determine currency code
  let finalCurrencyCode = currencyCode
  if (!finalCurrencyCode) {
    finalCurrencyCode = typeof amount === 'string' ? extractCurrencyFromAmount(amount) : 'EUR'
  }

  // Format amount
  const userLocale = getCurrentActiveUserLocale()
  const formattedAmount = formatAmount(String(amount), userLocale)

  // Return formatted string with currency
  return formatWithCurrency(formattedAmount, finalCurrencyCode, userLocale)
}
