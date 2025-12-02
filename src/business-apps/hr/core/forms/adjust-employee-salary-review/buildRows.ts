import { formatDate, getCatalogValue } from '@/common/utils/windowUtils'
import { formatCurrencyString } from '@/common/utils/numberFormatter'
import type { ReviewRow } from '../components/ReviewRows'
import type { OldEmployeeCompensation, EmployeeSalaryData } from './types'

type TranslationFunction = (key: string, options?: { defaultValue?: string; [key: string]: any }) => string

/**
 * Simple detail row for single-column display (used in assign mode)
 */
export interface DetailRow {
  key: string
  label: string
  value: string
}

interface SalaryAdjustReasonEntry {
  id: string
  code: string
  value: string
  displayOrder: number | null
  translations: Array<{
    localeCode: string
    value: string
  }>
  catalog: {
    identifier: string
    version: string
    defaultLocale: string
  }
}

export interface AdjustmentDetails {
  adjustmentType: string
  adjustmentValue: string
  adjustmentFrequency: string
  effectiveDate: string
  reason: string
  notes?: string
  increaseSummary: string
}

const extractCurrencyCode = (currencyRef: string | null): string => {
  if (!currencyRef) return 'EUR'
  // Extract currency code from reference format like "Currency:v1:EUR" or just "EUR"
  const parts = currencyRef.split(':')
  return parts[parts.length - 1] || 'EUR'
}

/**
 * Format currency value or return '-' if null/undefined
 */
function formatCurrencyOrDash(value: number | null | undefined, currencyCode: string, locale: string): string {
  return value === null || value === undefined ? '-' : formatCurrencyString(value, { currency: currencyCode, locale })
}

/**
 * Build salary comparison rows (old vs new) - only rows with actual data
 * Hides rows that have no meaningful salary data (both old and new are 0 or null)
 */
export function buildSalaryComparisonRows(params: {
  oldCompensation: OldEmployeeCompensation
  newSalaryData: EmployeeSalaryData
  locale: string
  t: TranslationFunction
}): ReviewRow[] {
  const { oldCompensation, newSalaryData, locale, t } = params
  const rows: ReviewRow[] = []

  const currencyCode = extractCurrencyCode(oldCompensation.currencyRef)

  // Get raw values from salary data
  const rawOldAnnual = oldCompensation.annualGrossSalary
  const rawOldMonthly = oldCompensation.monthlyGrossSalary
  const rawNewAnnual = newSalaryData.annualGrossSalary
  const rawNewMonthly = newSalaryData.monthlyGrossSalary
  const oldHourly = oldCompensation.hourlyGrossSalary
  const newHourly = newSalaryData.hourlyGrossSalary

  // Calculate annual - use provided value, or calculate from monthly if available
  const oldAnnual =
    rawOldAnnual && rawOldAnnual > 0 ? rawOldAnnual : rawOldMonthly && rawOldMonthly > 0 ? rawOldMonthly * 12 : 0
  const newAnnual =
    rawNewAnnual && rawNewAnnual > 0 ? rawNewAnnual : rawNewMonthly && rawNewMonthly > 0 ? rawNewMonthly * 12 : 0

  // Calculate monthly - use provided value, or calculate from annual if available
  const oldMonthly = rawOldMonthly && rawOldMonthly > 0 ? rawOldMonthly : oldAnnual > 0 ? oldAnnual / 12 : null
  const newMonthly = rawNewMonthly && rawNewMonthly > 0 ? rawNewMonthly : newAnnual > 0 ? newAnnual / 12 : null

  // Check if annual/monthly data exists (at least one side has raw data > 0)
  const hasAnnualMonthlyData =
    (rawOldAnnual && rawOldAnnual > 0) ||
    (rawOldMonthly && rawOldMonthly > 0) ||
    (rawNewAnnual && rawNewAnnual > 0) ||
    (rawNewMonthly && rawNewMonthly > 0)

  // Check if hourly data exists (at least one side has data > 0)
  const hasHourlyData =
    (oldHourly !== null && oldHourly !== undefined && oldHourly > 0) ||
    (newHourly !== null && newHourly !== undefined && newHourly > 0)

  // Annual Salary - Only show if there's actual annual/monthly data
  if (hasAnnualMonthlyData) {
    rows.push({
      key: 'annualSalary',
      label: t('adjust-salary-review-annual-gross-salary', { defaultValue: 'Annual Gross Salary' }),
      oldValue: formatCurrencyString(oldAnnual, { currency: currencyCode, locale }),
      newValue: formatCurrencyString(newAnnual, { currency: currencyCode, locale })
    })

    // Monthly Salary - Only show if annual/monthly data exists
    rows.push({
      key: 'monthlySalary',
      label: t('adjust-salary-review-monthly-gross-salary', { defaultValue: 'Monthly Gross Salary' }),
      oldValue: formatCurrencyOrDash(oldMonthly, currencyCode, locale),
      newValue: formatCurrencyOrDash(newMonthly, currencyCode, locale)
    })
  }

  // Hourly Salary - Only show if there's actual hourly data
  if (hasHourlyData) {
    rows.push({
      key: 'hourlySalary',
      label: t('adjust-salary-review-hourly-gross-salary', { defaultValue: 'Hourly Gross Salary' }),
      oldValue: formatCurrencyOrDash(oldHourly, currencyCode, locale),
      newValue: formatCurrencyOrDash(newHourly, currencyCode, locale)
    })
  }

  return rows
}

