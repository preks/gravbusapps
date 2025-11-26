import { formatNumberFunction, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

type BadgeVariant =
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'info'
  | 'pending'
  | 'running'
  | 'paid'
  | 'overdue'
  | 'offline'

export const getOpportunityStatusBadgeVariant = (statusCode: string): BadgeVariant => {
  switch (statusCode?.toUpperCase()) {
    case 'WON':
      return 'success'
    case 'LOST':
      return 'destructive'
    case 'OPEN':
    case 'IN_PROGRESS':
      return 'running'
    case 'PENDING':
      return 'pending'
    default:
      return 'default'
  }
}

/**
 * Formats currency display based on active user locale
 * - English (en-US): EUR 1,234
 * - German (de-DE): 1.234 EUR
 * - Romanian (ro-RO): 1 234 EUR
 */
export const formatCurrency = (amount: number, currencyCode: string = 'EUR'): string => {
  // Handle null/undefined amounts
  if (amount === null || amount === undefined) {
    return `0 ${currencyCode}`
  }

  const userLocale = getCurrentActiveUserLocale()

  let formattedAmount: string
  try {
    if (formatNumberFunction) {
      const result = formatNumberFunction(Number(amount))
      if (result && result !== 'undefined' && result !== 'null') {
        formattedAmount = result
      } else {
        formattedAmount = new Intl.NumberFormat(userLocale).format(Number(amount))
      }
    } else {
      formattedAmount = new Intl.NumberFormat(userLocale).format(Number(amount))
    }
  } catch {
    formattedAmount = String(amount)
  }

  if (!formattedAmount || formattedAmount === 'undefined' || formattedAmount === 'null') {
    formattedAmount = new Intl.NumberFormat(userLocale).format(Number(amount))
  }

  const language = userLocale.split('-')[0].toLowerCase()

  switch (language) {
    case 'de':
      return `${formattedAmount} ${currencyCode}` // 1.234,56 EUR
    case 'ro':
      return `${formattedAmount} ${currencyCode}` // 1 234,56 EUR
    case 'en':
      return `${currencyCode} ${formattedAmount}` // EUR 1,234.56
    default:
      return `${formattedAmount} ${currencyCode}`
  }
}
