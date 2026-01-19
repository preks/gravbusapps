/**
 * Investment Formatters - Re-exports from Common Utils
 * All formatting uses src/common/utils - this file provides backward compatibility only
 */

import { formatCompactCurrency, extractCurrencyCode } from '@/common/utils/numberFormatter'
import { formatForDisplay } from '@/common/utils/dateFormatter'

// Re-export common utilities for backward compatibility
export {
  extractCurrencyCode,
  formatPercentage,
  formatAmount as formatLargeNumber,
  formatAmount as formatNumber
} from '@/common/utils/numberFormatter'

/**
 * Format currency with investment-specific defaults
 * Uses common formatCompactCurrency with currency reference extraction
 */
export const formatCurrency = (amount: number, currencyRef?: string): string => {
  const currency = currencyRef ? extractCurrencyCode(currencyRef) : 'EUR'
  return formatCompactCurrency(amount, currency, 0)
}

/**
 * Date formatter - uses common utilities
 */
export const formatDate = (dateString: string | null | undefined, format?: string, fallback: string = '-'): string => {
  if (!dateString) return fallback
  const formatted = formatForDisplay(dateString)
  return formatted || fallback
}

/**
 * Format date for display - re-export common utility
 */
export const formatDisplayDate = formatForDisplay

/**
 * Get status color classes based on status code or value
 * This could be moved to src/common/utils/badgeUtils.ts in the future
 */
export const getStatusColor = (status: string): string => {
  if (!status) return 'gba:bg-gray-100 gba:text-gray-800'

  const statusLower = status.toLowerCase()

  switch (statusLower) {
    // Active/Positive states - Green
    case 'active':
    case 'approved':
    case 'completed':
    case 'paid':
    case 'verified':
      return 'gba:bg-green-100 gba:text-green-800'

    // Monitoring/Processing states - Blue
    case 'monitoring':
    case 'in_progress':
    case 'assigned':
    case 'pending':
      return 'gba:bg-blue-100 gba:text-blue-800'

    // Warning/Attention states - Orange
    case 'medium':
    case 'warning':
    case 'action_required':
    case 'task':
      return 'gba:bg-orange-100 gba:text-orange-800'

    // Pending/Waiting states - Yellow
    case 'waiting':
    case 'draft':
    case 'created':
      return 'gba:bg-yellow-100 gba:text-yellow-800'

    // Inactive/Neutral states - Gray
    case 'inactive':
    case 'closed':
    case 'cancelled':
      return 'gba:bg-gray-100 gba:text-gray-800'

    // Error/Negative states - Red
    case 'error':
    case 'failed':
    case 'rejected':
      return 'gba:bg-red-100 gba:text-red-800'

    // Special states - Purple
    case 'archived':
    case 'transferred':
    case 'booked':
      return 'gba:bg-purple-100 gba:text-purple-800'

    default:
      return 'gba:bg-gray-100 gba:text-gray-800'
  }
}

// NOTE: Chart utilities (CHART_COLORS, renderCustomizedLabel, renderLineTooltip)
// have been temporarily removed to fix import issues.
// Components should use local chart utilities for now.
