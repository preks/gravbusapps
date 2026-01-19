/**
 * Currency utility functions for expense request wizard
 */

/**
 * Get currency from travel region
 * @param expenseRulesData - Expense rules data
 * @param travelRegion - Travel region reference
 * @returns Currency ID or null
 */
export const getCurrencyFromTravelRegion = (expenseRulesData: any, travelRegion: string): string | null => {
  if (!expenseRulesData || !travelRegion) return null

  const travelRegionRule = expenseRulesData.AllowanceRegionRuleDetail?.find(
    (element: any) => element.travelRegionRef === travelRegion
  )

  return travelRegionRule?.currency ? travelRegionRule.currency.id || null : null
}

/**
 * Determine currency based on trip data
 * @param startLocation - Start location data
 * @param destinations - Destinations data
 * @param endLocation - End location data
 * @param expenseRulesData - Expense rules data
 * @returns Currency ID or null
 */
export const determineCurrency = (
  startLocation: any,
  destinations: any[],
  endLocation: any,
  expenseRulesData: any
): string | null => {
  // Check if start location is abroad
  if (startLocation?.isAbroad) {
    return getCurrencyFromTravelRegion(expenseRulesData, startLocation.travelRegionRef)
  }

  // Check if end location is abroad
  if (endLocation?.isAbroad) {
    return getCurrencyFromTravelRegion(expenseRulesData, endLocation.travelRegionRef)
  }

  // Check if any destination is abroad
  if (Array.isArray(destinations)) {
    for (const destination of destinations) {
      if (destination?.isAbroad) {
        return getCurrencyFromTravelRegion(expenseRulesData, destination.travelRegionRef)
      }
    }
  }

  // Default to start location travel region
  return getCurrencyFromTravelRegion(expenseRulesData, startLocation?.travelRegionRef)
}

/**
 * Get currency with fallback to expense rule currency
 * @param startLocation - Start location data
 * @param destinations - Destinations data
 * @param endLocation - End location data
 * @param expenseRulesData - Expense rules data
 * @returns Currency ID or null
 */
export const getCurrencyWithFallback = (
  startLocation: any,
  destinations: any[],
  endLocation: any,
  expenseRulesData: any
): string | null => {
  const currencyFromTrip = determineCurrency(startLocation, destinations, endLocation, expenseRulesData)

  // Return currency from trip or fallback to expense rule currency
  return (
    currencyFromTrip ||
    (expenseRulesData?.ExpenseRuleByPk?.currency ? expenseRulesData.ExpenseRuleByPk.currency.id : null)
  )
}
