import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { BenefitCatalogItem } from '@/business-apps/hr/core/apps/employee-record/components/tabs/compensation/types/benefitCatalogTypes'

export type TranslationFunction = (key: string, options?: { defaultValue?: string; [key: string]: any }) => string

interface ExternalContextData {
  benefit?: BenefitCatalogItem
}

interface AdditionalDataWithBenefit {
  externalContextData?: ExternalContextData
  benefit?: BenefitCatalogItem
  psi_taskPayload?: {
    psi_initialParameters?: {
      benefit?: BenefitCatalogItem
    }
  }
}

/**
 * Extracts selected benefit from business app context with priority:
 * 1. externalContextData.benefit (from AppAction) - highest priority
 * 2. direct additionalData.benefit
 * 3. process initial parameters (psi_taskPayload.psi_initialParameters.benefit)
 * 4. null (fallback)
 *
 * This utility consolidates benefit extraction logic used across multiple
 * benefit-related forms (request, deactivate, etc.)
 *
 * @param additionalData - Additional data from BusinessAppContext
 * @returns BenefitCatalogItem or null if not found
 */
export const extractSelectedBenefit = (
  additionalData: BusinessAppContextProps['additionalData']
): BenefitCatalogItem | null => {
  const contextData = additionalData as AdditionalDataWithBenefit

  return (
    contextData?.externalContextData?.benefit ||
    contextData?.benefit ||
    contextData?.psi_taskPayload?.psi_initialParameters?.benefit ||
    null
  )
}

/**
 * Translate period value (monthly, yearly, daily) to localized string
 * Shared utility for all benefit forms to ensure consistent period translations
 *
 * @param period - The period value from catalog (monthly, yearly, daily, etc.)
 * @param t - Translation function
 * @returns Translated period string or original value if no translation found
 */
export function translatePeriod(period: string | null | undefined, t: TranslationFunction): string {
  if (!period || period === '-') return '-'

  const periodLower = period.toLowerCase().trim()

  // Map common period values to translation keys
  const periodMap: Record<string, string> = {
    monthly: 'period-monthly',
    month: 'period-monthly',
    yearly: 'period-yearly',
    year: 'period-yearly',
    annual: 'period-yearly',
    annually: 'period-yearly',
    daily: 'period-daily',
    day: 'period-daily'
  }

  const translationKey = periodMap[periodLower]
  if (translationKey) {
    return t(translationKey, { defaultValue: period })
  }

  // Fallback to original value if no translation found
  return period
}
