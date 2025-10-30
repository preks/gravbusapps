/**
 * Shared Analytics Utilities
 * Centralized utilities used across all analytics components
 */

// Re-export all investment utilities from central location
export {
  extractCurrencyCode,
  formatPercentage,
  formatDate,
  formatDisplayDate,
  getStatusColor,
  formatLargeNumber,
  formatNumber
} from '@/common/data/investment'

// Use the formatCurrencyCompact from investment-management utils
export { formatCurrencyCompact as formatCurrency } from '../../../utils/currencyUtils'

// Re-export utilities from the new shared/utils folder
export {
  safeCurrencyExtraction,
  extractAvailableCurrencies,
  formatCurrencyDisplay,
  getCurrencySymbol,
  validateCurrencyCode
} from './utils/currencyUtils'

export {
  calculateDurationYears,
  calculateInvestmentDuration,
  formatDuration,
  formatYearsDuration,
  isDateInRange,
  getDateRange
} from './utils/dateUtils'

export {
  filterInvestmentsByCurrency,
  hasNonZeroValues,
  shouldShowEmptyState,
  groupInvestmentsByField,
  filterByDateRange,
  sortInvestments,
  getTopItems,
  deduplicateInvestments
} from './utils/dataFilters'

export {
  CHART_COLORS,
  SEMANTIC_COLORS,
  getChartColor,
  createChartConfig,
  renderCustomizedLabel,
  formatChartNumber,
  formatChartPercentage,
  calculateChartDimensions,
  generateChartTooltipContent,
  getContrastColor
} from './utils/chartUtils.tsx'

/**
 * Calculate percentage change between current and previous values
 * Centralized function to ensure consistent comparison logic across all analytics
 */
export const calculateChange = (current: number, previous: number): { value: string; positive: boolean } => {
  if (previous === 0) {
    return { value: current > 0 ? '+100%' : '0%', positive: current > 0 }
  }

  const change = ((current - previous) / Math.abs(previous)) * 100
  const formattedChange = Math.abs(change).toFixed(1)

  return {
    value: `${change >= 0 ? '+' : '-'}${formattedChange}%`,
    positive: change >= 0
  }
}

/**
 * Standard status color mapping for investment status values
 * Centralized to ensure consistent status colors across analytics
 */
export const getInvestmentStatusColor = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'green'
    case 'inactive':
      return 'red'
    case 'pending':
      return 'orange'
    case 'completed':
      return 'blue'
    case 'cancelled':
      return 'gray'
    default:
      return 'blue'
  }
}

/**
 * Standard risk level color mapping
 */
export const getRiskLevelColor = (riskLevel: string): string => {
  switch (riskLevel?.toLowerCase()) {
    case 'low':
      return 'green'
    case 'medium':
      return 'orange'
    case 'high':
      return 'red'
    default:
      return 'blue'
  }
}

/**
 * Standard investment role color mapping
 */
export const getInvestmentRoleColor = (role: string): string => {
  switch (role?.toLowerCase()) {
    case 'lead':
      return 'purple'
    case 'co-investor':
      return 'blue'
    case 'minority':
      return 'green'
    case 'majority':
      return 'orange'
    default:
      return 'gray'
  }
}

/**
 * Standard investment phase color mapping
 */
export const getInvestmentPhaseColor = (phase: string): string => {
  switch (phase?.toLowerCase()) {
    case 'seed':
      return 'green'
    case 'series_a':
      return 'blue'
    case 'series_b':
      return 'purple'
    case 'series_c':
      return 'orange'
    case 'ipo':
      return 'gold'
    case 'growth':
      return 'indigo'
    default:
      return 'gray'
  }
}

/**
 * Fund type color mapping for liquid funds
 */
export const getFundTypeColor = (fundType: string): string => {
  switch (fundType?.toLowerCase()) {
    case 'money_market':
      return 'blue'
    case 'bond':
      return 'green'
    case 'equity':
      return 'purple'
    case 'mixed':
      return 'orange'
    case 'real_estate':
      return 'brown'
    default:
      return 'gray'
  }
}
