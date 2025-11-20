/**
 * Salary calculation and normalization utilities
 * Handles conversion between monthly, yearly, and hourly rates
 */

export interface NormalizedSalaryData {
  yearly: number | null
  monthly: number | null
  hourly: number | null
  hasYearly: boolean
  hasMonthly: boolean
  hasHourly: boolean
  hourlyWasProvided: boolean // Track if hourly was provided by database (not calculated)
  isHourlyOnly: boolean // True if only hourly rate is available (no yearly/monthly)
  currencyCode: string
}

/**
 * Calculate yearly salary from monthly
 * @param monthly - Monthly salary amount
 * @returns Yearly salary (monthly * 12)
 */
export const calculateYearlyFromMonthly = (monthly: number): number => {
  return monthly * 12
}

/**
 * Calculate monthly salary from yearly
 * @param yearly - Yearly salary amount
 * @returns Monthly salary (yearly / 12)
 */
export const calculateMonthlyFromYearly = (yearly: number): number => {
  return yearly / 12
}

/**
 * Check if a salary value is valid (not null, undefined, NaN, or 0)
 * @param value - Salary value to validate
 * @returns True if value is a valid positive number
 */
const isValidSalaryValue = (value: number | null | undefined): boolean => {
  return value != null && typeof value === 'number' && !Number.isNaN(value) && value !== 0
}

/**
 * Normalize salary data by calculating missing values when possible
 * Priority: Use provided values, calculate missing ones from available data
 *
 * @param yearlySalary - Yearly salary from database (can be null)
 * @param monthlySalary - Monthly salary from database (can be null)
 * @param hourlyRate - Hourly rate from database (can be null)
 * @param currencyCode - Currency code for the salary
 * @returns Normalized salary data with calculated values
 */
export const normalizeSalaryData = (
  yearlySalary: number | null | undefined,
  monthlySalary: number | null | undefined,
  hourlyRate: number | null | undefined,
  currencyCode: string = 'EUR'
): NormalizedSalaryData => {
  // Normalize values: convert null/undefined/0/NaN to null
  // Treat 0 as "no data" since salary cannot be 0
  const yearly: number | null = isValidSalaryValue(yearlySalary) ? (yearlySalary as number) : null
  const monthly: number | null = isValidSalaryValue(monthlySalary) ? (monthlySalary as number) : null
  const hourly: number | null = isValidSalaryValue(hourlyRate) ? (hourlyRate as number) : null

  // Track if hourly was originally provided (not calculated)
  const hourlyWasProvided = hourly != null

  // Check if this is hourly-only mode (only hourly provided, no yearly/monthly)
  const isHourlyOnly = hourly != null && yearly == null && monthly == null

  let normalizedYearly = yearly
  let normalizedMonthly = monthly
  const normalizedHourly = hourly

  // Calculate missing values based on available data
  // Priority: yearly > monthly
  // Note: Hourly is only displayed if provided by database, never calculated

  if (normalizedYearly != null && normalizedMonthly == null) {
    normalizedMonthly = calculateMonthlyFromYearly(normalizedYearly)
  }

  if (normalizedMonthly != null && normalizedYearly == null) {
    normalizedYearly = calculateYearlyFromMonthly(normalizedMonthly)
  }

  return {
    yearly: normalizedYearly,
    monthly: normalizedMonthly,
    hourly: normalizedHourly, // Only use provided hourly, not calculated
    hasYearly: normalizedYearly != null,
    hasMonthly: normalizedMonthly != null,
    hasHourly: hourlyWasProvided && normalizedHourly != null, // Only true if provided by database
    hourlyWasProvided,
    isHourlyOnly,
    currencyCode
  }
}

/**
 * Check if salary data exists (at least one value is available)
 * @param normalizedData - Normalized salary data
 * @returns True if any salary data exists
 */
export const hasAnySalaryData = (normalizedData: NormalizedSalaryData): boolean => {
  return normalizedData.hasYearly || normalizedData.hasMonthly || normalizedData.hasHourly
}
