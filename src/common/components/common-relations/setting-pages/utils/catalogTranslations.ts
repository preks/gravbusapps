export type CatalogTranslationMap = Record<string, string>

export interface CatalogTranslationEntry {
  localeCode?: string
  value?: string
}

export interface CatalogTranslatableEntry {
  value?: string
  localeCode?: string
  translations?: CatalogTranslationEntry[]
  valueTranslations?: CatalogTranslationMap
}

export const DEFAULT_CATALOG_LOCALE = 'en-US'

export const DEFAULT_CATALOG_TRANSLATIONS: CatalogTranslationMap = {
  'en-US': '',
  'de-DE': '',
  'ro-RO': ''
}

export const getCatalogValueTranslations = (
  entry: CatalogTranslatableEntry | null | undefined
): CatalogTranslationMap => {
  const translations: CatalogTranslationMap = { ...DEFAULT_CATALOG_TRANSLATIONS }

  if (entry?.valueTranslations) {
    Object.entries(entry.valueTranslations).forEach(([localeCode, value]) => {
      translations[localeCode] = value
    })
  }

  entry?.translations?.forEach(translation => {
    if (translation.localeCode && typeof translation.value === 'string') {
      translations[translation.localeCode] = translation.value
    }
  })

  const fallbackLocale = entry?.localeCode || DEFAULT_CATALOG_LOCALE
  if (!translations[fallbackLocale]?.trim() && entry?.value?.trim()) {
    translations[fallbackLocale] = entry.value
  }

  if (!translations[DEFAULT_CATALOG_LOCALE]?.trim() && entry?.value?.trim()) {
    translations[DEFAULT_CATALOG_LOCALE] = entry.value
  }

  return translations
}

export const getDefaultCatalogValue = (translations: CatalogTranslationMap, fallback = ''): string =>
  translations[DEFAULT_CATALOG_LOCALE]?.trim() || fallback.trim()

export const buildCatalogValueTranslations = (translations: CatalogTranslationMap, fallback = '') =>
  Object.entries({
    ...translations,
    [DEFAULT_CATALOG_LOCALE]: getDefaultCatalogValue(translations, fallback)
  })
    .map(([localeCode, value]) => ({ localeCode, value: value.trim() }))
    .filter(translation => translation.value)
