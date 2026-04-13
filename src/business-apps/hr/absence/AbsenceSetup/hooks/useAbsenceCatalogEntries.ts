import { useCallback, useEffect, useState } from 'react'
import { toast } from '@newwork/nw-design-system'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import type { CatalogEntry, GetCatalogEntriesParams, GetCatalogsParams } from '@/common/types/CatalogTypes'
import type { JSONValue } from '@/common/types/i18nTypes'
import { isCatalogEntryDeleted } from '@/business-apps/hr/core/utils/catalogEntryHelpers'

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

const buildSoftDeletePutPayload = (entry: CatalogEntry): Record<string, unknown> => ({
  id: entry.id,
  code: entry.code,
  alternativeCode: entry.alternativeCode,
  type: entry.type,
  displayOrder: entry.displayOrder,
  localeCode: entry.localeCode,
  value: entry.value,
  additionalValue1: entry.additionalValue1,
  additionalValue2: entry.additionalValue2,
  additionalValue3: entry.additionalValue3,
  objectValue: entry.objectValue,
  parentEntryId: entry.parentEntryId,
  translations: entry.translations || [],
  isDeleted: true
})

const assignIfDefined = <K extends keyof Partial<Omit<CatalogEntry, 'id' | 'type'>>>(
  target: Partial<Omit<CatalogEntry, 'id' | 'type'>>,
  key: K,
  value: Partial<Omit<CatalogEntry, 'id' | 'type'>>[K]
) => {
  if (value === undefined) {
    return
  }

  target[key] = value
}

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
      return response?.data || []
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
      const loadedEntries = await fetchEntries(queryParams)
      setEntries(loadedEntries.filter(entry => !isCatalogEntryDeleted(entry)))
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

      setEntries(prev => [...prev, createdEntry])
      return createdEntry
    },
    [catalogIdentifier, client]
  )

  const updateEntry = useCallback(
    async (entryId: string, updates: Partial<AbsenceCatalogEntryPayload>) => {
      if (!client) {
        throw new Error('Catalog manager client not available')
      }

      const updatePayload: Partial<Omit<CatalogEntry, 'id' | 'type'>> = {}
      assignIfDefined(updatePayload, 'code', updates.code)
      assignIfDefined(updatePayload, 'value', updates.value)
      assignIfDefined(updatePayload, 'parentEntryId', updates.parentEntryId)
      assignIfDefined(updatePayload, 'objectValue', updates.objectValue)
      assignIfDefined(updatePayload, 'localeCode', updates.localeCode)
      assignIfDefined(updatePayload, 'translations', updates.translations)

      const updatedEntry = await client.updateCatalogEntry(catalogIdentifier, CATALOG_VERSION, entryId, updatePayload)

      setEntries(prev => prev.map(item => (item.id === entryId ? updatedEntry : item)))
      return updatedEntry
    },
    [catalogIdentifier, client]
  )

  const softDeleteEntry = useCallback(
    async (entryId: string) => {
      if (!client) {
        throw new Error('Catalog manager client not available')
      }

      const existingEntry = entries.find(item => item.id === entryId) || (await client.getCatalogEntryById(entryId))

      await client.updateCatalogEntry(
        catalogIdentifier,
        CATALOG_VERSION,
        entryId,
        buildSoftDeletePutPayload(existingEntry) as any
      )
      setEntries(prev => prev.filter(item => item.id !== entryId))
    },
    [catalogIdentifier, client, entries]
  )

  return {
    entries,
    loading,
    error,
    createEntry,
    updateEntry,
    deleteEntry: softDeleteEntry,
    fetchEntries,
    refetch: loadEntries
  }
}
