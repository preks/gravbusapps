import { BaseCatalog, BaseCatalogEntry, Catalog, CatalogEntry, CatalogEntryTranslation } from '../types/catalogTypes'

export interface ToCatalogOptions {
  mapEntries?: boolean
  mapChildEntries?: boolean
  entriesLimit?: number
  entriesOffset?: number
  search?: string
}

/**
 * Converts separate translation fields back into the translations array format expected by the API
 */
export const toTranslationsArray = (entryData: Partial<CatalogEntry>): CatalogEntryTranslation[] | undefined => {
  const translations: CatalogEntryTranslation[] = []
  const locales = new Set<string>()

  // Collect all locale codes from all translation fields
  if (entryData.valueTranslations) {
    for (const locale of Object.keys(entryData.valueTranslations)) {
      locales.add(locale)
    }
  }
  if (entryData.descriptionTranslations) {
    for (const locale of Object.keys(entryData.descriptionTranslations)) {
      locales.add(locale)
    }
  }
  if (entryData.additionalValue1Translations) {
    for (const locale of Object.keys(entryData.additionalValue1Translations)) {
      locales.add(locale)
    }
  }
  if (entryData.additionalValue2Translations) {
    for (const locale of Object.keys(entryData.additionalValue2Translations)) {
      locales.add(locale)
    }
  }
  if (entryData.additionalValue3Translations) {
    for (const locale of Object.keys(entryData.additionalValue3Translations)) {
      locales.add(locale)
    }
  }

  // Build translation objects for each locale
  for (const localeCode of locales) {
    const translation: Partial<CatalogEntryTranslation> = {
      localeCode,
      value: entryData.valueTranslations?.[localeCode] || '',
      additionalValue1: entryData.additionalValue1Translations?.[localeCode] || '',
      additionalValue2: entryData.additionalValue2Translations?.[localeCode] || '',
      additionalValue3: entryData.additionalValue3Translations?.[localeCode] || ''
    }

    // Description is stored in objectValue
    if (entryData.descriptionTranslations?.[localeCode]) {
      translation.objectValue = {
        description: entryData.descriptionTranslations[localeCode]
      }
    }

    translations.push(translation as CatalogEntryTranslation)
  }

  return translations.length > 0 ? translations : undefined
}

/**
 * Prepares catalog entry data for API submission by converting translation fields
 */
export const prepareCatalogEntryForApi = (entryData: Partial<CatalogEntry>): Partial<CatalogEntry> => {
  // Convert translation fields to translations array
  const translations = toTranslationsArray(entryData)

  // Remove translation fields from entry data
  const restData = { ...entryData }
  delete restData.valueTranslations
  delete restData.descriptionTranslations
  delete restData.additionalValue1Translations
  delete restData.additionalValue2Translations
  delete restData.additionalValue3Translations

  return {
    ...restData,
    ...(translations && { translations })
  }
}

export const toCatalog = (baseCatalog: BaseCatalog, options: ToCatalogOptions = {}): Catalog => {
  const entriesCount = baseCatalog.catalogEntriesAggregate?.aggregate?.count || 0
  const hasChildCatalogs = (baseCatalog.catalogs?.length || 0) > 0

  let status: 'active' | 'inactive' | 'draft' = 'active'
  if (baseCatalog.recordState === 'DRAFT') {
    status = 'draft'
  } else if (baseCatalog.validTo && new Date(baseCatalog.validTo) < new Date()) {
    status = 'inactive'
  }

  let color = '#1890ff'
  if (status === 'draft') color = '#faad14'
  else if (status === 'inactive') color = '#999999'
  else if (hasChildCatalogs) color = '#722ed1'

  const catalog: Catalog = {
    ...baseCatalog,
    displayName: baseCatalog.name || baseCatalog.identifier,
    entriesCount,
    hasChildCatalogs,
    lastUpdated: baseCatalog.updatedAt || baseCatalog.createdAt || '',
    status,
    color,
    // Initialize enhanced, UI-friendly pagination/search fields
    entries: undefined,
    total: baseCatalog.catalogEntriesAggregate?.aggregate?.count || 0,
    offset: 0,
    limit: 0,
    loading: false,
    search: undefined
  }

  if (options.mapEntries && baseCatalog.catalogEntries) {
    const baseEntries = baseCatalog.catalogEntries as BaseCatalogEntry[]
    const entries = baseEntries.map(e => toCatalogEntry(e, baseEntries, options.mapChildEntries))
    catalog.entries = entries
    catalog.total = baseCatalog.catalogEntriesAggregate?.aggregate?.count || entries.length || 0
    catalog.limit = options.entriesLimit ?? 0
    catalog.offset = options.entriesOffset ?? 0
    catalog.search = options.search
  }

  return catalog
}

