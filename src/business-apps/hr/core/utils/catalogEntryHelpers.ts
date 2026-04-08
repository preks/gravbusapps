import type { CatalogEntry } from '@/common/types/CatalogTypes'
import type { JSONValue } from '@/common/types/i18nTypes'

export interface CatalogTranslationValues {
  enUS: string
  deDE: string
  roRO: string
}

type CatalogEntryWithDeleteState = CatalogEntry & {
  isDeleted?: boolean
}

const isObjectRecord = (value: JSONValue | undefined): value is Record<string, JSONValue> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const toBoolean = (value: JSONValue | undefined): boolean => value === true

const toNormalizedString = (value: JSONValue | undefined): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : ''

const getTranslationForLocale = (
  translations: CatalogEntry['translations'] | undefined,
  localeCode: string,
  fallbackValue: string,
  fallbackLocaleCode?: string
) => {
  const translation = translations?.find(item => item.localeCode === localeCode)?.value
  if (typeof translation === 'string' && translation.trim()) {
    return translation
  }

  if (fallbackLocaleCode === localeCode && fallbackValue.trim()) {
    return fallbackValue
  }

  return ''
}

export const getCatalogTranslationValues = (
  entry: Pick<CatalogEntry, 'value' | 'translations' | 'localeCode'> | null | undefined
): CatalogTranslationValues => ({
  enUS: getTranslationForLocale(entry?.translations, 'en-US', entry?.value || '', entry?.localeCode),
  deDE: getTranslationForLocale(entry?.translations, 'de-DE', entry?.value || '', entry?.localeCode),
  roRO: getTranslationForLocale(entry?.translations, 'ro-RO', entry?.value || '', entry?.localeCode)
})

export const buildCatalogTranslations = (values: CatalogTranslationValues) =>
  [
    { localeCode: 'en-US', value: values.enUS.trim() },
    { localeCode: 'de-DE', value: values.deDE.trim() },
    { localeCode: 'ro-RO', value: values.roRO.trim() }
  ].filter(item => item.value)

export const isCatalogEntryDeleted = (entry: CatalogEntry | CatalogEntryWithDeleteState) => {
  if ((entry as CatalogEntryWithDeleteState).isDeleted) {
    return true
  }

  if (!isObjectRecord(entry.objectValue)) {
    return false
  }

  return entry.objectValue.isDeleted === true || entry.objectValue.is_deleted === true
}

export const buildSoftDeletedObjectValue = (objectValue?: JSONValue) => {
  if (!isObjectRecord(objectValue)) {
    return { isDeleted: true }
  }

  return {
    ...objectValue,
    isDeleted: true
  }
}

export const isSystemCatalogEntry = (entry: Pick<CatalogEntry, 'type' | 'objectValue'> | null | undefined): boolean => {
  if (!entry) {
    return false
  }

  if (typeof entry.type === 'string' && entry.type.toLowerCase().includes('system')) {
    return true
  }

  if (!isObjectRecord(entry.objectValue)) {
    return false
  }

  const objectValue = entry.objectValue
  const source = toNormalizedString(objectValue.source)
  const sourceType = toNormalizedString(objectValue.sourceType)
  const origin = toNormalizedString(objectValue.origin)

  return (
    toBoolean(objectValue.isSystem) ||
    toBoolean(objectValue.system) ||
    toBoolean(objectValue.systemGenerated) ||
    source === 'system' ||
    sourceType === 'system' ||
    origin === 'system'
  )
}
