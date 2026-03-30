import { getCurrentActiveUserLocale, formatNumberFunction } from '@/common/utils/windowUtils'

export const DEFAULT_CURRENCY_CODE = 'EUR'

function extractCurrencyCodeFromAmount(amount: string): string {
  if (!amount.includes(' ')) return DEFAULT_CURRENCY_CODE
  const parts = amount.split(' ')
  const lastPart = parts[parts.length - 1]
  return /^[A-Z]{3}$/.test(lastPart) ? lastPart : DEFAULT_CURRENCY_CODE
}

function formatAmountWithLocale(amount: number, userLocale: string): string {
  try {
    if (formatNumberFunction) {
      const result = formatNumberFunction(amount)
      if (result && result !== 'undefined' && result !== 'null') {
        return result
      }
    }
    return new Intl.NumberFormat(userLocale).format(amount)
  } catch {
    return String(amount)
  }
}

function formatCurrencyOutput(formattedAmount: string, currencyCode: string, language: string): string {
  switch (language) {
    case 'de':
    case 'ro':
      return `${formattedAmount} ${currencyCode}`
    case 'en':
      return `${currencyCode} ${formattedAmount}`
    default:
      return `${formattedAmount} ${currencyCode}`
  }
}

export const formatCurrencyDisplay = (
  amount: number | string | null | undefined,
  currencyCode: string | null | undefined
): string => {
  if (amount === null || amount === undefined || amount === '' || Number.isNaN(Number(amount))) {
    return `0 ${currencyCode || DEFAULT_CURRENCY_CODE}`
  }

  let resolvedCode = currencyCode
  if (!resolvedCode) {
    resolvedCode = typeof amount === 'string' ? extractCurrencyCodeFromAmount(amount) : DEFAULT_CURRENCY_CODE
  }

  const userLocale = getCurrentActiveUserLocale()
  const numericAmount = Number(amount)
  let formattedAmount = formatAmountWithLocale(numericAmount, userLocale)

  if (!formattedAmount || formattedAmount === 'undefined' || formattedAmount === 'null') {
    formattedAmount = new Intl.NumberFormat(userLocale).format(numericAmount)
  }

  const language = userLocale.split('-')[0].toLowerCase()
  return formatCurrencyOutput(formattedAmount, resolvedCode, language)
}
