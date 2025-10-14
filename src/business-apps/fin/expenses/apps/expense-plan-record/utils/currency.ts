import { getCurrentActiveUserLocale, formatNumberFunction } from '@/common/utils/windowUtils'

export const formatCurrencyDisplay = (
  amount: number | string | null | undefined,
  currencyCode: string | null | undefined
): string => {
  if (amount === null || amount === undefined) {
    return `0 ${currencyCode || 'EUR'}`
  }

  if (amount === '' || isNaN(Number(amount))) {
    return `0 ${currencyCode || 'EUR'}`
  }

  if (currencyCode === null || currencyCode === undefined || currencyCode === '') {
    if (typeof amount === 'string' && amount.includes(' ')) {
      const parts = amount.split(' ')
      const lastPart = parts[parts.length - 1]
      if (/^[A-Z]{3}$/.test(lastPart)) {
        currencyCode = lastPart
      } else {
        currencyCode = 'EUR'
      }
    } else {
      currencyCode = 'EUR'
    }
  }

  const userLocale = getCurrentActiveUserLocale()

  let formattedAmount: string
  try {
    if (formatNumberFunction && typeof formatNumberFunction === 'function') {
      const result = formatNumberFunction(String(amount))
      if (result !== undefined && result !== null && result !== '') {
        formattedAmount = result
      } else {
        formattedAmount = new Intl.NumberFormat(userLocale).format(Number(amount))
      }
    } else {
      formattedAmount = new Intl.NumberFormat(userLocale).format(Number(amount))
    }
  } catch (_err) {
    formattedAmount = String(amount)
  }

  if (!formattedAmount || formattedAmount === 'undefined' || formattedAmount === 'null') {
    formattedAmount = new Intl.NumberFormat(userLocale).format(Number(amount))
  }

  const language = userLocale.split('-')[0].toLowerCase()

  switch (language) {
    case 'de':
    case 'fr':
      return `${formattedAmount} ${currencyCode}`
    case 'en':
      return `${currencyCode} ${formattedAmount}`
    default:
      return `${formattedAmount} ${currencyCode}`
  }
}
