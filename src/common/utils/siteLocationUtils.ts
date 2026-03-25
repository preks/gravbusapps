/**
 * Utility functions for working with SiteLocation objects
 */

/**
 * Type definition for catalog entry translations
 */
export interface CatalogEntryTranslation {
  value?: string
  localeCode?: string
}

/**
 * Type definition for SiteLocation as returned by GraphQL
 */
export interface SiteLocationWithCatalog {
  id: string
  country?: {
    id?: string
    translations?: CatalogEntryTranslation[]
  } | null
  region?: {
    id?: string
    translations?: CatalogEntryTranslation[]
  } | null
}

/**
 * Get the best matching translation value for a catalog entry
 * Tries to match current locale, falls back to first available translation
 *
 * @param translations - Array of translations from CatalogEntry
 * @param preferredLocale - Preferred locale code (defaults to 'en')
 * @returns The translation value or empty string
 */
function getTranslationValue(translations: CatalogEntryTranslation[] | undefined, preferredLocale = 'en'): string {
  if (!translations || translations.length === 0) return ''

  // Try to find preferred locale
  const preferred = translations.find(t => t.localeCode === preferredLocale)
  if (preferred?.value) return preferred.value

  // Fall back to first available translation
  return translations[0]?.value || ''
}

/**
 * Get display name for a SiteLocation
 * Constructs name from country and region catalog entries
 *
 * @param siteLocation - The site location object from GraphQL
 * @returns Display name (e.g., "Germany, Bavaria" or just the ID if no catalog data)
 */
export function getSiteLocationDisplayName(siteLocation: SiteLocationWithCatalog | null | undefined): string {
  if (!siteLocation) return ''

  const countryName = getTranslationValue(siteLocation.country?.translations)
  const regionName = getTranslationValue(siteLocation.region?.translations)

  const parts = [countryName, regionName].filter(Boolean)

  return parts.length > 0 ? parts.join(', ') : siteLocation.id || ''
}
