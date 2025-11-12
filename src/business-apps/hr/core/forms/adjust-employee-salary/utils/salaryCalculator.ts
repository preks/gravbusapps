/**
 * Salary Calculator Utility Functions
 * Provides functions for calculating salary adjustments in both amount and percentage modes
 */

/**
 * Calculate percentage increase from amount increase
 * @param currentSalary - Current annual salary
 * @param increaseAmount - Amount to increase by
 * @returns Percentage increase (0-100)
 */
export const calculatePercentageFromAmount = (currentSalary: number, increaseAmount: number): number => {
  if (currentSalary <= 0) return 0
  return (increaseAmount / currentSalary) * 100
}

/**
 * Calculate amount increase from percentage increase
 * @param currentSalary - Current annual salary
 * @param increasePercentage - Percentage to increase by (0-100)
 * @returns Amount increase
 */
export const calculateAmountFromPercentage = (currentSalary: number, increasePercentage: number): number => {
  return (currentSalary * increasePercentage) / 100
}

/**
 * Calculate new salary after adjustment
 * @param currentSalary - Current annual salary
 * @param adjustmentValue - Adjustment value (amount or percentage)
 * @param adjustmentType - Type of adjustment ('amount' or 'percentage')
 * @returns New annual salary
 */
export const calculateNewSalary = (
  currentSalary: number,
  adjustmentValue: number,
  adjustmentType: 'amount' | 'percentage'
): number => {
  if (!adjustmentValue || adjustmentValue <= 0) return currentSalary

  if (adjustmentType === 'amount') {
    return currentSalary + adjustmentValue
  } else {
    // percentage
    const increaseAmount = calculateAmountFromPercentage(currentSalary, adjustmentValue)
    return currentSalary + increaseAmount
  }
}

/**
 * Format currency for display
 * @param amount - Amount to format
 * @param currencyCode - Currency code (e.g., 'EUR', 'USD')
 * @param locale - Locale string (e.g., 'en-US', 'de-DE')
 * @param options - Additional Intl.NumberFormat options
 * @returns Formatted currency string
 */
export const formatCurrencyDisplay = (
  amount: number,
  currencyCode: string,
  locale: string,
  options?: {
    minimumFractionDigits?: number
    maximumFractionDigits?: number
  }
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2
  }).format(amount)
}
