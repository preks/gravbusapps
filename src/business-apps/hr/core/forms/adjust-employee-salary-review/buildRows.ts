import { getTranslationFromI18nKeyAndLabel, formatDate, getCatalogValue } from '@/common/utils/windowUtils'
import { formatCurrencyString } from '@/common/utils/numberFormatter'
import type { ReviewRow } from '../components/ReviewRows'
import type { CatalogEntry, OldEmployeeCompensation, EmployeeSalaryData } from './types'

export interface AdjustmentDetails {
  adjustmentType: string
  adjustmentValue: string
  adjustmentFrequency: string
  effectiveDate: string
  reason: string
  notes?: string
  increaseSummary: string
}

const extractCurrencyCode = (currency: CatalogEntry | null): string => {
  if (!currency) return 'EUR'
  if (currency.code) return currency.code
  const value = getCatalogValue(currency)
  return value || 'EUR'
}

const formatAdjustmentType = (type: string): string => {
  if (type === 'amount') {
    return getTranslationFromI18nKeyAndLabel('lowcoder:review_forms.amount_adjustment', 'Amount Increase')
  }
  if (type === 'percentage') {
    return getTranslationFromI18nKeyAndLabel('lowcoder:review_forms.percentage_adjustment', 'Percentage Increase')
  }
  return type
}

const formatFrequency = (frequency: string): string => {
  if (frequency === 'annually') {
    return getTranslationFromI18nKeyAndLabel('lowcoder:adjust_salary.frequency_annually', 'Annually')
  }
  if (frequency === 'monthly') {
    return getTranslationFromI18nKeyAndLabel('lowcoder:adjust_salary.frequency_monthly', 'Monthly')
  }
  if (frequency === 'hourly') {
    return getTranslationFromI18nKeyAndLabel('lowcoder:adjust_salary.frequency_hourly', 'Hourly')
  }
  return frequency
}

/**
 * Build salary comparison rows (old vs new) - only actual salary changes
 */
export function buildSalaryComparisonRows(params: {
  oldCompensation: OldEmployeeCompensation
  newSalaryData: EmployeeSalaryData
  locale: string
}): ReviewRow[] {
  const { oldCompensation, newSalaryData, locale } = params
  const rows: ReviewRow[] = []

  const currencyCode = extractCurrencyCode(oldCompensation.currency)

  // Annual Salary - Always show
  const oldAnnual = oldCompensation.annualGrossSalary || 0
  const newAnnual = newSalaryData.newAnnualSalary || 0

  rows.push({
    key: 'annualSalary',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:review_forms.annual_gross_salary', 'Annual Gross Salary'),
    oldValue: formatCurrencyString(oldAnnual, { currency: currencyCode, locale }),
    newValue: formatCurrencyString(newAnnual, { currency: currencyCode, locale })
  })

  // Monthly Salary - Show if either old or new has monthly data
  const oldMonthly = oldCompensation.monthlyGrossSalary
  const newMonthly = newSalaryData.newMonthlySalary

  if (oldMonthly != null || newMonthly != null) {
    rows.push({
      key: 'monthlySalary',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:review_forms.monthly_gross_salary', 'Monthly Gross Salary'),
      oldValue: oldMonthly != null ? formatCurrencyString(oldMonthly, { currency: currencyCode, locale }) : '-',
      newValue: newMonthly != null ? formatCurrencyString(newMonthly, { currency: currencyCode, locale }) : '-'
    })
  }

  // Hourly Salary - Show if either old or new has hourly data
  const oldHourly = oldCompensation.hourlyGrossSalary
  const newHourly = newSalaryData.newHourlySalary

  if (oldHourly != null || newHourly != null) {
    rows.push({
      key: 'hourlySalary',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:review_forms.hourly_gross_salary', 'Hourly Gross Salary'),
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
}): AdjustmentDetails {
  const { oldCompensation, newSalaryData, locale } = params

  const currencyCode = extractCurrencyCode(oldCompensation.currency)

  // Format adjustment value based on type
  const adjustmentValueDisplay =
    newSalaryData.adjustmentType === 'percentage'
      ? `${newSalaryData.adjustmentValue}%`
      : formatCurrencyString(newSalaryData.adjustmentValue, { currency: currencyCode, locale })

  // Calculate increase summary (e.g., "+€6,000 (10% increase)")
  const oldAnnual = oldCompensation.annualGrossSalary || 0
  const newAnnual = newSalaryData.newAnnualSalary || 0
  const absoluteIncrease = newAnnual - oldAnnual
  const percentageIncrease = oldAnnual > 0 ? ((absoluteIncrease / oldAnnual) * 100).toFixed(1) : '0.0'

  const increaseSummary =
    absoluteIncrease > 0
      ? `+${formatCurrencyString(absoluteIncrease, { currency: currencyCode, locale })} (${percentageIncrease}% increase)`
      : formatCurrencyString(absoluteIncrease, { currency: currencyCode, locale })

  // Format effective date
  const effectiveDateFormatted = newSalaryData.effectiveDate
    ? formatDate(newSalaryData.effectiveDate, 'date.short') || newSalaryData.effectiveDate
    : '-'

  return {
    adjustmentType: formatAdjustmentType(newSalaryData.adjustmentType),
    adjustmentValue: adjustmentValueDisplay,
    adjustmentFrequency: formatFrequency(newSalaryData.adjustmentFrequency),
    effectiveDate: effectiveDateFormatted,
    reason: String(newSalaryData.reason || '-').trim() || '-',
    notes: String(newSalaryData.notes || '').trim() || undefined,
    increaseSummary
  }
}
