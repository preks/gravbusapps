import { CatalogEntry } from '@/common/types/CatalogTypes'

export const formatCatalogEntry = (entry: CatalogEntry): string => {
  return entry.value || entry.code || entry.id
}

export const createCatalogValue = (catalogName: string, version: string, code: string): string => {
  return `${catalogName}:${version}:${code}`
}
