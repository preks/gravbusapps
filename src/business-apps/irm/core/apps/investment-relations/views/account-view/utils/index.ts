// Utility functions for the Investment Relations Account View
import { formatCurrencyString } from '@/common/utils/numberFormatter'

/**
 * Format currency amount with proper formatting
 * Uses central numberFormatter for consistency
 */
export const formatCurrency = (amount: number | undefined, currency: string = 'EUR'): string => {
  if (amount === undefined || amount === null) return '-'
  return formatCurrencyString(amount, { currency, maximumFractionDigits: 2 })
}

/**
 * Format date string to localized format
 */
export const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString()
}

/**
 * Get account status color variant based on status
 */
export const getAccountStatusVariant = (isLiquidated: boolean): 'default' | 'secondary' | 'destructive' => {
  if (isLiquidated) {
    return 'destructive'
  }
  return 'default'
}

/**
 * Calculate total revenue from accounts data
 */
export const calculateTotalRevenue = (accounts: any[]): number => {
  return accounts.reduce((sum, account) => {
    if (account.accountAnnualRevenueBand) {
      // Extract numeric value from revenue band (e.g., "1000000-5000000" -> 3000000)
      const revenueRange = account.accountAnnualRevenueBand.code
      if (revenueRange && revenueRange.includes('-')) {
        const [min, max] = revenueRange.split('-').map(Number)
        if (!isNaN(min) && !isNaN(max)) {
          return sum + (min + max) / 2 // Use average of range
        }
      }
    }
    return sum
  }, 0)
}

/**
 * Calculate total employees from accounts data
 */
export const calculateTotalEmployees = (accounts: any[]): number => {
  return accounts.reduce((sum, account) => {
    if (account.companySize) {
      // Extract numeric value from company size (e.g., "100-500" -> 300)
      const sizeRange = account.companySize.code
      if (sizeRange && sizeRange.includes('-')) {
        const [min, max] = sizeRange.split('-').map(Number)
        if (!isNaN(min) && !isNaN(max)) {
          return sum + (min + max) / 2 // Use average of range
        }
      }
    }
    return sum
  }, 0)
}
