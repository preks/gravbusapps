import { formatNumberFunction } from '@/common/utils/windowUtils'

// Helper function to format numbers using the global lowcoder function

export const formatCurrency = (value: number): string => {
  const formattedValue = formatNumberFunction(String(value), '0,0.00[,]00')
  return `€${formattedValue} `
}

// Helper function to calculate percentage change
export const calculatePercentChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}
