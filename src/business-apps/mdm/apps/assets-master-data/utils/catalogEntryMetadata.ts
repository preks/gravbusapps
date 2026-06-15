import type { CatalogEntry } from '@/common/types/CatalogTypes'

export function isAssetCatalogEntryMarkedDeleted(entry: { isDeleted?: boolean }): boolean {
  return entry.isDeleted === true
}

export function upsertAssetCatalogTranslationForLocale(
  translations: CatalogEntry['translations'] | undefined,
  localeCode: string,
  patch: { value?: string; additionalValue1?: string }
): NonNullable<CatalogEntry['translations']> {
  const list = Array.isArray(translations) ? [...translations] : []
  const existingIndex = list.findIndex(translation => translation.localeCode === localeCode)

  if (existingIndex >= 0) {
    list[existingIndex] = { ...list[existingIndex], localeCode, ...patch }
    return list
  }

  list.push({ localeCode, ...patch })
  return list
}

type AssetCatalogEntryPutOverrides = Partial<
  Pick<
    CatalogEntry,
    | 'value'
    | 'additionalValue1'
    | 'additionalValue2'
    | 'additionalValue3'
    | 'objectValue'
    | 'isDeleted'
    | 'translations'
  >
> & {
  parentEntryId?: string | null
}

export function mergeAssetCatalogEntryForPut(
  existing: CatalogEntry,
  overrides: AssetCatalogEntryPutOverrides
): Record<string, unknown> {
  return {
    id: existing.id,
    code: existing.code,
    alternativeCode: existing.alternativeCode,
    type: existing.type,
    displayOrder: existing.displayOrder,
    localeCode: existing.localeCode,
    value: overrides.value ?? existing.value,
    additionalValue1: overrides.additionalValue1 ?? existing.additionalValue1,
    additionalValue2: overrides.additionalValue2 ?? existing.additionalValue2,
    additionalValue3: overrides.additionalValue3 ?? existing.additionalValue3,
    objectValue: overrides.objectValue ?? existing.objectValue,
    isDeleted: overrides.isDeleted ?? existing.isDeleted,
    parentEntryId: 'parentEntryId' in overrides ? overrides.parentEntryId : existing.parentEntryId,
    translations: overrides.translations ?? existing.translations ?? []
  }
}
