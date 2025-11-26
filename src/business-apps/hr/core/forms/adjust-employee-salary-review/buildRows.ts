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
  const oldMonthly =
    oldCompensation.monthlyGrossSalary != null
      ? oldCompensation.monthlyGrossSalary
      : oldAnnual > 0
        ? oldAnnual / 12
        : null

  // New salary data - Calculate monthly from annual if monthly is null
  const newAnnual = newSalaryData.annualGrossSalary || 0
  const newMonthly =
    newSalaryData.monthlyGrossSalary != null ? newSalaryData.monthlyGrossSalary : newAnnual > 0 ? newAnnual / 12 : null

  // Annual Salary - Always show
  rows.push({
    key: 'annualSalary',
    label: t('adjust-salary-review-annual-gross-salary', { defaultValue: 'Annual Gross Salary' }),
    oldValue: formatCurrencyString(oldAnnual, { currency: currencyCode, locale }),
    newValue: formatCurrencyString(newAnnual, { currency: currencyCode, locale })
  })

  // Monthly Salary - Always show (calculated if needed)
  rows.push({
    key: 'monthlySalary',
    label: t('adjust-salary-review-monthly-gross-salary', { defaultValue: 'Monthly Gross Salary' }),
    oldValue: oldMonthly != null ? formatCurrencyString(oldMonthly, { currency: currencyCode, locale }) : '-',
    newValue: newMonthly != null ? formatCurrencyString(newMonthly, { currency: currencyCode, locale }) : '-'
  })

  // Hourly Salary - Show if either old or new has hourly data
  const oldHourly = oldCompensation.hourlyGrossSalary
  const newHourly = newSalaryData.hourlyGrossSalary

  if (oldHourly != null || newHourly != null) {
    rows.push({
      key: 'hourlySalary',
      label: t('adjust-salary-review-hourly-gross-salary', { defaultValue: 'Hourly Gross Salary' }),
      oldValue: oldHourly != null ? formatCurrencyString(oldHourly, { currency: currencyCode, locale }) : '-',
      newValue: newHourly != null ? formatCurrencyString(newHourly, { currency: currencyCode, locale }) : '-'
    })
  }

  return rows
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

  // Format adjustment value based on type
  const adjustmentValueDisplay = newSalaryData.requestedPercent
    ? `${newSalaryData.requestedPercent}%`
    : newSalaryData.requestedAmount
      ? formatCurrencyString(newSalaryData.requestedAmount, { currency: currencyCode, locale })
      : '-'

  // Calculate increase summary (e.g., "+€6,000 (10% increase)")
  // Handle hourly adjustments separately - they don't affect annual salary directly
  const isHourlyAdjustment =
    newSalaryData.hourlyGrossSalary != null &&
    oldCompensation.hourlyGrossSalary != null &&
    newSalaryData.hourlyGrossSalary !== oldCompensation.hourlyGrossSalary &&
    (newSalaryData.annualGrossSalary === oldCompensation.annualGrossSalary ||
      (newSalaryData.annualGrossSalary === 0 && oldCompensation.annualGrossSalary === 0))

  let increaseSummary: string
  if (isHourlyAdjustment) {
    // For hourly adjustments, show hourly rate change
    const oldHourly = oldCompensation.hourlyGrossSalary || 0
    const newHourly = newSalaryData.hourlyGrossSalary || 0
    const hourlyIncrease = newHourly - oldHourly
    const hourlyPercentageIncrease = oldHourly > 0 ? ((hourlyIncrease / oldHourly) * 100).toFixed(1) : '0.0'

    increaseSummary =
      hourlyIncrease > 0
        ? `+${formatCurrencyString(hourlyIncrease, { currency: currencyCode, locale })}/hr (${hourlyPercentageIncrease}% increase)`
        : formatCurrencyString(hourlyIncrease, { currency: currencyCode, locale }) + '/hr'
  } else {
    // For annual/monthly adjustments, use annual salary comparison
    const oldAnnual = oldCompensation.annualGrossSalary || 0
    const newAnnual = newSalaryData.annualGrossSalary || 0

    // Only calculate increase if both values are valid (not 0/null from hourly-only scenarios)
    if (oldAnnual > 0 && newAnnual > 0) {
      const absoluteIncrease = newAnnual - oldAnnual
      const percentageIncrease = oldAnnual > 0 ? ((absoluteIncrease / oldAnnual) * 100).toFixed(1) : '0.0'

      increaseSummary =
        absoluteIncrease > 0
          ? `+${formatCurrencyString(absoluteIncrease, { currency: currencyCode, locale })} (${percentageIncrease}% increase)`
          : formatCurrencyString(absoluteIncrease, { currency: currencyCode, locale })
    } else {
      // Fallback: show adjustment value if annual comparison isn't meaningful
      increaseSummary = adjustmentValueDisplay !== '-' ? adjustmentValueDisplay : '-'
    }
  }

  // Format effective date
  const effectiveDateFormatted = newSalaryData.startDate
    ? formatDate(newSalaryData.startDate, 'date.short') || newSalaryData.startDate
    : '-'

  // Extract catalog value for reason
  let reasonDisplay = String(newSalaryData.salaryAdjustReason || '-').trim() || '-'
  if (newSalaryData.salaryAdjustReason && salaryAdjustReasonEntries.length > 0) {
    // Extract code from catalog reference format: "SalaryAdjustReason:v1:promotion" -> "promotion"
    const catalogRefParts = newSalaryData.salaryAdjustReason.split(':')
    const reasonCode = catalogRefParts[catalogRefParts.length - 1]

    // Find matching catalog entry
    const reasonEntry = salaryAdjustReasonEntries.find(entry => entry.code === reasonCode)
    if (reasonEntry) {
      reasonDisplay = getCatalogValue(reasonEntry) || reasonEntry.value || reasonCode
    }
  }

  return {
    adjustmentType: newSalaryData.requestedPercent
      ? t('adjust-salary-adjustment-type-percentage', { defaultValue: 'Percentage Increase' })
      : t('adjust-salary-adjustment-type-amount', { defaultValue: 'Amount Increase' }),
    adjustmentValue: adjustmentValueDisplay,
    adjustmentFrequency: '-', // Not used in new model
    effectiveDate: effectiveDateFormatted,
    reason: reasonDisplay,
    notes: String(newSalaryData.notes || '').trim() || undefined,
    increaseSummary
  }
}
