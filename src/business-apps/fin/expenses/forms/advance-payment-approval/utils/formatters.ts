import { formatNumberFunction } from '@/common/utils/windowUtils'

export const formatCurrency = (amount: number, currencyCode: string) => {
  const formattedAmount = formatNumberFunction(String(amount), '0.00[,]00')
  return `${formattedAmount} ${currencyCode || 'EUR'}`
}
