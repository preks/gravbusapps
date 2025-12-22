import type { BenefitSummaryData } from '../types'
import type { BenefitCatalogItem } from '@/business-apps/hr/core/apps/employee-record/components/tabs/compensation/types/benefitCatalogTypes'
import { getTranslatedCatalogEntryValue as getTranslatedValue } from '@/business-apps/hr/core/utils/catalogConversionUtils'

/**
 * Gets the translated benefit type value from BenefitSummaryData or BenefitCatalogItem
 * Uses catalogEntry with translations for locale-aware display
 *
 * @param benefit - The benefit summary data or catalog item
 * @param locale - The locale code (e.g., "de-DE", "en-US")
 * @returns The translated benefit type value
 */
export const getTranslatedBenefitType = (benefit: BenefitSummaryData | BenefitCatalogItem, locale: string): string => {
  if (!benefit.catalogEntry) {
    return benefit.benefitType || ''
  }

  return getTranslatedValue(benefit.catalogEntry, locale) || benefit.benefitType || ''
}

/**
 * Gets the translated value from a CatalogEntry
 * Re-exported for convenience to maintain API compatibility
 *
 * @param entry - The catalog entry
 * @param locale - The locale code (e.g., "de-DE", "en-US")
 * @returns The translated value
 */
export const getTranslatedCatalogEntryValue = getTranslatedValue
