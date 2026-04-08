import { extractCurrencyCode } from '@/common/utils/numberFormatter'
import { formatDate } from '@/common/utils/windowUtils'

const EM_DASH = '\u2014'

/** Platform `formatDate` with a stable placeholder when the value is missing or invalid. */
export function formatDateOrDash(value: string | Date | null | undefined): string {
  if (value == null || value === '') {
    return EM_DASH
  }
  const iso = typeof value === 'string' ? value : value.toISOString()
  const out = formatDate(iso, 'date.medium')
  return out ?? EM_DASH
}

/** Two dates separated by an en dash, with placeholders when an end is missing. */
export function formatDateRangeOrDash(start: string | null | undefined, end: string | null | undefined): string {
  const a = formatDateOrDash(start)
  const b = formatDateOrDash(end)
  if (a === EM_DASH && b === EM_DASH) {
    return EM_DASH
  }
  if (a === EM_DASH) {
    return b
  }
  if (b === EM_DASH) {
    return a
  }
  return `${a} \u2013 ${b}`
}

/**
 * Catalog currency refs are stored as `Currency:v1:RON`; show the code (e.g. `RON`) in tables.
 */
export function formatCurrencyRefForDisplay(value: string | null | undefined): string {
  if (value == null || value.trim() === '') {
    return ''
  }
  const s = value.trim()
  if (!s.includes(':')) {
    return s
  }
  const last = s.split(':').pop()?.trim()
  return last && last.length > 0 ? last : s
}

/**
 * Lists amounts like expense tables: `RON 235.00` (ISO code, space, 2 decimals; tabular alignment via CSS).
 */
export function formatCurrencyCodeAmountFirst(amount: number | null | undefined, currency: string): string {
  if (amount == null || Number.isNaN(amount)) {
    return EM_DASH
  }
  const code = extractCurrencyCode(currency)
  const num = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
  return `${code} ${num}`
}