export const toCatalogEntry = (
  baseEntry: BaseCatalogEntry,
  allEntries?: BaseCatalogEntry[],
  mapChildEntries: boolean = false
): CatalogEntry => {
  const hasChildren = (baseEntry.childEntries?.length || 0) > 0

  // Create entry without childEntries field
  const baseEntryWithoutChildren = { ...baseEntry }
  delete baseEntryWithoutChildren.childEntries

  let level = 0
  let currentParentId = baseEntry.parentEntryId
  const parentPath: string[] = []

  while (currentParentId && allEntries) {
    const parent = allEntries.find(e => e.id === currentParentId)
    if (parent) {
      parentPath.unshift(parent.value || parent.code || parent.description || parent.id)
      currentParentId = parent.parentEntryId
      level++
    } else {
      break
    }
  }

  const searchableFields = [
    baseEntry.value,
    baseEntry.description,
    baseEntry.code,
    baseEntry.alternativeCode,
    baseEntry.additionalValue1,
    baseEntry.additionalValue2,
    baseEntry.additionalValue3,
    baseEntry.type,
    baseEntry.displayOrder?.toString()
  ].filter(Boolean)

  const searchableText = (searchableFields as string[]).join(' ').toLowerCase()

  const displayValue = baseEntry.value || baseEntry.code || baseEntry.description || baseEntry.id

  // Transform translations array into separate translation fields
  const valueTranslations: Record<string, string> = {}
  const descriptionTranslations: Record<string, string> = {}
  const additionalValue1Translations: Record<string, string> = {}
  const additionalValue2Translations: Record<string, string> = {}
  const additionalValue3Translations: Record<string, string> = {}

  if (baseEntry.translations && Array.isArray(baseEntry.translations)) {
    for (const translation of baseEntry.translations) {
      if (translation.localeCode) {
        if (translation.value) {
          valueTranslations[translation.localeCode] = translation.value
        }
        // Description is stored in the objectValue field of translations
        if (translation.objectValue?.description) {
          descriptionTranslations[translation.localeCode] = translation.objectValue.description
        }
        if (translation.additionalValue1) {
          additionalValue1Translations[translation.localeCode] = translation.additionalValue1
        }
        if (translation.additionalValue2) {
          additionalValue2Translations[translation.localeCode] = translation.additionalValue2
        }
        if (translation.additionalValue3) {
          additionalValue3Translations[translation.localeCode] = translation.additionalValue3
        }
      }
    }
  }

  const entry: CatalogEntry = {
    ...(baseEntryWithoutChildren as Omit<BaseCatalogEntry, 'childEntries'>),
    displayValue,
    fullPath: parentPath.length > 0 ? `${parentPath.join(' > ')} > ${displayValue}` : displayValue,
    hasChildren,
    level,
    parentPath: parentPath.length > 0 ? parentPath.join(' > ') : undefined,
    searchableText,
    // Add transformed translation fields
    valueTranslations,
    descriptionTranslations,
    additionalValue1Translations,
    additionalValue2Translations,
    additionalValue3Translations
  }

  if (mapChildEntries && baseEntry.childEntries && baseEntry.childEntries.length > 0) {
    entry.childEntries = (baseEntry.childEntries as BaseCatalogEntry[]).map(child =>
      toCatalogEntry(child, allEntries, true)
    )
  }

  return entry
}
