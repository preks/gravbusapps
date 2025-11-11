import { CatalogEntry } from '@/common/types/CatalogTypes'

// Format catalog entry for display
export const formatCatalogEntry = (entry: CatalogEntry): string => {
  return entry.value || entry.code || entry.id
}

// Create catalog entry value (format: CatalogName:Version:Code)
export const createCatalogValue = (catalogName: string, version: string, code: string): string => {
  return `${catalogName}:${version}:${code}`
}
