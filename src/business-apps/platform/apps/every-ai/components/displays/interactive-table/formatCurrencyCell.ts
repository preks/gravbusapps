import type { CurrencyCellValue } from '../../../types/models'

/** Extract ISO code from catalog refs like Currency:v1:EUR */
export function extractCurrencyCode(currencyInput: string, fallback = 'EUR'): string {
  if (!currencyInput) {
    return fallback
  }
  if (currencyInput.includes(':')) {
    const lastPart = currencyInput.split(':').pop() ?? ''
    if (/^[A-Z]{3}$/.test(lastPart)) {
      return lastPart
    }
  }
  if (/^[A-Z]{3}$/.test(currencyInput)) {
    return currencyInput
  }
  return fallback
}

export function formatCurrencyCell(cell: CurrencyCellValue): string {
  const code = extractCurrencyCode(cell.unit)
  const amount = cell.value
  if (!Number.isFinite(amount)) {
    return '—'
  }
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount)
}
