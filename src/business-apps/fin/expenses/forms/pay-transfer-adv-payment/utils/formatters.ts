import { formatNumberFunction } from '@/common/utils/windowUtils'

export const formatCurrency = (amount: number, currencyCode: string) => {
  const formattedAmount = formatNumberFunction(String(amount), '0.00[,]00')
  return `${formattedAmount} ${currencyCode || 'EUR'}`
}

export const formatDateToISO = (dateString: string): string => {
  if (!dateString) {
    return new Date().toISOString()
  }

  try {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(dateString)) {
      return new Date().toISOString()
    }

    const dateWithTime = dateString + 'T00:00:00'
    const date = new Date(dateWithTime)

    if (Number.isNaN(date.getTime())) {
      return new Date().toISOString()
    }

    return date.toISOString()
  } catch {
    return new Date().toISOString()
  }
}