/**
 * Build detail rows for assign mode (single-column, no comparison)
 * Shows only the new salary being assigned to the employee
 */
export function buildNewSalaryDetailRows(params: {
  newSalaryData: EmployeeSalaryData
  locale: string
  t: TranslationFunction
}): DetailRow[] {
  const { newSalaryData, locale, t } = params
  const rows: DetailRow[] = []

  const currencyCode = extractCurrencyCode(newSalaryData.currencyRef)

  // Get raw values from salary data
  const rawAnnual = newSalaryData.annualGrossSalary
  const rawMonthly = newSalaryData.monthlyGrossSalary
  const newHourly = newSalaryData.hourlyGrossSalary

  // Calculate annual - use provided value, or calculate from monthly if available
  const newAnnual = rawAnnual && rawAnnual > 0 ? rawAnnual : rawMonthly && rawMonthly > 0 ? rawMonthly * 12 : 0

  // Calculate monthly - use provided value, or calculate from annual if available
  const newMonthly = rawMonthly && rawMonthly > 0 ? rawMonthly : newAnnual > 0 ? newAnnual / 12 : null

  // Determine salary type based on what's being assigned
  // Only consider hourly if there's no annual/monthly data at all
  const hasAnnualMonthlyData = (rawAnnual && rawAnnual > 0) || (rawMonthly && rawMonthly > 0)
  const isHourlySalary = newHourly !== null && newHourly !== undefined && newHourly > 0 && !hasAnnualMonthlyData

  if (isHourlySalary) {
    // Hourly salary assignment
    rows.push({
      key: 'hourlySalary',
      label: t('assign-salary-review-hourly-salary', { defaultValue: 'Hourly Gross Salary' }),
      value: formatCurrencyString(newHourly, { currency: currencyCode, locale })
    })
  } else {
    // Annual/Monthly salary assignment - only show rows with meaningful values
    if (newAnnual > 0) {
      rows.push({
        key: 'annualSalary',
        label: t('assign-salary-review-annual-salary', { defaultValue: 'Annual Gross Salary' }),
        value: formatCurrencyString(newAnnual, { currency: currencyCode, locale })
      })
    }

    if (newMonthly !== null && newMonthly > 0) {
      rows.push({
        key: 'monthlySalary',
        label: t('assign-salary-review-monthly-salary', { defaultValue: 'Monthly Gross Salary' }),
        value: formatCurrencyString(newMonthly, { currency: currencyCode, locale })
      })
    }
  }

  // Currency
  rows.push({
    key: 'currency',
    label: t('assign-salary-review-currency', { defaultValue: 'Currency' }),
    value: currencyCode
  })

  return rows
}

/**
 * Build assignment details for assign mode (no comparison/increase)
 */
export function buildAssignmentDetails(params: { newSalaryData: EmployeeSalaryData }): {
  startDate: string
  notes?: string
} {
  const { newSalaryData } = params

  const startDateFormatted = formatEffectiveDate(newSalaryData.startDate)

  return {
    startDate: startDateFormatted,
    notes: String(newSalaryData.notes ?? '').trim() || undefined
  }
}

/**
 * Format adjustment value display based on type
 */
function formatAdjustmentValueDisplay(newSalaryData: EmployeeSalaryData, currencyCode: string, locale: string): string {
  if (newSalaryData.requestedPercent) {
    return `${newSalaryData.requestedPercent}%`
  }
  if (newSalaryData.requestedAmount) {
    return formatCurrencyString(newSalaryData.requestedAmount, { currency: currencyCode, locale })
  }
  return '-'
}

/**
 * Check if this is an hourly-only adjustment
 */
function isHourlyOnlyAdjustment(oldCompensation: OldEmployeeCompensation, newSalaryData: EmployeeSalaryData): boolean {
  const hasHourlyChange =
    newSalaryData.hourlyGrossSalary != null &&
    oldCompensation.hourlyGrossSalary != null &&
    newSalaryData.hourlyGrossSalary !== oldCompensation.hourlyGrossSalary

  const annualUnchanged =
    newSalaryData.annualGrossSalary === oldCompensation.annualGrossSalary ||
    (newSalaryData.annualGrossSalary === 0 && oldCompensation.annualGrossSalary === 0)

  return hasHourlyChange && annualUnchanged
}

/**
 * Calculate increase summary for hourly adjustments
 */
