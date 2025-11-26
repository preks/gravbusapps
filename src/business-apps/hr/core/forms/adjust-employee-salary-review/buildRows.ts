import { formatDate, getCatalogValue } from '@/common/utils/windowUtils'
import { formatCurrencyString } from '@/common/utils/numberFormatter'
import type { ReviewRow } from '../components/ReviewRows'
import type { OldEmployeeCompensation, EmployeeSalaryData } from './types'

type TranslationFunction = (key: string, options?: { defaultValue?: string; [key: string]: any }) => string

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
 * Build salary comparison rows (old vs new) - only actual salary changes
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

  // Calculate missing monthly/annual salaries
  // Old compensation - Calculate monthly from annual if monthly is null
  const oldAnnual = oldCompensation.annualGrossSalary || 0
  const oldMonthly = oldCompensation.monthlyGrossSalary ?? (oldAnnual > 0 ? oldAnnual / 12 : null)

  // New salary data - Calculate monthly from annual if monthly is null
  const newAnnual = newSalaryData.annualGrossSalary || 0
  const newMonthly = newSalaryData.monthlyGrossSalary ?? (newAnnual > 0 ? newAnnual / 12 : null)

  // Annual Salary - Always show
  const annualRow: ReviewRow = {
    key: 'annualSalary',
    label: t('adjust-salary-review-annual-gross-salary', { defaultValue: 'Annual Gross Salary' }),
    oldValue: formatCurrencyString(oldAnnual, { currency: currencyCode, locale }),
    newValue: formatCurrencyString(newAnnual, { currency: currencyCode, locale })
  }

  // Monthly Salary - Always show (calculated if needed)
  const monthlyRow: ReviewRow = {
    key: 'monthlySalary',
    label: t('adjust-salary-review-monthly-gross-salary', { defaultValue: 'Monthly Gross Salary' }),
    oldValue: oldMonthly != null ? formatCurrencyString(oldMonthly, { currency: currencyCode, locale }) : '-',
    newValue: newMonthly != null ? formatCurrencyString(newMonthly, { currency: currencyCode, locale }) : '-'
  }

  rows.push(annualRow, monthlyRow)

  // Hourly Salary - Show if either old or new has hourly data
  const oldHourly = oldCompensation.hourlyGrossSalary
  const newHourly = newSalaryData.hourlyGrossSalary

  if (oldHourly != null || newHourly != null) {
    const hourlyRow: ReviewRow = {
      key: 'hourlySalary',
      label: t('adjust-salary-review-hourly-gross-salary', { defaultValue: 'Hourly Gross Salary' }),
      oldValue: oldHourly != null ? formatCurrencyString(oldHourly, { currency: currencyCode, locale }) : '-',
      newValue: newHourly != null ? formatCurrencyString(newHourly, { currency: currencyCode, locale }) : '-'
    }
    rows.push(hourlyRow)
  }

  return rows
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
  locale: string
): string {
  const oldHourly = oldCompensation.hourlyGrossSalary || 0
  const newHourly = newSalaryData.hourlyGrossSalary || 0
  const hourlyIncrease = newHourly - oldHourly
  const hourlyPercentageIncrease = oldHourly > 0 ? ((hourlyIncrease / oldHourly) * 100).toFixed(1) : '0.0'

  if (hourlyIncrease > 0) {
    return `+${formatCurrencyString(hourlyIncrease, { currency: currencyCode, locale })}/hr (${hourlyPercentageIncrease}% increase)`
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
  locale: string
): string {
  const oldAnnual = oldCompensation.annualGrossSalary || 0
  const newAnnual = newSalaryData.annualGrossSalary || 0

  // Only calculate increase if both values are valid (not 0/null from hourly-only scenarios)
  if (oldAnnual > 0 && newAnnual > 0) {
    const absoluteIncrease = newAnnual - oldAnnual
    const percentageIncrease = oldAnnual > 0 ? ((absoluteIncrease / oldAnnual) * 100).toFixed(1) : '0.0'

    if (absoluteIncrease > 0) {
      return `+${formatCurrencyString(absoluteIncrease, { currency: currencyCode, locale })} (${percentageIncrease}% increase)`
    }
    return formatCurrencyString(absoluteIncrease, { currency: currencyCode, locale })
  }

  // Fallback: show adjustment value if annual comparison isn't meaningful
  return adjustmentValueDisplay !== '-' ? adjustmentValueDisplay : '-'
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
    ? calculateHourlyIncreaseSummary(oldCompensation, newSalaryData, currencyCode, locale)
    : calculateAnnualIncreaseSummary(oldCompensation, newSalaryData, adjustmentValueDisplay, currencyCode, locale)

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
