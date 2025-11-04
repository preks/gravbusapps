/**
 * Currency utility functions for CRM module
 */

/**
 * Extracts ISO currency code from API currency strings like "Currency:v1:EUR"
 * Fallback to default if extraction fails or input is falsy
 */
export const extractCurrencyCode = (currencyInput: string, fallback: string = 'EUR'): string => {
  if (!currencyInput) return fallback

  // Handle API format like "Currency:v1:EUR"
  if (currencyInput.includes(':')) {
    const parts = currencyInput.split(':')
    const lastPart = parts[parts.length - 1]
    // Validate that it looks like a 3-letter ISO code
    if (lastPart && /^[A-Z]{3}$/.test(lastPart)) {
      return lastPart
    }
  }

  // If it's already a 3-letter ISO code, use it directly
  if (/^[A-Z]{3}$/.test(currencyInput)) {
    return currencyInput
  }

  // Fallback to default
  return fallback
}

/**
 * Format currency amount with compact notation for large numbers
 * - Billions get "B" suffix (€1.2B)
 * - Millions get "M" suffix (€91.9M)
 * - Thousands and below show as normal currency (€1,500)
 */
export const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
  if (amount === undefined || amount === null || !Number.isFinite(amount)) return '-'

  // Extract ISO currency code from API format
  const currencyCode = extractCurrencyCode(currency)

  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''

  if (abs >= 1_000_000_000) {
    // Billions - format as "€1.2B"
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 1,
      minimumFractionDigits: 0
    }).format(abs / 1_000_000_000)
    return `${sign}${formatted}B`
  }

  if (abs >= 1_000_000) {
    // Millions - format as "€91.9M"
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 1,
      minimumFractionDigits: 0
    }).format(abs / 1_000_000)
    return `${sign}${formatted}M`
  }

  // Thousands and below - show as normal currency (€1,500)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(amount)
}
