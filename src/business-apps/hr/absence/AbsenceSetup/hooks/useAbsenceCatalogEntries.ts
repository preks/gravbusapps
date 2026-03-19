import { useCallback, useEffect, useState } from 'react'
import { toast } from '@newwork/nw-design-system'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import type { CatalogEntry, GetCatalogEntriesParams, GetCatalogsParams } from '@/common/types/CatalogTypes'
import type { JSONValue } from '@/common/types/i18nTypes'

export interface AbsenceCatalogEntryPayload {
  id?: string
  code: string
  value: string
  type?: string
  parentEntryId?: string
  objectValue?: JSONValue
  localeCode?: string
  translations?: CatalogEntry['translations']
}

const CATALOG_VERSION = 'v1'

export const useAbsenceCatalogEntries = (accessToken: string, catalogIdentifier: string) => {
  const client = useCatalogManagerClient(accessToken)
  const [entries, setEntries] = useState<CatalogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchEntries = useCallback(
    async (queryParams: GetCatalogsParams = {}) => {
      if (!client) {
        throw new Error('Catalog manager client not available')
      }

      const pathParams: GetCatalogEntriesParams = {
        catalogIdentifier,
        version: CATALOG_VERSION
      }

      const response = await client.getCatalogEntriesList(pathParams, queryParams)
      return (response?.data || []) as CatalogEntry[]
    },
    [catalogIdentifier, client]
  )

  const loadEntries = useCallback(async () => {
    if (!accessToken || !client) {
      setEntries([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const queryParams: GetCatalogsParams = {
        includeLocalizedVersions: true,
        includeTranslations: true,
        localeCode: 'en-US',
        limit: 200,
        offset: 0
      }
      setEntries(await fetchEntries(queryParams))
    } catch (err) {
      const resolvedError = err instanceof Error ? err : new Error(`Failed to fetch ${catalogIdentifier} entries`)
      console.error(`[useAbsenceCatalogEntries] Failed to fetch ${catalogIdentifier}:`, resolvedError.message)
      setError(resolvedError)
      setEntries([])
      toast.error(resolvedError.message)
    } finally {
      setLoading(false)
    }
  }, [accessToken, catalogIdentifier, client, fetchEntries])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  const createEntry = useCallback(
    async (entry: AbsenceCatalogEntryPayload) => {
      if (!client) {
        throw new Error('Catalog manager client not available')
      }

      const createdEntry = await client.createCatalogEntry(catalogIdentifier, CATALOG_VERSION, {
        code: entry.code,
        value: entry.value,
        parentEntryId: entry.parentEntryId,
        objectValue: entry.objectValue,
        localeCode: entry.localeCode || 'en-US',
        translations: entry.translations || []
      })

      setEntries(prev => [...prev, createdEntry as CatalogEntry])
      return createdEntry as CatalogEntry
    },
    [catalogIdentifier, client]
  )

  const updateEntry = useCallback(
    async (entryId: string, updates: Partial<AbsenceCatalogEntryPayload>) => {
      if (!client) {
        throw new Error('Catalog manager client not available')
      }

      const updatedEntry = await client.updateCatalogEntry(catalogIdentifier, CATALOG_VERSION, entryId, {
        ...(updates.id !== undefined ? { id: updates.id } : {}),
        ...(updates.code !== undefined ? { code: updates.code } : {}),
        ...(updates.value !== undefined ? { value: updates.value } : {}),
        ...(updates.type !== undefined ? { type: updates.type } : {}),
        ...(updates.parentEntryId !== undefined ? { parentEntryId: updates.parentEntryId } : {}),
        ...(updates.objectValue !== undefined ? { objectValue: updates.objectValue } : {}),
        ...(updates.localeCode !== undefined ? { localeCode: updates.localeCode } : {}),
        ...(updates.translations !== undefined ? { translations: updates.translations } : {})
      })

      setEntries(prev => prev.map(item => (item.id === entryId ? (updatedEntry as CatalogEntry) : item)))
      return updatedEntry as CatalogEntry
    },
    [catalogIdentifier, client]
  )

  const deleteEntry = useCallback(
    async (entryId: string) => {
      if (!client) {
        throw new Error('Catalog manager client not available')
      }

      await client.deleteCatalogEntry(catalogIdentifier, CATALOG_VERSION, entryId)
      setEntries(prev => prev.filter(item => item.id !== entryId))
    },
    [catalogIdentifier, client]
  )

  return {
    entries,
    loading,
    error,
    createEntry,
    updateEntry,
    deleteEntry,
    fetchEntries,
    refetch: loadEntries
  }
}
