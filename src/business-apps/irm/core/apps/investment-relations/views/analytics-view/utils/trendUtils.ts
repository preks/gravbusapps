import { extractCurrencyCode, formatCurrencyCompact } from '@/common/utils/numberFormatter'

// Helper function to calculate trend
export const calculateTrend = (
  current: number,
  previous: number
): {
  value: string
  positive: boolean
  description: string
} => {
  if (previous === 0) {
    return {
      value: current > 0 ? '100%' : '0%',
      positive: current >= 0,
      description: `${current} this month vs ${previous} last month`
    }
  }
  const change = ((current - previous) / previous) * 100
  return {
    value: `${Math.abs(change).toFixed(1)}%`,
    positive: change >= 0,
    description: `${current} this month vs ${previous} last month`
  }
}

// Helper function to format currency
// Uses central numberFormatter with skipThousands for compact formatting
export const formatCurrency = (
  amount: number,
  options?: {
    compact?: boolean
    currency?: string
  }
): string => {
  const { compact = false, currency = 'USD' } = options || {}

  if (compact) {
    return formatCurrencyCompact(amount, currency, undefined, 1, true)
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount)
}

// Helper function to format percentage
export const formatPercentage = (value: number, decimals = 1): string => {
  return `${value.toFixed(decimals)}%`
}

// Helper function to get trend color based on positive/negative
export const getTrendColor = (positive: boolean): string => {
  return positive ? '#10B981' : '#EF4444' // Green for positive, red for negative
}

// Re-export extractCurrencyCode from central utils
export { extractCurrencyCode }
