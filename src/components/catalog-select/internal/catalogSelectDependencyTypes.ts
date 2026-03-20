import type React from 'react'
import type { CatalogEntry } from '@/common/data/catalog/types/catalogTypes'
import type { CatalogSelectOption } from './useCatalogSelect'

export type CatalogSelectDependencyState = {
  value: string
  loading: boolean
  options: CatalogSelectOption[]
  prefetchedOptions?: CatalogSelectOption[]
  total: number
  fullTotal?: number
  limit: number
  offset: number
  search?: string
  variant: 'select' | 'combobox'
  metaByValue?: Record<string, { parentEntryId?: string; type?: string }>
  lastFiltersSig?: string
  manuallyCleared?: boolean
}

export type CatalogSelectDependencySetter = (
  id: string,
  updater: (prev: CatalogSelectDependencyState) => CatalogSelectDependencyState
) => void

export type CatalogSelectDependencyFetcher = (
  identifier: string,
  params: {
    limit?: number
    offset?: number
    search?: string
    parentEntryId?: string
    typeEquals?: string
    entryId?: string
  }
) => Promise<{ entries: CatalogEntry[]; totalCount: number }>

export type CatalogSelectRequestVersionRef = React.MutableRefObject<Map<string, number>>
