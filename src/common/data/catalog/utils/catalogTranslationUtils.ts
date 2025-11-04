import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import type { CatalogEntry, CatalogEntryTranslation } from '../types/catalogTypes'

/**
 * Translatable fields in a CatalogEntry
 */
export type TranslatableField = 'value' | 'additionalValue1' | 'additionalValue2' | 'additionalValue3' | 'objectValue'

/**
 * Gets the value for any field in a catalog entry with locale support.
 *
 * Priority:
 * 1. Translation for current locale (if exists and not empty)
 * 2. Default field value (fallback)
 *
 * @param entry - The catalog entry
 * @param field - The field to get (default: 'value')
 * @param locale - Optional locale override (defaults to current user locale)
 * @returns Field value (localized if translation exists)
 *
 * @example
 * ```typescript
 * const entry = await getCatalogEntry('ContentGroup:v1:NEWS')
 * const displayName = getCatalogEntryField(entry, 'value') // "News" or "Nachrichten"
 * const description = getCatalogEntryField(entry, 'additionalValue1')
 * ```
 */
export function getCatalogEntryField(
  entry: CatalogEntry | null | undefined,
  field: TranslatableField = 'value',
  locale?: string
): string {
  // Handle null/undefined entry
  if (!entry) {
    return ''
  }

  try {
    // Get locale (provided or current user locale)
    const targetLocale = locale || getCurrentActiveUserLocale()
    const normalizedLocale = targetLocale.toLowerCase()

    // Try to find translation for the locale
    if (Array.isArray(entry.translations) && entry.translations.length > 0) {
      const translation = entry.translations.find(
        (t: CatalogEntryTranslation) => t?.localeCode?.toLowerCase() === normalizedLocale
      )

      // Use translation if it exists and has a non-empty value
      if (translation && translation[field]) {
        const translatedValue = translation[field]

        // Handle string fields
        if (typeof translatedValue === 'string' && translatedValue.trim() !== '') {
          return translatedValue
        }

        // Handle objectValue (JSON)
        if (field === 'objectValue' && translatedValue !== null && translatedValue !== undefined) {
          return typeof translatedValue === 'string' ? translatedValue : JSON.stringify(translatedValue)
        }
      }
    }

    // Fallback to default field value (NOT en-US translation)
    const defaultValue = entry[field]

    if (defaultValue === null || defaultValue === undefined) {
      return ''
    }

    // Handle objectValue
    if (field === 'objectValue') {
      return typeof defaultValue === 'string' ? defaultValue : JSON.stringify(defaultValue)
    }

    // Handle string fields
    return String(defaultValue)
  } catch (error) {
    console.error('Error getting translated field:', error)
    // Fallback to default value on error
    const fallback = entry[field]
    return fallback ? String(fallback) : ''
  }
}

/**
 * Convenience function to get the main display value ('value' field)
 *
 * @param entry - The catalog entry
 * @param locale - Optional locale override
 * @returns Display value (localized if translation exists)
 *
 * @example
 * ```typescript
 * const displayName = getCatalogEntryValue(catalogEntry) // Most common use case
 * ```
 */
export function getCatalogEntryValue(entry: CatalogEntry | null | undefined, locale?: string): string {
  return getCatalogEntryField(entry, 'value', locale)
}

/**
 * Gets multiple fields at once from a catalog entry
 * Useful when you need several fields from the same entry
 *
 * @param entry - The catalog entry
 * @param fields - Array of fields to get
 * @param locale - Optional locale override
 * @returns Object with values for each field (localized if translations exist)
 *
 * @example
 * ```typescript
 * const { value, additionalValue1 } = getCatalogEntryFields(entry, ['value', 'additionalValue1'])
 * ```
 */
export function getCatalogEntryFields(
  entry: CatalogEntry | null | undefined,
  fields: TranslatableField[],
  locale?: string
): Record<TranslatableField, string> {
  const result: Partial<Record<TranslatableField, string>> = {}

  fields.forEach(field => {
    result[field] = getCatalogEntryField(entry, field, locale)
  })

  return result as Record<TranslatableField, string>
}
