/** True when the UI means "no currency filter" (all currencies). */
export function isAllCurrencySelection(currencyCode: string | undefined): boolean {
  const c = currencyCode?.trim() ?? ''
  return !c || c.toLowerCase() === 'all'
}
