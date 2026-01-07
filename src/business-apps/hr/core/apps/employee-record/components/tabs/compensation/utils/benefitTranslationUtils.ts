import { BenefitCatalogItem, ProviderEntry } from '../types/benefitCatalogTypes'
import { CatalogEntry as CompensationCatalogEntry } from '../types/compensationTypes'
import { getTranslatedCatalogEntryValue as getTranslatedValue } from '@/business-apps/hr/core/utils/catalogConversionUtils'

/**
 * Gets the translated benefit type value from a BenefitCatalogItem
 * Uses catalogEntry (source of truth) with translations for locale-aware display
 *
 * @param benefit - The benefit catalog item (catalogEntry is always present)
 * @param locale - The locale code (e.g., "de-DE", "en-US")
 * @returns The translated benefit type value
 */
export const getTranslatedBenefitType = (benefit: BenefitCatalogItem, locale: string): string => {
  return getTranslatedValue(benefit.catalogEntry, locale) || benefit.catalogEntry.value
}

/**
 * Gets the translated provider value from a ProviderEntry
 *
 * @param provider - The provider entry
 * @param locale - The locale code (e.g., "de-DE", "en-US")
 * @returns The translated provider value
 */
export const getTranslatedProviderValue = (provider: ProviderEntry, locale: string): string => {
  return getTranslatedValue(provider, locale)
}

/**
 * Gets the translated value from a CatalogEntry (from compensationTypes)
 * Re-exported for convenience to maintain API compatibility
 *
 * @param entry - The catalog entry from compensationTypes
 * @param locale - The locale code (e.g., "de-DE", "en-US")
 * @returns The translated value
 */
export const getTranslatedCatalogEntryValue = (
  entry: CompensationCatalogEntry | null | undefined,
  locale: string
): string => {
  return getTranslatedValue(entry, locale)
}
