export const toChartKey = (value: string): string => {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return normalized || 'unknown'
}

export const formatCompactCurrency = (value: number, currencyCode: string): string => {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1
  }).format(value)
}

export const formatCompactNumber = (value: number): string => {
  return new Intl.NumberFormat(undefined, {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1
  }).format(value)
}

export const getDisplayCurrency = (selectedCurrency: string): string => {
  return selectedCurrency.toLowerCase() === 'all' ? 'EUR' : selectedCurrency
}
