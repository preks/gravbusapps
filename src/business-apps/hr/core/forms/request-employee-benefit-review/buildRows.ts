import { formatCurrencyString } from '@/common/utils/numberFormatter'
import type { EmployeeBenefitData, BenefitDisplayItem } from './types'
import {
  buildBenefitDisplayItems as sharedBuildBenefitDisplayItems,
  extractCurrencyCode,
  extractCatalogDisplay,
  formatDateValue,
  type CatalogEntry,
  type TranslationFunction
} from '../employee-benefit-review/utils'

export type { CatalogEntry, TranslationFunction }

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
 * Build benefit display items for the review form
 */
export function buildBenefitDisplayItems(params: {
  benefitData: EmployeeBenefitData
  locale: string
  benefitTypeEntry?: CatalogEntry | null
  providerEntry?: CatalogEntry | null
  t: TranslationFunction
}): BenefitDisplayItem[] {
  return sharedBuildBenefitDisplayItems({
    ...params,
    translationPrefix: 'request-benefit-review'
  })
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
