/**
 * @module shared/utils
 * @description Central export for all shared utility functions in analytics views.
 * Provides currency, date, data filtering, and chart utilities.
 */

// Currency utilities
export {
  extractCurrencyCode,
  safeCurrencyExtraction,
  extractAvailableCurrencies,
  formatCurrencyDisplay,
  getCurrencySymbol,
  validateCurrencyCode
} from './currencyUtils'

// Date utilities
export {
  calculateDurationYears,
  calculateInvestmentDuration,
  formatDuration,
  formatYearsDuration,
  formatDate,
  isDateInRange,
  getDateRange
} from './dateUtils'

// Data filtering utilities
export {
  filterInvestmentsByCurrency,
  hasNonZeroValues,
  shouldShowEmptyState,
  groupInvestmentsByField,
  filterByDateRange,
  sortInvestments,
  getTopItems,
  deduplicateInvestments
} from './dataFilters'

// Chart utilities
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
} from './chartUtils.tsx'

// Re-export commonly used utilities from parent shared/utils.ts for convenience
export { formatCurrencyCompact, formatCurrency, calculateChange } from '../utils'
