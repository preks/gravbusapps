import { formatCurrency } from '@/common/utils/numberFormatter'

export const formatAxisCurrency = (value: number, currencyCode: string): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(Number(value))

export const formatTooltipCurrency = (value: number, currencyCode: string): string =>
  formatCurrency(Number(value), currencyCode)
