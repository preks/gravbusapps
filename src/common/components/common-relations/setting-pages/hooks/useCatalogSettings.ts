import React from 'react'
import {
  useCatalogEntries,
  useCreateCatalogEntry,
  useUpdateCatalogEntry,
  useDeleteCatalogEntry
} from '@/common/data/catalog'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface CatalogItem {
  id: string
  code: string
  value: string
  type?: string
  alternativeCode?: string
  parentEntryId?: string
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
    type?: string
    alternativeCode?: string
    parentEntryId?: string
    additionalValue1?: string
    displayOrder?: number
  }) => Promise<void>
  onUpdate: (
    id: string,
    data: {
      code: string
      value: string
      type?: string
      alternativeCode?: string
      parentEntryId?: string
      additionalValue1?: string
      displayOrder?: number
    }
  ) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onSearchChange: (value: string) => void
}

export function useCatalogSettings(
  context: Pick<BusinessAppContextProps, 'accessToken' | 'userInfo' | 'additionalData'>,
  catalogIdentifier: string
): CatalogSettingsState {
  const { fetchCatalogEntriesByIdentifier } = useCatalogEntries({ accessToken: context.accessToken })
  const { createCatalogEntry } = useCreateCatalogEntry(context)
  const { updateCatalogEntry } = useUpdateCatalogEntry(context)
  const { deleteCatalogEntry } = useDeleteCatalogEntry(context)

  const [items, setItems] = React.useState<CatalogItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState('')

  const load = React.useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const { entries } = await fetchCatalogEntriesByIdentifier(catalogIdentifier, {
        version: 'v1',
        limit: 1000,
        offset: 0,
        includeChildCatalogEntries: true,
        ...(search && { search })
      })
      const mappedEntries = entries.map(entry => ({
        id: entry.id,
        code: entry.code || '',
        value: entry.value || '',
        type: entry.type,
        alternativeCode: entry.alternativeCode,
        parentEntryId: entry.parentEntryId,
        displayOrder: entry.displayOrder,
        additionalValue1: entry.additionalValue1,
        additionalValue2: entry.additionalValue2,
        additionalValue3: entry.additionalValue3
      }))
      setItems(mappedEntries)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }, [fetchCatalogEntriesByIdentifier, catalogIdentifier, search])

  React.useEffect(() => {
    load()
  }, [load])

  const create = React.useCallback(
    async (data: {
      code: string
      value: string
      type?: string
      alternativeCode?: string
      parentEntryId?: string
      additionalValue1?: string
      displayOrder?: number
    }) => {
      await createCatalogEntry(catalogIdentifier, 'v1', {
        code: data.code,
        value: data.value,
        type: data.type,
        alternativeCode: data.alternativeCode,
        parentEntryId: data.parentEntryId,
        displayOrder: data.displayOrder,
        additionalValue1: data.additionalValue1,
        objectValue: {},
        translations: []
      } as any)
      await load()
    },
    [createCatalogEntry, catalogIdentifier, load]
  )

  const update = React.useCallback(
    async (
      id: string,
      data: {
        code: string
        value: string
        type?: string
        alternativeCode?: string
        parentEntryId?: string
        additionalValue1?: string
        displayOrder?: number
      }
    ) => {
      await updateCatalogEntry(catalogIdentifier, 'v1', id, {
        id: id,
        code: data.code,
        value: data.value,
        type: data.type,
        alternativeCode: data.alternativeCode,
        parentEntryId: data.parentEntryId,
        displayOrder: data.displayOrder,
        additionalValue1: data.additionalValue1,
        objectValue: {},
        translations: []
      })
      await load()
    },
    [updateCatalogEntry, catalogIdentifier, load]
  )

  const remove = React.useCallback(
    async (id: string) => {
      await deleteCatalogEntry(catalogIdentifier, 'v1', id)
      await load()
    },
    [deleteCatalogEntry, catalogIdentifier, load]
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
