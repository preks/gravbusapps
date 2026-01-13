import type { CatalogEntry } from '@/common/data/catalog/types/catalogTypes'

export interface EntryMeta {
  parentEntryId?: string
  type?: string
}

export interface ActiveFilters {
  parentEntryId?: string
  typeEquals?: string
}

/**
 * Gets the localized value for a catalog entry based on the provided locale.
 * Falls back to the default value if:
 * - No translation exists for the locale
 * - Translation value is empty or whitespace only
 * - No translations array exists
 *
 * @param entry - The catalog entry
 * @param locale - The locale code (e.g., "de-DE", "en-US", "ro-RO")
 * @returns The localized value or default value
 */
export const getLocalizedValue = (entry: CatalogEntry, locale?: string): string => {
  // No locale provided - use default value
  if (!locale) {
    return entry.value || entry.displayValue || entry.id
  }

  // Try to find translation for the locale
  const translation = entry.translations?.find(t => t.localeCode === locale)

  // Use translation if it exists AND has a non-empty value
  if (translation?.value && translation.value.trim() !== '') {
    return translation.value
  }

  // Fallback to default value
  return entry.value || entry.displayValue || entry.id
}

/**
 * Converts catalog entries to option format for select/combobox.
 * Supports localization when locale is provided.
 * Includes code, type (stable identifiers) and icon from additionalValue3 if available.
 *
 * @param entries - Array of catalog entries
 * @param locale - Optional locale code for translations
 * @returns Array of options with value, label, code, type, and optional icon
 */
export const toOptions = (entries: CatalogEntry[], locale?: string) =>
  entries.map(e => ({
    value: e.id,
    label: getLocalizedValue(e, locale),
    code: e.code, // Include code for stable filtering
    type: e.type, // Include type for classification filtering
    icon: e.additionalValue3 || undefined
  }))

export const buildEntryMeta = (entries: CatalogEntry[]): Record<string, EntryMeta> => {
  const meta: Record<string, EntryMeta> = {}
  for (const e of entries) {
    meta[e.id] = {
      parentEntryId: e.parentEntryId,
      type: e.type
    }
  }
  return meta
}

// Alias for backward compatibility
export const buildMetaByValue = buildEntryMeta

export const buildFiltersSignature = (filters: ActiveFilters): string => {
  return JSON.stringify({
    p: filters.parentEntryId || null,
    t: filters.typeEquals || null
  })
}

export const isValueValidForFilters = (
  value: string | null | undefined,
  metaByValue: Record<string, EntryMeta> | undefined,
  filters: ActiveFilters
): boolean => {
  if (!value) return true
  const meta = metaByValue?.[value]
  if (!meta) return true // unknown yet; treat as valid to avoid over-clearing
  if (filters.parentEntryId && meta.parentEntryId !== filters.parentEntryId) return false
  if (filters.typeEquals && meta.type !== filters.typeEquals) return false
  return true
}
