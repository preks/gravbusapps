import type { CatalogEntry } from '@/common/data/catalog/types/catalogTypes'

/**
 * Catalog string stored on ICP `objectValue` for catalog-backed criteria.
 * Uses the entry's display-oriented fields (not the catalog row id) so profiles
 * stay readable and align with APIs that key off value/code.
 */
export function catalogEntryToIcpPersistedValue(entry: CatalogEntry): string {
  const fromValue = entry.value != null && String(entry.value).trim()
  if (fromValue) return fromValue
  const fromDisplay = entry.displayValue != null && String(entry.displayValue).trim()
  if (fromDisplay) return fromDisplay
  const fromCode = entry.code != null && String(entry.code).trim()
  if (fromCode) return fromCode
  return entry.id
}
