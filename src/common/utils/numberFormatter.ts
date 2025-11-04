/**
 * Number and currency formatting helpers used across apps
 * - Compact formatting: 1,200 -> 1.2K, 5,000,000 -> 5M, etc.
 * - Currency formatting (string or parts) with locale awareness
 * - Single, extendable API points for future localization work
 *
 * Convention: K (thousand), M (million), B (billion), T (trillion)
 * Based on common product analytics conventions (e.g., YouTube, financial dashboards).
 */

import { getCurrentActiveUserLocale, formatNumberFunction as formatNumberWithMask } from '@/common/utils/windowUtils'

/**
 * Formats numbers with compact notation (K, M, B, T)
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string like "1.5M", "2.3B", "500K"
 *
 * @example
 * formatAmount(1500000)        → "1.5M"  (default 1 decimal)
 * formatAmount(1500000, 0)     → "2M"    (no decimals)
 * formatAmount(1500000, 2)     → "1.50M" (2 decimals)
 * formatAmount(-1000000)       → "-1.0M" (handles negatives)
 * formatAmount(1500000000000)  → "1.5T"  (supports trillions)
 */
export const formatAmount = (value: number | null | undefined, decimals: number = 1): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '0'
  }

  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''

  if (abs >= 1_000_000_000_000) {
    return `${sign}${(abs / 1_000_000_000_000).toFixed(decimals)}T`
  }
  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(decimals)}B`
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(decimals)}M`
  }
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(decimals)}K`
  }

  // For small numbers, show without abbreviation
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value as number)
}

export const formatCompactCurrency = (
  amount: number | null | undefined,
  currencyCode: string = 'USD',
  maximumFractionDigits: number = 1
): string => {
  if (amount === null || amount === undefined || !isFinite(amount as number)) {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    }).format(0)
  }

  const abs = Math.abs(amount as number)
  const sign = (amount as number) < 0 ? '-' : ''

  const format = (num: number) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits,
      minimumFractionDigits: 0
    }).format(num)

  if (abs >= 1_000_000_000_000) return `${sign}${format(abs / 1_000_000_000_000)}T`
  if (abs >= 1_000_000_000) return `${sign}${format(abs / 1_000_000_000)}B`
  if (abs >= 1_000_000) return `${sign}${format(abs / 1_000_000)}M`
  if (abs >= 1_000) return `${sign}${format(abs / 1_000)}K`

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(amount as number)
}

/**
 * Format percentage with specified decimal places
 * @param value - The numeric value to format as percentage
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number | null | undefined, decimals: number = 1): string => {
  if (value === null || value === undefined || !isFinite(value)) {
    return '0%'
  }
  return `${value.toFixed(decimals)}%`
}

/**
 * Extract currency code from reference string (e.g., "Currency:v1:EUR" -> "EUR")
 * Common pattern in business applications
 * @param currencyRef - Currency reference string
 * @returns Currency code or default
 */
export const extractCurrencyCode = (currencyRef: string | null | undefined): string => {
  if (!currencyRef) return 'EUR'
  return currencyRef.split(':').pop() || 'EUR'
}

// Resolve effective locale (defaults to platform locale when available)
const resolveLocale = (locale?: string): string | undefined => {
  try {
    const platformLocale = getCurrentActiveUserLocale?.()
    return locale || platformLocale || undefined
  } catch {
    return locale || undefined
  }
}

/**
 * Generic number formatter (decimal). Optional compact notation.
 */
export const formatNumber = (
  value: number | null | undefined,
  options?: {
    locale?: string
    minimumFractionDigits?: number
    maximumFractionDigits?: number
    useGrouping?: boolean
    compact?: boolean
  }
): string => {
  if (value === null || value === undefined || !isFinite(value)) return '0'
  const locale = resolveLocale(options?.locale)
  const notation = options?.compact ? 'compact' : 'standard'
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
    useGrouping: options?.useGrouping ?? true,
    notation
  }).format(value)
}

// New helpers for unified currency formatting across apps
export interface CurrencyParts {
  number: string
  symbol: string
}

/**
 * Format an amount returning number text and a narrow currency symbol separately.
 * Use this to render number-only plus right-aligned symbol consistently.
 */
export const formatCurrencyParts = (
  amount: number | null | undefined,
  options?: { currency?: string; locale?: string; minimumFractionDigits?: number; maximumFractionDigits?: number }
): CurrencyParts => {
  const currency = options?.currency || 'EUR'
  const locale = resolveLocale(options?.locale)
  const min = options?.minimumFractionDigits ?? 0
  const max = options?.maximumFractionDigits ?? 2

  if (amount === null || amount === undefined || !isFinite(amount as number)) {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: min,
      maximumFractionDigits: max
    }).formatToParts(0)
    const symbol = parts.find(p => p.type === 'currency')?.value || currency
    const number = parts
      .filter(p => p.type !== 'currency')
      .map(p => p.value)
      .join('')
    return { number, symbol }
  }

  const parts = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: min,
    maximumFractionDigits: max
  }).formatToParts(amount as number)
  return {
    number: parts
      .filter(p => p.type !== 'currency')
      .map(p => p.value)
      .join(''),
    symbol: parts.find(p => p.type === 'currency')?.value || currency
  }
}

/** Get only the currency symbol for a code (narrowSymbol). */
export const getCurrencySymbol = (currencyCode?: string, locale?: string): string => {
  try {
    const code = currencyCode || 'EUR'
    const parts = new Intl.NumberFormat(resolveLocale(locale), {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol'
    }).formatToParts(0)
    return parts.find(p => p.type === 'currency')?.value || code
  } catch {
    return '€'
  }
}

/** String version of currency formatter (non-compact). */
export const formatCurrencyString = (
  amount: number | null | undefined,
  options?: { currency?: string; locale?: string; minimumFractionDigits?: number; maximumFractionDigits?: number }
): string => {
  const currency = options?.currency || 'EUR'
  const locale = resolveLocale(options?.locale)
  const min = options?.minimumFractionDigits ?? 0
  const max = options?.maximumFractionDigits ?? 2
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: min,
    maximumFractionDigits: max
  }).format((amount ?? 0) as number)
}

/**
 * Simple currency formatter (non-compact) with basic signature for backward compatibility
 * @param amount - The amount to format
 * @param currency - Currency code or catalog reference (e.g., 'EUR' or 'Currency:v1:EUR')
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number | null | undefined, currency: string = 'EUR'): string => {
  const currencyCode = extractCurrencyCode(currency)
  return formatCurrencyString(amount, { currency: currencyCode, maximumFractionDigits: 2 })
}

/**
 * Convenience: returns a single string with compact currency (1.2M, etc.) honoring locale.
 */
export const formatCurrencyCompact = (
  amount: number | null | undefined,
  currency: string = 'EUR',
  locale?: string,
  maximumFractionDigits: number = 1
): string => {
  if (amount === null || amount === undefined || !isFinite(amount as number)) {
    return new Intl.NumberFormat(resolveLocale(locale), {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    }).format(0)
  }
  const abs = Math.abs(amount as number)
  const sign = (amount as number) < 0 ? '-' : ''
  const format = (num: number) =>
    new Intl.NumberFormat(resolveLocale(locale), {
      style: 'currency',
      currency,
      maximumFractionDigits,
      minimumFractionDigits: 0
    }).format(num)
  if (abs >= 1_000_000_000_000) return `${sign}${format(abs / 1_000_000_000_000)}T`
  if (abs >= 1_000_000_000) return `${sign}${format(abs / 1_000_000_000)}B`
  if (abs >= 1_000_000) return `${sign}${format(abs / 1_000_000)}M`
  if (abs >= 1_000) return `${sign}${format(abs / 1_000)}K`
  return new Intl.NumberFormat(resolveLocale(locale), {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(amount as number)
}

/** Wrapper to use platform number mask formatting when available. */
export const formatWithPattern = (value: number | string, pattern: string): string => {
  try {
    const val = typeof value === 'number' ? String(value) : value
    return formatNumberWithMask ? formatNumberWithMask(val, pattern) : val
  } catch {
    return String(value ?? '')
  }
}
