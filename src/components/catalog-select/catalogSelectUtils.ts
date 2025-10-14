import type { CatalogEntry } from '@/common/data/catalog/types/catalogTypes'

export interface EntryMeta {
  parentEntryId?: string
  type?: string
}

export interface ActiveFilters {
  parentEntryId?: string
  typeEquals?: string
}

export const toOptions = (entries: CatalogEntry[]) => entries.map(e => ({ value: e.id, label: e.displayValue }))

export const buildEntryMeta = (entries: CatalogEntry[]): Record<string, EntryMeta> => {
  const meta: Record<string, EntryMeta> = {}
  entries.forEach(e => {
    meta[e.id] = {
      parentEntryId: e.parentEntryId,
      type: e.type
    }
  })
  return meta
}

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
