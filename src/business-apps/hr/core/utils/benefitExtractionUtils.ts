import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { BenefitCatalogItem } from '@/business-apps/hr/core/apps/employee-record/components/tabs/compensation/types/benefitCatalogTypes'

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
