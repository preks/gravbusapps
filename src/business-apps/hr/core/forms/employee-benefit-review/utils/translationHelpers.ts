import { getCatalogEntryValue } from '@/common/data/catalog/utils/catalogTranslationUtils'
import type { CatalogEntry as CommonCatalogEntry } from '@/common/data/catalog/types/catalogTypes'
import type { BenefitSummaryData, CatalogEntry } from '../types'
import type { BenefitCatalogItem } from '@/business-apps/hr/core/apps/employee-record/components/tabs/compensation/types/benefitCatalogTypes'
import type { CatalogEntry as CompensationCatalogEntry } from '@/business-apps/hr/core/apps/employee-record/components/tabs/compensation/types/compensationTypes'

/**
 * Type guard to check if entry has the structure we need
 */
type AnyCatalogEntry = CatalogEntry | CompensationCatalogEntry

/**
 * Converts a simplified CatalogEntry to common CatalogEntry format
 * for use with getCatalogEntryValue utility
 */
const toCommonCatalogEntry = (entry: AnyCatalogEntry | null | undefined): CommonCatalogEntry | null => {
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
  } as CommonCatalogEntry
}

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

  const commonEntry = toCommonCatalogEntry(benefit.catalogEntry as AnyCatalogEntry)

  if (!commonEntry) return benefit.benefitType || ''
  return getCatalogEntryValue(commonEntry, locale)
}

/**
 * Gets the translated value from a CatalogEntry
 *
 * @param entry - The catalog entry
 * @param locale - The locale code (e.g., "de-DE", "en-US")
 * @returns The translated value
 */
export const getTranslatedCatalogEntryValue = (entry: AnyCatalogEntry | null | undefined, locale: string): string => {
  const commonEntry = toCommonCatalogEntry(entry)
  if (!commonEntry) return ''
  return getCatalogEntryValue(commonEntry, locale)
}
