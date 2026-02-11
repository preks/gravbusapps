/**
 * Utility functions for handling filter and currency changes
 * Extracted to reduce cognitive complexity in InvestmentView
 */

/**
 * Find currency object by code from available currencies
 */
export const findCurrencyByCode = (
  availableCurrencies: Array<{ id: string; code: string; value: string } | string> | undefined,
  currencyCode: string
): { id: string; code: string; value: string } | null => {
  if (!availableCurrencies || !Array.isArray(availableCurrencies)) {
    return null
  }

  const currency = availableCurrencies.find(
    (c): c is { id: string; code: string; value: string } => typeof c !== 'string' && c?.code === currencyCode
  )

  return currency || null
}

/**
 * Build filter object with currency ID
 */
export const buildFilterWithCurrency = (
  filters: Record<string, any>,
  currencyObj: { id: string; code: string; value: string } | null
): Record<string, any> => {
  const finalFilters = { ...filters }

  if (currencyObj && !finalFilters.currencyIds) {
    finalFilters.currencyIds = [currencyObj.id]
  }

  return finalFilters
}

/**
 * Build currency filter object from currency code
 */
export const buildCurrencyFilter = (
  availableCurrencies: Array<{ id: string; code: string; value: string } | string> | undefined,
  currencyCode: string
): Record<string, any> => {
  const currencyObj = findCurrencyByCode(availableCurrencies, currencyCode)
  return currencyObj ? { currencyIds: [currencyObj.id] } : {}
}
