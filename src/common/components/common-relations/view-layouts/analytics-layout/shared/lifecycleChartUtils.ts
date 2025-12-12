/**
 * Shared utilities for lifecycle charts (Accounts, Leads, Contacts, Opportunities)
 * Extracted to reduce code duplication across chart components
 */

export type TimeFilter = 'month' | 'quarter' | 'sixMonths' | 'year' | 'historical'

export interface TimeFilterOption {
  key: TimeFilter
  label: string
}

export const TIME_FILTER_OPTIONS: TimeFilterOption[] = [
  { key: 'month', label: 'Last Month' },
  { key: 'quarter', label: 'Last Quarter' },
  { key: 'sixMonths', label: 'Last 6 Months' },
  { key: 'year', label: 'Last Year' },
  { key: 'historical', label: 'Historical' }
]

/**
 * Format X-axis labels based on the selected time filter
 */
export const formatLifecycleXAxisLabel = (value: string, selectedTimeFilter: TimeFilter): string => {
  const date = new Date(value)

  if (selectedTimeFilter === 'historical') {
    return date.getFullYear().toString() // "2024"
  }

  if (selectedTimeFilter === 'month') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) // "Nov 1"
  }

  // For quarter, sixMonths, and year: show month + year
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) // "Nov 2025"
}

/**
 * Get the display label for the current time filter
 */
export const getCurrentFilterLabel = (selectedTimeFilter: TimeFilter): string => {
  return TIME_FILTER_OPTIONS.find(option => option.key === selectedTimeFilter)?.label || 'Last 6 Months'
}
