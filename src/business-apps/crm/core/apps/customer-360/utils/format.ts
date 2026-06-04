/**
 * Shared formatting helpers for the Customer 360 app. Kept dependency-free so
 * every view and the KPI header format dates / numbers / currency consistently.
 */

const NUMBER_FORMATTER = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 })

export function parseDate(value?: string): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value?: string): string {
  const date = parseDate(value)
  if (!date) return ''
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateTime(value?: string): string {
  const date = parseDate(value)
  if (!date) return ''
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatNumber(value?: number): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return ''
  return NUMBER_FORMATTER.format(value)
}

export function formatCurrency(amount?: number, currency?: string): string {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return ''
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'EUR',
      maximumFractionDigits: 2
    }).format(amount)
  } catch {
    return NUMBER_FORMATTER.format(amount)
  }
}

/** Sort comparator (descending) for ISO timestamp strings; missing dates sort last. */
export function byTimestampDesc(a?: string, b?: string): number {
  const aTime = parseDate(a)?.getTime() ?? -Infinity
  const bTime = parseDate(b)?.getTime() ?? -Infinity
  return bTime - aTime
}
