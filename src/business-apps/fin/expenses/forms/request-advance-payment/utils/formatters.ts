/**
 * Format currency amount with proper locale and currency code
 * @param amount - The amount to format
 * @param currencyCode - The currency code (e.g., 'EUR', 'USD')
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, currencyCode: string): string => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  } catch {
    console.error('Error formatting currency:', error)
    return `${amount.toFixed(2)} ${currencyCode}`
  }
}

/**
 * Extract currency code from currency ID format (e.g., "Currency:v1:EUR" -> "EUR")
 * @param currencyId - The currency ID in format "Currency:v1:CODE"
 * @returns The currency code
 */
export const extractCurrencyCode = (currencyId: string): string => {
  if (!currencyId) return 'EUR'

  const parts = currencyId.split(':')
  return parts[parts.length - 1] || 'EUR'
}

/**
 * Format date to display format
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    console.error('Error formatting date:', error)
    return dateString
  }
}

/**
 * Get display name for expense plan
 * @param plan - Expense plan object
 * @returns Formatted display name
 */
export const getExpensePlanDisplayName = (plan: { code: string; title: string }): string => {
  return `${plan.code} - ${plan.title}`
}
