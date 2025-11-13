import { BenefitCatalogItem } from '../types/benefitCatalogTypes'
import { ProviderEntry } from '../types/benefitCatalogTypes'
import { CatalogEntry as CompensationCatalogEntry } from '../types/compensationTypes'
import { getCatalogEntryValue } from '@/common/data/catalog/utils/catalogTranslationUtils'
import type { CatalogEntry } from '@/common/data/catalog/types/catalogTypes'

/**
 * Minimal catalog entry structure compatible with getCatalogEntryValue
 * The function only requires value and translations with localeCode/value
 */
interface CompatibleCatalogEntry {
  value: string
  translations?: Array<{
    localeCode: string
    value: string
  }>
}

/**
 * Converts a CatalogBenefitEntry to a format compatible with getCatalogEntryValue
 */
const toCompatibleCatalogEntry = (entry: CompatibleCatalogEntry): CatalogEntry => {
  return {
    id: '',
    code: '',
    value: entry.value || '',
    translations:
      entry.translations?.map(t => ({
        id: '',
        localeCode: t.localeCode,
        value: t.value,
        additionalValue1: '',
        additionalValue2: '',
        additionalValue3: '',
        catalogEntryId: ''
      })) || []
  } as CatalogEntry
}

/**
 * Gets the translated benefit type value from a BenefitCatalogItem
 * Uses catalogEntry (source of truth) with translations for locale-aware display
 *
 * @param benefit - The benefit catalog item (catalogEntry is always present)
 * @param locale - The locale code (e.g., "de-DE", "en-US")
 * @returns The translated benefit type value
 */
export const getTranslatedBenefitType = (benefit: BenefitCatalogItem, locale: string): string => {
  const compatibleEntry = toCompatibleCatalogEntry({
    value: benefit.catalogEntry.value,
    translations: benefit.catalogEntry.translations
  })
  return getCatalogEntryValue(compatibleEntry, locale)
}

/**
 * Gets the translated provider value from a ProviderEntry
 *
 * @param provider - The provider entry
 * @param locale - The locale code (e.g., "de-DE", "en-US")
 * @returns The translated provider value
 */
export const getTranslatedProviderValue = (provider: ProviderEntry, locale: string): string => {
  const compatibleEntry = toCompatibleCatalogEntry({
    value: provider.value,
    translations: provider.translations
  })
  return getCatalogEntryValue(compatibleEntry, locale)
}

/**
 * Converts a CatalogEntry from compensationTypes to the common CatalogEntry format
 * for use with getCatalogEntryValue
 *
 * @param entry - The catalog entry from compensationTypes
 * @returns A CatalogEntry compatible with getCatalogEntryValue
 */
export const toCommonCatalogEntry = (entry: CompensationCatalogEntry | null | undefined): CatalogEntry | null => {
  if (!entry) return null

  return {
    id: entry.id || '',
    code: entry.code || '',
    value: entry.value || '',
    catalogId: '',
    translations:
      entry.translations?.map(t => ({
        id: '',
        localeCode: t.localeCode,
        value: t.value,
        additionalValue1: '',
        additionalValue2: '',
        additionalValue3: '',
        catalogEntryId: ''
      })) || [],
    displayValue: entry.value || '',
    hasChildren: false,
    level: 0,
    searchableText: entry.value || ''
  } as CatalogEntry
}

/**
 * Gets the translated value from a CatalogEntry (from compensationTypes)
 *
 * @param entry - The catalog entry from compensationTypes
 * @param locale - The locale code (e.g., "de-DE", "en-US")
 * @returns The translated value
 */
export const getTranslatedCatalogEntryValue = (
  entry: CompensationCatalogEntry | null | undefined,
  locale: string
): string => {
  const commonEntry = toCommonCatalogEntry(entry)
  if (!commonEntry) return ''
  return getCatalogEntryValue(commonEntry, locale)
}
