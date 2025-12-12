import * as windowUtils from '@/common/utils/windowUtils'
import { formatCurrencyString } from '@/common/utils/numberFormatter'
import type { BenefitDisplayItem, EmployeeBenefitBaseData } from '../types'

export type TranslationFunction = (key: string, options?: { defaultValue?: string; [key: string]: any }) => string

export interface CatalogEntry {
  id: string
  code: string
  value: string
  displayOrder?: number | null
  translations?: Array<{
    localeCode: string
    value: string
  }>
  catalog?: {
    identifier: string
    version: string
    defaultLocale: string
  }
}

/**
 * Extract the last part from a reference string (e.g., "Currency:v1:EUR" -> "EUR")
 */
export function extractLastPartFromRef(ref: string, fallback: string = '-'): string {
  const parts = ref.split(':')
  return parts[parts.length - 1] || fallback
}

/**
 * Extract currency code from reference format
 */
export function extractCurrencyCode(currencyRef: string | null): string {
  if (!currencyRef) return 'EUR'
  return extractLastPartFromRef(currencyRef, 'EUR')
}

/**
 * Extract and format catalog entry display value with fallback
 */
export function extractCatalogDisplay(
  catalogRef: string | null | undefined,
  catalogEntry: CatalogEntry | null
): string {
  if (!catalogRef) return '-'

  if (catalogEntry) {
    return windowUtils.getCatalogValue(catalogEntry) ?? catalogEntry.value ?? '-'
  }

  // Fallback: extract code from catalog reference format
  return extractLastPartFromRef(catalogRef)
}

/**
 * Format date
 */
export function formatDateValue(date: string | null | undefined): string {
  if (!date) {
    return '-'
  }
  return windowUtils.formatDate(date, 'date.short') ?? date
}

/**
 * Build benefit display items for review forms (configurable with translation prefix)
 */
export function buildBenefitDisplayItems(params: {
  benefitData: EmployeeBenefitBaseData
  locale: string
  translationPrefix: string
  benefitTypeEntry?: CatalogEntry | null
  providerEntry?: CatalogEntry | null
  t: TranslationFunction
}): BenefitDisplayItem[] {
  const { benefitData, locale, translationPrefix, benefitTypeEntry = null, providerEntry = null, t } = params
  const currencyCode = extractCurrencyCode(benefitData.currencyRef)
  const benefitTypeDisplay = extractCatalogDisplay(benefitData.benefitTypeRef, benefitTypeEntry)
  const providerDisplay = extractCatalogDisplay(benefitData.benefitProviderRef, providerEntry)

  const items: BenefitDisplayItem[] = [
    {
      key: 'benefitType',
      label: t(`${translationPrefix}-benefit-type`, { defaultValue: 'Benefit Type' }),
      value: benefitTypeDisplay
    },
    {
      key: 'provider',
      label: t(`${translationPrefix}-provider`, { defaultValue: 'Provider' }),
      value: providerDisplay
    },
    {
      key: 'yearlyValue',
      label: t(`${translationPrefix}-yearly-value`, { defaultValue: 'Yearly Value' }),
      value: formatCurrencyString(benefitData.yearlyAmount || 0, { currency: currencyCode, locale })
    },
    {
      key: 'monthlyValue',
      label: t(`${translationPrefix}-monthly-value`, { defaultValue: 'Monthly Value' }),
      value: formatCurrencyString(benefitData.monthlyAmount || 0, { currency: currencyCode, locale })
    }
  ]

  // Add period if available
  if (benefitData.period) {
    items.push({
      key: 'period',
      label: t(`${translationPrefix}-period`, { defaultValue: 'Period' }),
      value: benefitData.period
    })
  }

  // Add start date
  items.push({
    key: 'startDate',
    label: t(`${translationPrefix}-start-date`, {
      defaultValue: translationPrefix.includes('request') ? 'Preferred Start Date' : 'Start Date'
    }),
    value: formatDateValue(benefitData.startDate)
  })

  // Add employee contributions if available
  if (benefitData.employeeYearlyContribution && benefitData.employeeYearlyContribution > 0) {
    items.push({
      key: 'employeeYearlyContribution',
      label: t(`${translationPrefix}-employee-yearly-contribution`, {
        defaultValue: 'Employee Yearly Contribution'
      }),
      value: formatCurrencyString(benefitData.employeeYearlyContribution, { currency: currencyCode, locale })
    })
  }

  if (benefitData.employeeMonthlyContribution && benefitData.employeeMonthlyContribution > 0) {
    items.push({
      key: 'employeeMonthlyContribution',
      label: t(`${translationPrefix}-employee-monthly-contribution`, {
        defaultValue: 'Employee Monthly Contribution'
      }),
      value: formatCurrencyString(benefitData.employeeMonthlyContribution, { currency: currencyCode, locale })
    })
  }

  return items
}
