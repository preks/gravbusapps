import * as windowUtils from '@/common/utils/windowUtils'
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

/**
 * Extract the last part from a reference string (e.g., "Currency:v1:EUR" -> "EUR")
 */
function extractLastPartFromRef(ref: string, fallback: string = '-'): string {
  const parts = ref.split(':')
  return parts[parts.length - 1] || fallback
}

/**
 * Extract currency code from reference format
 */
const extractCurrencyCode = (currencyRef: string | null): string => {
  if (!currencyRef) return 'EUR'
  return extractLastPartFromRef(currencyRef, 'EUR')
}

/**
 * Extract and format catalog entry display value with fallback
 */
function extractCatalogDisplay(catalogRef: string | null | undefined, catalogEntry: CatalogEntry | null): string {
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
function formatDateValue(date: string | null | undefined): string {
  if (!date) {
    return '-'
  }
  return windowUtils.formatDate(date, 'date.short') ?? date
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
  const benefitTypeDisplay = extractCatalogDisplay(benefitData.benefitTypeRef, benefitTypeEntry)
  const providerDisplay = extractCatalogDisplay(benefitData.benefitProviderRef, providerEntry)

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
    value: formatDateValue(benefitData.startDate)
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
  const benefitTypeDisplay = extractCatalogDisplay(benefitData.benefitTypeRef, benefitTypeEntry)
  const providerDisplay = extractCatalogDisplay(benefitData.benefitProviderRef, providerEntry)
  const startDateFormatted = formatDateValue(benefitData.startDate)

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
