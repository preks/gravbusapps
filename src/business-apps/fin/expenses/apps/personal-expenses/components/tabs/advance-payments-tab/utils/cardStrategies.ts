/**
 * Clears table filters then keeps only currency tokens (and optionally forces most-used currency).
 * Used before applying statistics card filters so card scope matches currency dropdown behavior on other tabs.
 */
export function preserveCurrencyAndResetAdvancePayments(
  selectedFilters: string[],
  setFilters: (filters: string[]) => void,
  mostUsedCurrencyRef?: string
): void {
  let currencies = selectedFilters.filter(f => f.startsWith('currency:'))
  if (currencies.length === 0 && mostUsedCurrencyRef) {
    currencies = [`currency:${mostUsedCurrencyRef}`]
  }
  setFilters(currencies)
}
