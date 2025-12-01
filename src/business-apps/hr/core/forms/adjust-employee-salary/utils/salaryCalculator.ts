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
 * Convert salary to annual equivalent
 * ⚠️ Returns null for hourly (cannot convert - hours vary)
 * @param salary - Salary amount
 * @param frequency - Frequency of the salary
 * @returns Annual salary or null if hourly
 */
export const convertToAnnual = (salary: number, frequency: 'annually' | 'monthly' | 'hourly'): number | null => {
  if (frequency === 'hourly') {
    return null // Cannot convert hourly to annual - hours vary
  }
  if (frequency === 'monthly') {
    return salary * 12
  }
  // annually
  return salary
}

/**
 * Convert annual salary to other frequencies
 * ⚠️ Only supports annually/monthly (no hourly conversion)
 * @param annualSalary - Annual salary amount
 * @param frequency - Target frequency
 * @returns Converted salary
 */
export const convertFromAnnual = (annualSalary: number, frequency: 'annually' | 'monthly'): number => {
  if (frequency === 'monthly') {
    return annualSalary / 12
  }
  // annually
  return annualSalary
}

/**
 * Calculate adjustment in annual terms
 * ⚠️ Only supports annually/monthly (hourly handled separately)
 * @param adjustmentValue - Adjustment amount
 * @param adjustmentFrequency - Frequency of the adjustment
 * @returns Annual equivalent of adjustment (null for hourly)
 */
export const calculateAdjustmentInAnnual = (
  adjustmentValue: number,
  adjustmentFrequency: 'annually' | 'monthly' | 'hourly'
): number | null => {
  if (adjustmentFrequency === 'hourly') {
    return null // Hourly adjustments are NOT converted to annual
  }
  if (adjustmentFrequency === 'monthly') {
    return adjustmentValue * 12
  }
  // annually
  return adjustmentValue
}

/**
 * Check if frequency is hourly
 * @param frequency - Frequency to check
 * @returns True if frequency is hourly
 */
export const isHourlyFrequency = (frequency: string): boolean => {
  return frequency === 'hourly'
}
