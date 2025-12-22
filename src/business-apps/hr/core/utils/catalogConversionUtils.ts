import type { CatalogEntry as CommonCatalogEntry } from '@/common/data/catalog/types/catalogTypes'
import { getCatalogEntryValue } from '@/common/data/catalog/utils/catalogTranslationUtils'

/**
 * Minimal catalog entry structure that can be converted to common format
 */
export interface SimplifiedCatalogEntry {
  id?: string
  code?: string
  value: string
  translations?: Array<{
    localeCode: string
    value: string
  }>
}

/**
 * Converts a simplified CatalogEntry to common CatalogEntry format
 * for use with getCatalogEntryValue utility
 *
 * This utility provides a centralized conversion function to avoid code duplication
 * across different HR modules that need to work with catalog entries.
 *
 * @param entry - Simplified catalog entry with optional id, code, value, and translations
 * @returns CommonCatalogEntry with all required fields, or null if entry is invalid
 */
export const toCommonCatalogEntry = (entry: SimplifiedCatalogEntry | null | undefined): CommonCatalogEntry | null => {
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
 * Gets the translated value from a simplified catalog entry
 *
 * This is a convenience function that combines conversion and translation
 * in a single call for cleaner code.
 *
 * @param entry - The simplified catalog entry
 * @param locale - The locale code (e.g., "de-DE", "en-US")
 * @returns The translated value for the specified locale, or empty string if entry is invalid
 */
export const getTranslatedCatalogEntryValue = (
  entry: SimplifiedCatalogEntry | null | undefined,
  locale: string
): string => {
  const commonEntry = toCommonCatalogEntry(entry)
  if (!commonEntry) return ''
  return getCatalogEntryValue(commonEntry, locale)
}
