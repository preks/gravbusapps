/**
 * Utility functions for formatting banking data
 */

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number, currency: string = 'EUR', locale: string = 'de-DE'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Format currency with decimals
 */
export const formatCurrencyPrecise = (amount: number, currency: string = 'EUR', locale: string = 'de-DE'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Format large numbers with K/M/B suffixes
 */
export const formatCompactNumber = (value: number, locale: string = 'de-DE'): string => {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1
  }).format(value)
}

/**
 * Format percentage
 */
export const formatPercent = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`
}

/**
 * Get time ago in human-readable format
 */
export const getTimeAgo = (date: string | Date): string => {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now.getTime() - past.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'gerade eben'
  if (diffMins < 60) return `vor ${diffMins} Min`
  if (diffHours < 24) return `vor ${diffHours} Std`
  if (diffDays === 1) return 'gestern'
  if (diffDays < 7) return `vor ${diffDays} Tagen`
  if (diffDays < 30) return `vor ${Math.floor(diffDays / 7)} Wochen`
  return `vor ${Math.floor(diffDays / 30)} Monaten`
}

/**
 * Format date to local string
 */
export const formatDate = (date: string | Date, locale: string = 'de-DE'): string => {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

/**
 * Format date and time
 */
export const formatDateTime = (date: string | Date, locale: string = 'de-DE'): string => {
  return new Date(date).toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Get priority badge variant
 */
export const getPriorityVariant = (priority: 'high' | 'medium' | 'low'): 'destructive' | 'warning' | 'default' => {
  switch (priority) {
    case 'high':
      return 'destructive'
    case 'medium':
      return 'warning'
    default:
      return 'default'
  }
}

/**
 * Get status badge variant
 */
export const getStatusVariant = (
  status: string
): 'success' | 'warning' | 'destructive' | 'default' | 'info' => {
  switch (status) {
    case 'approved':
    case 'completed':
    case 'active':
      return 'success'
    case 'pending':
    case 'in-progress':
      return 'warning'
    case 'rejected':
    case 'failed':
    case 'at-risk':
      return 'destructive'
    case 'opportunity':
      return 'info'
    default:
      return 'default'
  }
}

/**
 * Calculate urgency score based on due date
 */
export const calculateUrgency = (dueDate: string): 'high' | 'medium' | 'low' => {
  const now = new Date()
  const due = new Date(dueDate)
  const hoursUntilDue = (due.getTime() - now.getTime()) / 3600000

  if (hoursUntilDue < 4) return 'high'
  if (hoursUntilDue < 24) return 'medium'
  return 'low'
}

