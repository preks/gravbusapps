import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

export const extractCurrencyCode = (currencyRef: string): string | null => {
  if (!currencyRef) return null

  const regex = /Currency:v1:([A-Z]{3})/i
  const match = regex.exec(currencyRef)
  if (match) return match[1].toUpperCase()

  if (/^[A-Z]{3}$/i.test(currencyRef)) {
    return currencyRef.toUpperCase()
  }

  return null
}

export const standardizeCurrencyRef = (currencyCode: string): string => {
  if (!currencyCode) return ''
  if (currencyCode.startsWith('Currency:v1:')) return currencyCode
  return `Currency:v1:${currencyCode}`
}

export const formatAmount = (amount: number | null | undefined, decimalPlaces = 2): string => {
  amount ??= 0

  const userLocale = getCurrentActiveUserLocale()
  return new Intl.NumberFormat(userLocale, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  }).format(amount)
}

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
    currencyDisplay: 'code',
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  }).format(amount)
}

export const formatCurrencyForChart = (value: number, currencyCode: string = 'EUR'): string => {
  return formatCurrency(value, currencyCode, 0)
}

export interface CurrencyCount {
  code: string
  count: number
  totalAmount: number
}

export const getMostUsedCurrency = <T extends Record<string, any>>(
  transactions: T[],
  currencyKey: keyof T,
  amountKey?: keyof T,
  defaultCurrency: string = 'EUR'
): string => {
  if (!transactions || transactions.length === 0) {
    return defaultCurrency
  }

  const currencyCounts: Record<string, CurrencyCount> = {}

  for (const transaction of transactions) {
    const currencyCode = String(transaction[currencyKey] || defaultCurrency)
    const amount = amountKey && typeof transaction[amountKey] === 'number' ? (transaction[amountKey] as number) : 1

    if (!currencyCounts[currencyCode]) {
      currencyCounts[currencyCode] = { code: currencyCode, count: 0, totalAmount: 0 }
    }

    currencyCounts[currencyCode].count += 1
    currencyCounts[currencyCode].totalAmount += amount
  }

  const currencyCountArray = Object.values(currencyCounts)

  if (currencyCountArray.length > 0) {
    currencyCountArray.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return b.totalAmount - a.totalAmount
    })
    return currencyCountArray[0].code
  }

  return defaultCurrency
}
