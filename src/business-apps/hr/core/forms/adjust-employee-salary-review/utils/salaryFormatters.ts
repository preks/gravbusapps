import { formatDate, getCatalogValue } from '@/common/utils/windowUtils'
import { formatCurrencyString } from '@/common/utils/numberFormatter'
import type { OldEmployeeCompensation, EmployeeSalaryData } from '../types'

export type TranslationFunction = (key: string, options?: { defaultValue?: string; [key: string]: any }) => string

export interface SalaryAdjustReasonEntry {
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

/**
 * Extract currency code from reference format like "Currency:v1:EUR" or just "EUR"
 */
export function extractCurrencyCode(currencyRef: string | null): string {
  if (!currencyRef) return 'EUR'
  const parts = currencyRef.split(':')
  return parts[parts.length - 1] || 'EUR'
}

/**
 * Format currency value or return '-' if null/undefined
 */
export function formatCurrencyOrDash(value: number | null | undefined, currencyCode: string, locale: string): string {
  return value === null || value === undefined ? '-' : formatCurrencyString(value, { currency: currencyCode, locale })
}

/**
 * Format effective/start date
 */
export function formatEffectiveDate(startDate: string | null | undefined): string {
  if (!startDate) {
    return '-'
  }
  return formatDate(startDate, 'date.short') ?? startDate
}

/**
 * Extract and format reason display from catalog entries
 */
export function extractReasonDisplay(
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
 * Check if this is an hourly-only adjustment (no annual change)
 */
export function isHourlyOnlyAdjustment(
  oldCompensation: OldEmployeeCompensation,
  newSalaryData: EmployeeSalaryData
): boolean {
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
export function calculateHourlyIncreaseSummary(
  oldCompensation: OldEmployeeCompensation,
  newSalaryData: EmployeeSalaryData,
  currencyCode: string,
  locale: string,
  t: TranslationFunction
): string {
  const oldHourly = oldCompensation.hourlyGrossSalary || 0
  const newHourly = newSalaryData.hourlyGrossSalary || 0
  const hourlyIncrease = newHourly - oldHourly
  const percentage = oldHourly > 0 ? ((hourlyIncrease / oldHourly) * 100).toFixed(1) : '0.0'

  const hourlySuffix = t('adjust-salary-review-hourly-suffix', { defaultValue: '/hr' })

  if (hourlyIncrease > 0) {
    const increaseText = t('adjust-salary-review-increase-text', {
      percentage,
      defaultValue: `${percentage}% increase`
    })
    return `+${formatCurrencyString(hourlyIncrease, { currency: currencyCode, locale })}${hourlySuffix} (${increaseText})`
  }
  return formatCurrencyString(hourlyIncrease, { currency: currencyCode, locale }) + hourlySuffix
}

/**
 * Calculate increase summary for annual adjustments
 */
export function calculateAnnualIncreaseSummary(
  oldCompensation: OldEmployeeCompensation,
  newSalaryData: EmployeeSalaryData,
  adjustmentValueDisplay: string,
  currencyCode: string,
  locale: string,
  t: TranslationFunction
): string {
  const oldAnnual = oldCompensation.annualGrossSalary || 0
  const newAnnual = newSalaryData.annualGrossSalary || 0

  if (oldAnnual > 0 && newAnnual > 0) {
    const absoluteIncrease = newAnnual - oldAnnual
    const percentage = ((absoluteIncrease / oldAnnual) * 100).toFixed(1)

    if (absoluteIncrease > 0) {
      const increaseText = t('adjust-salary-review-increase-text', {
        percentage,
        defaultValue: `${percentage}% increase`
      })
      return `+${formatCurrencyString(absoluteIncrease, { currency: currencyCode, locale })} (${increaseText})`
    }
    return formatCurrencyString(absoluteIncrease, { currency: currencyCode, locale })
  }

  return adjustmentValueDisplay === '-' ? '-' : adjustmentValueDisplay
}
