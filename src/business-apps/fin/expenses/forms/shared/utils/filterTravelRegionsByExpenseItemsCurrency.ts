/**
 * Filters travel regions based on expense items' currency (shared by request & plan trip screens).
 */
export const filterTravelRegionsByExpenseItemsCurrency = (
  items: any[],
  mainRule: any,
  otherRules: any[]
): { sameRuleCurrency: boolean; valuesArray: any[] } => {
  if (!items || !items.length || !mainRule || !otherRules) {
    return { sameRuleCurrency: false, valuesArray: otherRules || [] }
  }

  const ruleCurrency = mainRule.currency?.id
  if (!ruleCurrency) {
    return { sameRuleCurrency: false, valuesArray: otherRules || [] }
  }

  const allMatch = items.every(item => item.currencyId === ruleCurrency || item.currency === ruleCurrency)

  if (allMatch) {
    return {
      sameRuleCurrency: true,
      valuesArray: otherRules.filter(rule => rule.currency?.id === ruleCurrency)
    }
  }

  return {
    sameRuleCurrency: false,
    valuesArray: otherRules.filter(rule =>
      items.some(item => {
        const itemCurrency = item.currencyId || item.currency
        return itemCurrency === rule.currency?.id
      })
    )
  }
}
