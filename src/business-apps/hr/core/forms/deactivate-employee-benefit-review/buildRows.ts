import type { EmployeeBenefitDeactivationData, BenefitDisplayItem, DeactivationDetails } from './types'
import {
  buildBenefitDisplayItems as sharedBuildBenefitDisplayItems,
  formatDateValue,
  type CatalogEntry,
  type TranslationFunction
} from '../employee-benefit-review/utils'

export type { CatalogEntry, TranslationFunction }

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
  return sharedBuildBenefitDisplayItems({
    ...params,
    translationPrefix: 'deactivate-benefit-review'
  })
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
