// Utility functions for the Investment Relations Lead View
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
 * Get lead status color variant based on status code
 */
export const getLeadStatusVariant = (statusCode?: string): 'default' | 'secondary' | 'destructive' => {
  switch (statusCode) {
    case 'ACTIVE':
      return 'default'
    case 'CONVERTED':
      return 'secondary'
    case 'LOST':
      return 'destructive'
    default:
      return 'secondary'
  }
}

/**
 * Calculate conversion rate from leads data
 */
export const calculateConversionRate = (leads: any[]): number => {
  if (leads.length === 0) return 0
  const convertedCount = leads.filter(lead => lead.conversionDate).length
  return Math.round((convertedCount / leads.length) * 100)
}

/**
 * Calculate total market value from leads data
 */
export const calculateTotalMarketValue = (leads: any[]): number => {
  return leads.reduce((sum, lead) => sum + (lead.marketValue || 0), 0)
}