function calculateHourlyIncreaseSummary(
  oldCompensation: OldEmployeeCompensation,
  newSalaryData: EmployeeSalaryData,
  currencyCode: string,
  locale: string,
  t: TranslationFunction
): string {
  const oldHourly = oldCompensation.hourlyGrossSalary || 0
  const newHourly = newSalaryData.hourlyGrossSalary || 0
  const hourlyIncrease = newHourly - oldHourly
  const hourlyPercentageIncrease = oldHourly > 0 ? ((hourlyIncrease / oldHourly) * 100).toFixed(1) : '0.0'

  if (hourlyIncrease > 0) {
    const increaseText = t('adjust-salary-review-increase-text', {
      percentage: hourlyPercentageIncrease,
      defaultValue: `${hourlyPercentageIncrease}% increase`
    })
    return `+${formatCurrencyString(hourlyIncrease, { currency: currencyCode, locale })}/hr (${increaseText})`
  }
  return formatCurrencyString(hourlyIncrease, { currency: currencyCode, locale }) + '/hr'
}

/**
 * Calculate increase summary for annual adjustments
 */
function calculateAnnualIncreaseSummary(
  oldCompensation: OldEmployeeCompensation,
  newSalaryData: EmployeeSalaryData,
  adjustmentValueDisplay: string,
  currencyCode: string,
  locale: string,
  t: TranslationFunction
): string {
  const oldAnnual = oldCompensation.annualGrossSalary || 0
  const newAnnual = newSalaryData.annualGrossSalary || 0

  // Only calculate increase if both values are valid (not 0/null from hourly-only scenarios)
  if (oldAnnual > 0 && newAnnual > 0) {
    const absoluteIncrease = newAnnual - oldAnnual
    const percentageIncrease = oldAnnual > 0 ? ((absoluteIncrease / oldAnnual) * 100).toFixed(1) : '0.0'

    if (absoluteIncrease > 0) {
      const increaseText = t('adjust-salary-review-increase-text', {
        percentage: percentageIncrease,
        defaultValue: `${percentageIncrease}% increase`
      })
      return `+${formatCurrencyString(absoluteIncrease, { currency: currencyCode, locale })} (${increaseText})`
    }
    return formatCurrencyString(absoluteIncrease, { currency: currencyCode, locale })
  }

  // Fallback: show adjustment value if annual comparison isn't meaningful
  return adjustmentValueDisplay === '-' ? '-' : adjustmentValueDisplay
}

/**
 * Format effective date
 */
function formatEffectiveDate(startDate: string | null | undefined): string {
  if (!startDate) {
    return '-'
  }
  return formatDate(startDate, 'date.short') ?? startDate
}

/**
 * Extract and format reason display from catalog entries
 */
function extractReasonDisplay(
  salaryAdjustReason: string | null | undefined,
  salaryAdjustReasonEntries: SalaryAdjustReasonEntry[]
): string {
  const defaultReason = String(salaryAdjustReason ?? '-').trim() || '-'

  if (!salaryAdjustReason || salaryAdjustReasonEntries.length === 0) {
    return defaultReason
  }

  // Extract code from catalog reference format: "SalaryAdjustReason:v1:promotion" -> "promotion"
  const catalogRefParts = salaryAdjustReason.split(':')
  const reasonCode = catalogRefParts[catalogRefParts.length - 1]

  // Find matching catalog entry
  const reasonEntry = salaryAdjustReasonEntries.find(entry => entry.code === reasonCode)
  if (reasonEntry) {
    return getCatalogValue(reasonEntry) ?? reasonEntry.value ?? reasonCode
  }

  return defaultReason
}

/**
 * Build adjustment details as informational data (not comparison)
 */
export function buildAdjustmentDetails(params: {
  oldCompensation: OldEmployeeCompensation
  newSalaryData: EmployeeSalaryData
  locale: string
  salaryAdjustReasonEntries?: SalaryAdjustReasonEntry[]
  t: TranslationFunction
}): AdjustmentDetails {
  const { oldCompensation, newSalaryData, locale, salaryAdjustReasonEntries = [], t } = params

  const currencyCode = extractCurrencyCode(oldCompensation.currencyRef)
  const adjustmentValueDisplay = formatAdjustmentValueDisplay(newSalaryData, currencyCode, locale)

  // Calculate increase summary (e.g., "+€6,000 (10% increase)")
  const isHourlyAdjustment = isHourlyOnlyAdjustment(oldCompensation, newSalaryData)
  const increaseSummary = isHourlyAdjustment
    ? calculateHourlyIncreaseSummary(oldCompensation, newSalaryData, currencyCode, locale, t)
    : calculateAnnualIncreaseSummary(oldCompensation, newSalaryData, adjustmentValueDisplay, currencyCode, locale, t)

  const effectiveDateFormatted = formatEffectiveDate(newSalaryData.startDate)
  const reasonDisplay = extractReasonDisplay(newSalaryData.salaryAdjustReason, salaryAdjustReasonEntries)

  const adjustmentType = newSalaryData.requestedPercent
    ? t('adjust-salary-adjustment-type-percentage', { defaultValue: 'Percentage Increase' })
    : t('adjust-salary-adjustment-type-amount', { defaultValue: 'Amount Increase' })

  return {
    adjustmentType,
    adjustmentValue: adjustmentValueDisplay,
    adjustmentFrequency: '-', // Not used in new model
    effectiveDate: effectiveDateFormatted,
    reason: reasonDisplay,
    notes: String(newSalaryData.notes ?? '').trim() || undefined,
    increaseSummary
  }
}
