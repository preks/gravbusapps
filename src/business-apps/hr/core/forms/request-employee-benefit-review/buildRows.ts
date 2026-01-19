import { formatCurrencyString, parseLocalizedNumber } from '@/common/utils/numberFormatter'
import type { EmployeeBenefitData, BenefitDisplayItem } from './types'
import {
  buildBenefitDisplayItems as sharedBuildBenefitDisplayItems,
  extractCurrencyCode,
  extractCatalogDisplay,
  formatDateValue,
  extractBenefitValueFromCatalog,
  type CatalogEntry
} from '../employee-benefit-review/utils'
import { translatePeriod, type TranslationFunction } from '@/business-apps/hr/core/utils/benefitExtractionUtils'

export type { CatalogEntry } from '../employee-benefit-review/utils'
export type { TranslationFunction } from '@/business-apps/hr/core/utils/benefitExtractionUtils'

export interface BenefitDetails {
  benefitType: string
  provider: string
  value: string
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

  // Extract value and period from catalog entry objectValue
  const catalogValue = extractBenefitValueFromCatalog(benefitTypeEntry, locale)

  // Start with fallback amount from backend
  let valueAmount = benefitData.yearlyAmount ?? benefitData.monthlyAmount ?? 0

  // Try to parse catalog value if present
  if (catalogValue && catalogValue.value != null) {
    const parsed = parseLocalizedNumber(catalogValue.value)
    if (Number.isFinite(parsed)) {
      valueAmount = parsed
    }
    // If parsing fails (NaN), we keep the fallback amount
  }

  const rawPeriod =
    catalogValue?.period && catalogValue.period !== '-' ? catalogValue.period : benefitData.period || null
  const valuePeriod = translatePeriod(rawPeriod, params.t)

  return {
    benefitType: benefitTypeDisplay,
    provider: providerDisplay,
    value: formatCurrencyString(valueAmount, { currency: currencyCode, locale }),
    period: valuePeriod,
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
