import { formatCurrencyString } from '@/common/utils/numberFormatter'
import type { ReviewRow } from '../components/ReviewRows'
import type { OldEmployeeCompensation, EmployeeSalaryData } from './types'
import {
  extractCurrencyCode,
  formatCurrencyOrDash,
  formatEffectiveDate,
  extractReasonDisplay,
  isHourlyOnlyAdjustment,
  calculateHourlyIncreaseSummary,
  calculateAnnualIncreaseSummary,
  type TranslationFunction,
  type SalaryAdjustReasonEntry
} from './utils/salaryFormatters'

/**
 * Simple detail row for single-column display (used in assign mode)
 */
export interface DetailRow {
  key: string
  label: string
  value: string
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

export interface AssignmentDetailsResult {
  startDate: string
  notes?: string
}

// Helper functions
function isPositiveNumber(value: number | null | undefined): boolean {
  return value !== null && value !== undefined && value > 0
}

function hasPositiveValue(...values: (number | null | undefined)[]): boolean {
  return values.some(v => isPositiveNumber(v))
}

function calculateAnnualFromMonthly(annual: number | null | undefined, monthly: number | null | undefined): number {
  if (isPositiveNumber(annual)) return annual!
  if (isPositiveNumber(monthly)) return monthly! * 12
  return 0
}

function calculateMonthlyFromAnnual(monthly: number | null | undefined, annual: number): number | null {
  if (isPositiveNumber(monthly)) return monthly!
  if (annual > 0) return annual / 12
  return null
}

function formatAdjustmentValueDisplay(newSalaryData: EmployeeSalaryData, currencyCode: string, locale: string): string {
  if (newSalaryData.requestedPercent) return `${newSalaryData.requestedPercent}%`
  if (newSalaryData.requestedAmount) {
    return formatCurrencyString(newSalaryData.requestedAmount, { currency: currencyCode, locale })
  }
  return '-'
}

/**
 * Build salary comparison rows (old vs new) - only rows with actual data
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

  const rawOldAnnual = oldCompensation.annualGrossSalary
  const rawOldMonthly = oldCompensation.monthlyGrossSalary
  const rawNewAnnual = newSalaryData.annualGrossSalary
  const rawNewMonthly = newSalaryData.monthlyGrossSalary
  const oldHourly = oldCompensation.hourlyGrossSalary
  const newHourly = newSalaryData.hourlyGrossSalary

  const oldAnnual = calculateAnnualFromMonthly(rawOldAnnual, rawOldMonthly)
  const newAnnual = calculateAnnualFromMonthly(rawNewAnnual, rawNewMonthly)
  const oldMonthly = calculateMonthlyFromAnnual(rawOldMonthly, oldAnnual)
  const newMonthly = calculateMonthlyFromAnnual(rawNewMonthly, newAnnual)

  const hasAnnualMonthlyData = hasPositiveValue(rawOldAnnual, rawOldMonthly, rawNewAnnual, rawNewMonthly)
  const hasHourlyData = isPositiveNumber(oldHourly) || isPositiveNumber(newHourly)

  if (hasAnnualMonthlyData) {
    rows.push(
      {
        key: 'annualSalary',
        label: t('adjust-salary-review-annual-gross-salary', { defaultValue: 'Annual Gross Salary' }),
        oldValue: formatCurrencyString(oldAnnual, { currency: currencyCode, locale }),
        newValue: formatCurrencyString(newAnnual, { currency: currencyCode, locale })
      },
      {
        key: 'monthlySalary',
        label: t('adjust-salary-review-monthly-gross-salary', { defaultValue: 'Monthly Gross Salary' }),
        oldValue: formatCurrencyOrDash(oldMonthly, currencyCode, locale),
        newValue: formatCurrencyOrDash(newMonthly, currencyCode, locale)
      }
    )
  }

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
 */
export function buildNewSalaryDetailRows(params: {
  newSalaryData: EmployeeSalaryData
  locale: string
  t: TranslationFunction
}): DetailRow[] {
  const { newSalaryData, locale, t } = params
  const rows: DetailRow[] = []
  const currencyCode = extractCurrencyCode(newSalaryData.currencyRef)

  const rawAnnual = newSalaryData.annualGrossSalary
  const rawMonthly = newSalaryData.monthlyGrossSalary
  const newHourly = newSalaryData.hourlyGrossSalary

  const newAnnual = calculateAnnualFromMonthly(rawAnnual, rawMonthly)
  const newMonthly = calculateMonthlyFromAnnual(rawMonthly, newAnnual)

  const hasAnnualMonthlyData = isPositiveNumber(rawAnnual) || isPositiveNumber(rawMonthly)
  const isHourlySalary = isPositiveNumber(newHourly) && !hasAnnualMonthlyData

  if (isHourlySalary) {
    rows.push({
      key: 'hourlySalary',
      label: t('assign-salary-review-hourly-salary', { defaultValue: 'Hourly Gross Salary' }),
      value: formatCurrencyString(newHourly, { currency: currencyCode, locale })
    })
  } else {
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
export function buildAssignmentDetails(params: { newSalaryData: EmployeeSalaryData }): AssignmentDetailsResult {
  const { newSalaryData } = params
  return {
    startDate: formatEffectiveDate(newSalaryData.startDate),
    notes: String(newSalaryData.notes ?? '').trim() || undefined
  }
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
  const isHourlyAdjustment = isHourlyOnlyAdjustment(oldCompensation, newSalaryData)

  const increaseSummary = isHourlyAdjustment
    ? calculateHourlyIncreaseSummary(oldCompensation, newSalaryData, currencyCode, locale, t)
    : calculateAnnualIncreaseSummary(oldCompensation, newSalaryData, adjustmentValueDisplay, currencyCode, locale, t)

  const adjustmentType = newSalaryData.requestedPercent
    ? t('adjust-salary-adjustment-type-percentage', { defaultValue: 'Percentage Increase' })
    : t('adjust-salary-adjustment-type-amount', { defaultValue: 'Amount Increase' })

  return {
    adjustmentType,
    adjustmentValue: adjustmentValueDisplay,
    adjustmentFrequency: '-',
    effectiveDate: formatEffectiveDate(newSalaryData.startDate),
    reason: extractReasonDisplay(newSalaryData.salaryAdjustReason, salaryAdjustReasonEntries),
    notes: String(newSalaryData.notes ?? '').trim() || undefined,
    increaseSummary
  }
}
