import { formatDate, getCatalogValue } from '@/common/utils/windowUtils'
import { formatCurrencyString } from '@/common/utils/numberFormatter'
import type { EmployeeBenefitData, BenefitDisplayItem } from './types'

type TranslationFunction = (key: string, options?: { defaultValue?: string; [key: string]: any }) => string

interface CatalogEntry {
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

export interface BenefitDetails {
  benefitType: string
  provider: string
  yearlyValue: string
  monthlyValue: string
  period: string
  startDate: string
  justification?: string
  employeeYearlyContribution?: string
  employeeMonthlyContribution?: string
}

const extractCurrencyCode = (currencyRef: string | null): string => {
  if (!currencyRef) return 'EUR'
  // Extract currency code from reference format like "Currency:v1:EUR" or just "EUR"
  const parts = currencyRef.split(':')
  return parts[parts.length - 1] || 'EUR'
}

/**
 * Extract and format benefit type display from catalog entry
 */
function extractBenefitTypeDisplay(
  benefitTypeRef: string | null | undefined,
  benefitTypeEntry: CatalogEntry | null
): string {
  if (!benefitTypeRef) return '-'

  if (benefitTypeEntry) {
    return getCatalogValue(benefitTypeEntry) ?? benefitTypeEntry.value ?? '-'
  }

  // Fallback: extract code from catalog reference format
  const parts = benefitTypeRef.split(':')
  return parts[parts.length - 1] || '-'
}

/**
 * Extract provider display from catalog entry
 */
function extractProviderDisplay(providerRef: string | null | undefined, providerEntry: CatalogEntry | null): string {
  if (!providerRef) return '-'

  if (providerEntry) {
    return getCatalogValue(providerEntry) ?? providerEntry.value ?? '-'
  }

  // Fallback: extract code from catalog reference format
  const parts = providerRef.split(':')
  return parts[parts.length - 1] || '-'
}

/**
 * Format start date
 */
function formatStartDate(startDate: string | null | undefined): string {
  if (!startDate) {
    return '-'
  }
  return formatDate(startDate, 'date.short') ?? startDate
}

/**
 * Build benefit display items for the review form
 */
export function buildBenefitDisplayItems(params: {
  benefitData: EmployeeBenefitData
  locale: string
  benefitTypeEntry?: CatalogEntry | null
  providerEntry?: CatalogEntry | null
  t: TranslationFunction
}): BenefitDisplayItem[] {
  const { benefitData, locale, benefitTypeEntry = null, providerEntry = null, t } = params
  const currencyCode = extractCurrencyCode(benefitData.currencyRef)
  const benefitTypeDisplay = extractBenefitTypeDisplay(benefitData.benefitTypeRef, benefitTypeEntry)
  const providerDisplay = extractProviderDisplay(benefitData.benefitProviderRef, providerEntry)

  const items: BenefitDisplayItem[] = [
    {
      key: 'benefitType',
      label: t('request-benefit-review-benefit-type', { defaultValue: 'Benefit Type' }),
      value: benefitTypeDisplay
    },
    {
      key: 'provider',
      label: t('request-benefit-review-provider', { defaultValue: 'Provider' }),
      value: providerDisplay
    },
    {
      key: 'yearlyValue',
      label: t('request-benefit-review-yearly-value', { defaultValue: 'Yearly Value' }),
      value: formatCurrencyString(benefitData.yearlyAmount || 0, { currency: currencyCode, locale })
    },
    {
      key: 'monthlyValue',
      label: t('request-benefit-review-monthly-value', { defaultValue: 'Monthly Value' }),
      value: formatCurrencyString(benefitData.monthlyAmount || 0, { currency: currencyCode, locale })
    }
  ]

  // Add period if available
  if (benefitData.period) {
    items.push({
      key: 'period',
      label: t('request-benefit-review-period', { defaultValue: 'Period' }),
      value: benefitData.period
    })
  }

  // Add start date
  items.push({
    key: 'startDate',
    label: t('request-benefit-review-start-date', { defaultValue: 'Preferred Start Date' }),
    value: formatStartDate(benefitData.startDate)
  })

  // Add employee contributions if available
  if (benefitData.employeeYearlyContribution && benefitData.employeeYearlyContribution > 0) {
    items.push({
      key: 'employeeYearlyContribution',
      label: t('request-benefit-review-employee-yearly-contribution', {
        defaultValue: 'Employee Yearly Contribution'
      }),
      value: formatCurrencyString(benefitData.employeeYearlyContribution, { currency: currencyCode, locale })
    })
  }

  if (benefitData.employeeMonthlyContribution && benefitData.employeeMonthlyContribution > 0) {
    items.push({
      key: 'employeeMonthlyContribution',
      label: t('request-benefit-review-employee-monthly-contribution', {
        defaultValue: 'Employee Monthly Contribution'
      }),
      value: formatCurrencyString(benefitData.employeeMonthlyContribution, { currency: currencyCode, locale })
    })
  }

  return items
}

/**
 * Build benefit details including optional justification
 */
export function buildBenefitDetails(params: {
  benefitData: EmployeeBenefitData
  locale: string
  benefitTypeEntry?: CatalogEntry | null
  providerEntry?: CatalogEntry | null
  t: TranslationFunction
}): BenefitDetails {
  const { benefitData, locale, benefitTypeEntry = null, providerEntry = null } = params

  const currencyCode = extractCurrencyCode(benefitData.currencyRef)
  const benefitTypeDisplay = extractBenefitTypeDisplay(benefitData.benefitTypeRef, benefitTypeEntry)
  const providerDisplay = extractProviderDisplay(benefitData.benefitProviderRef, providerEntry)
  const startDateFormatted = formatStartDate(benefitData.startDate)

  return {
    benefitType: benefitTypeDisplay,
    provider: providerDisplay,
    yearlyValue: formatCurrencyString(benefitData.yearlyAmount || 0, { currency: currencyCode, locale }),
    monthlyValue: formatCurrencyString(benefitData.monthlyAmount || 0, { currency: currencyCode, locale }),
    period: benefitData.period || '-',
    startDate: startDateFormatted,
    justification: benefitData.notes?.trim() || undefined,
    employeeYearlyContribution:
      benefitData.employeeYearlyContribution && benefitData.employeeYearlyContribution > 0
        ? formatCurrencyString(benefitData.employeeYearlyContribution, { currency: currencyCode, locale })
        : undefined,
    employeeMonthlyContribution:
      benefitData.employeeMonthlyContribution && benefitData.employeeMonthlyContribution > 0
        ? formatCurrencyString(benefitData.employeeMonthlyContribution, { currency: currencyCode, locale })
        : undefined
  }
}
