import { formatDate, getCatalogValue } from '@/common/utils/windowUtils'
import { formatCurrencyString } from '@/common/utils/numberFormatter'
import type { EmployeeBenefitDeactivationData, BenefitDisplayItem, DeactivationDetails } from './types'

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
 * Format date
 */
function formatDateValue(date: string | null | undefined): string {
  if (!date) {
    return '-'
  }
  return formatDate(date, 'date.short') ?? date
}

/**
 * Build benefit display items for the deactivation review form
 */
export function buildBenefitDisplayItems(params: {
  benefitData: EmployeeBenefitDeactivationData
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
      label: t('deactivate-benefit-review-benefit-type', { defaultValue: 'Benefit Type' }),
      value: benefitTypeDisplay
    },
    {
      key: 'provider',
      label: t('deactivate-benefit-review-provider', { defaultValue: 'Provider' }),
      value: providerDisplay
    },
    {
      key: 'yearlyValue',
      label: t('deactivate-benefit-review-yearly-value', { defaultValue: 'Yearly Value' }),
      value: formatCurrencyString(benefitData.yearlyAmount || 0, { currency: currencyCode, locale })
    },
    {
      key: 'monthlyValue',
      label: t('deactivate-benefit-review-monthly-value', { defaultValue: 'Monthly Value' }),
      value: formatCurrencyString(benefitData.monthlyAmount || 0, { currency: currencyCode, locale })
    }
  ]

  // Add period if available
  if (benefitData.period) {
    items.push({
      key: 'period',
      label: t('deactivate-benefit-review-period', { defaultValue: 'Period' }),
      value: benefitData.period
    })
  }

  // Add start date
  items.push({
    key: 'startDate',
    label: t('deactivate-benefit-review-start-date', { defaultValue: 'Start Date' }),
    value: formatDateValue(benefitData.startDate)
  })

  // Add employee contributions if available
  if (benefitData.employeeYearlyContribution && benefitData.employeeYearlyContribution > 0) {
    items.push({
      key: 'employeeYearlyContribution',
      label: t('deactivate-benefit-review-employee-yearly-contribution', {
        defaultValue: 'Employee Yearly Contribution'
      }),
      value: formatCurrencyString(benefitData.employeeYearlyContribution, { currency: currencyCode, locale })
    })
  }

  if (benefitData.employeeMonthlyContribution && benefitData.employeeMonthlyContribution > 0) {
    items.push({
      key: 'employeeMonthlyContribution',
      label: t('deactivate-benefit-review-employee-monthly-contribution', {
        defaultValue: 'Employee Monthly Contribution'
      }),
      value: formatCurrencyString(benefitData.employeeMonthlyContribution, { currency: currencyCode, locale })
    })
  }

  return items
}

/**
 * Build deactivation details from benefit data
 */
export function buildDeactivationDetails(params: {
  benefitData: EmployeeBenefitDeactivationData
  t: TranslationFunction
}): DeactivationDetails {
  const { benefitData } = params

  return {
    requestedEndDate: formatDateValue(benefitData.endDate),
    deactivationReason: benefitData.notes?.trim() || '-'
  }
}
