/**
 * Currency display helpers (locale-aware, multi-currency from MVP).
 */
import { DEFAULT_CURRENCY } from '../constants'
import { getPrecision } from './money'

function getCurrentLocale(): string {
  return globalThis.navigator?.language || 'en-US'
}

/** Format an amount with its currency for display. */
export function formatCurrency(
  amount: number,
  currency: string = DEFAULT_CURRENCY,
  locale: string = getCurrentLocale()
): string {
  const value = Number.isFinite(amount) ? amount : 0
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: getPrecision(currency),
      maximumFractionDigits: getPrecision(currency)
    }).format(value)
  } catch {
    return `${value.toFixed(getPrecision(currency))} ${currency}`
  }
}

/** Format a tax rate percentage for display, e.g. "19%". */
export function formatPercent(value: number, locale: string = getCurrentLocale()): string {
  const safe = Number.isFinite(value) ? value : 0
  try {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(safe) + '%'
  } catch {
    return `${safe}%`
  }
}
