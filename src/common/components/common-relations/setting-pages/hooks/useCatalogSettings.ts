import React from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

export interface CatalogItem {
  id: string
  code: string
  value: string
  alternativeCode?: string
  displayOrder?: number
  additionalValue1?: string
  additionalValue2?: string
  additionalValue3?: string
}

export interface CatalogSettingsState {
  items: CatalogItem[]
  isLoading: boolean
  error: string | null
  onRetry: () => Promise<void>
  onCreate: (data: {
    code: string
    value: string
    alternativeCode?: string
    additionalValue1?: string
  }) => Promise<void>
  onUpdate: (
    id: string,
    data: { code: string; value: string; alternativeCode?: string; additionalValue1?: string }
  ) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onSearchChange: (value: string) => void
}

export function useCatalogSettings(accessToken: string, catalogIdentifier: string): CatalogSettingsState {
  const catalogClient = useCatalogManagerClient(accessToken)

  const [items, setItems] = React.useState<CatalogItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState('')

  const load = React.useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier, version: 'v1' },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: false,
          ...(search && { searchCriteria: search })
        }
      )
      const entries = (response.data || []).map((entry: any) => ({
        id: entry.id,
        code: entry.code,
        value: entry.value,
        alternativeCode: entry.alternativeCode,
        displayOrder:
          (entry.displayOrder ?? (entry.alternativeCode ? parseInt(entry.alternativeCode, 10) : undefined)) ||
          undefined,
        additionalValue1: entry.additionalValue1,
        additionalValue2: entry.additionalValue2,
        additionalValue3: entry.additionalValue3
      }))
      setItems(entries)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }, [catalogClient, catalogIdentifier, search])

  React.useEffect(() => {
    load()
  }, [load])

  const create = React.useCallback(
    async (data: {
      code: string
      value: string
      alternativeCode?: string
      additionalValue1?: string
      displayOrder?: number
    }) => {
      await catalogClient.createCatalogEntry(catalogIdentifier, 'v1', {
        code: data.code,
        value: data.value,
        alternativeCode: data.alternativeCode ?? (data.displayOrder != null ? String(data.displayOrder) : undefined),
        displayOrder: data.displayOrder,
        additionalValue1: data.additionalValue1,
        objectValue: {},
        translations: []
      })
      await load()
    },
    [catalogClient, catalogIdentifier, load]
  )

  const update = React.useCallback(
    async (
      id: string,
      data: { code: string; value: string; alternativeCode?: string; additionalValue1?: string; displayOrder?: number }
    ) => {
      await catalogClient.updateCatalogEntry(id, {
        code: data.code,
        value: data.value,
        alternativeCode: data.alternativeCode ?? (data.displayOrder != null ? String(data.displayOrder) : undefined),
        displayOrder: data.displayOrder,
        additionalValue1: data.additionalValue1,
        objectValue: {},
        translations: []
      })
      await load()
    },
    [catalogClient, load]
  )

  const remove = React.useCallback(
    async (id: string) => {
      await catalogClient.deleteCatalogEntry(id)
      await load()
    },
    [catalogClient, load]
  )

  return {
    items,
    isLoading,
    error,
    onRetry: load,
    onCreate: create,
    onUpdate: update,
    onDelete: remove,
    onSearchChange: setSearch
  }
}
