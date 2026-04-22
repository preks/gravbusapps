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

const mergeCatalogEntry = (incomingEntry: CatalogEntry, existingEntry?: CatalogEntry): CatalogEntry => ({
  ...(existingEntry || {}),
  ...incomingEntry,
  value: incomingEntry.value || existingEntry?.value || '',
  localeCode: incomingEntry.localeCode || existingEntry?.localeCode,
  parentEntryId: incomingEntry.parentEntryId ?? existingEntry?.parentEntryId,
  objectValue: incomingEntry.objectValue !== undefined ? incomingEntry.objectValue : existingEntry?.objectValue,
  translations:
    incomingEntry.translations !== undefined ? incomingEntry.translations : (existingEntry?.translations ?? [])
})

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
      return [] as CatalogEntry[]
    }

    setLoading(true)
    setError(null)

    try {
      const queryParams: GetCatalogsParams = {
        includeTranslations: true,
        localeCode: 'en-US',
        limit: 200,
        offset: 0
      }
      const loadedEntries = await fetchEntries(queryParams)
      const nextEntries = loadedEntries.filter(entry => !isCatalogEntryDeleted(entry))
      setEntries(nextEntries)
      return nextEntries
    } catch (err) {
      const resolvedError = err instanceof Error ? err : new Error(`Failed to fetch ${catalogIdentifier} entries`)
      console.error(`[useAbsenceCatalogEntries] Failed to fetch ${catalogIdentifier}:`, resolvedError.message)
      setError(resolvedError)
      setEntries([])
      toast.error(resolvedError.message)
      return [] as CatalogEntry[]
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
      const mergedCreatedEntry = mergeCatalogEntry(createdEntry)

      setEntries(prev => [...prev, mergedCreatedEntry])
      return mergedCreatedEntry
    },
    [catalogIdentifier, client]
  )

  const updateEntry = useCallback(
    async (entryId: string, updates: Partial<AbsenceCatalogEntryPayload>) => {
      if (!client) {
        throw new Error('Catalog manager client not available')
      }

      const existingEntry = entries.find(item => item.id === entryId) || (await client.getCatalogEntryById(entryId))
      const updatePayload: Partial<CatalogEntry> = {
        id: existingEntry.id,
        code: existingEntry.code,
        alternativeCode: existingEntry.alternativeCode,
        displayOrder: existingEntry.displayOrder,
        localeCode: updates.localeCode ?? existingEntry.localeCode,
        value: updates.value ?? existingEntry.value,
        additionalValue1: existingEntry.additionalValue1,
        additionalValue2: existingEntry.additionalValue2,
        additionalValue3: existingEntry.additionalValue3,
        type: existingEntry.type,
        objectValue: updates.objectValue !== undefined ? updates.objectValue : existingEntry.objectValue,
        isDeleted: existingEntry.isDeleted,
        parentEntryId: updates.parentEntryId ?? existingEntry.parentEntryId,
        translations: updates.translations ?? existingEntry.translations ?? []
      }

      const updatedEntry = await client.updateCatalogEntry(catalogIdentifier, CATALOG_VERSION, entryId, updatePayload)
      const mergedUpdatedEntry = mergeCatalogEntry(updatedEntry, existingEntry)

      setEntries(prev => prev.map(item => (item.id === entryId ? mergedUpdatedEntry : item)))
      return mergedUpdatedEntry
    },
    [catalogIdentifier, client, entries]
  )

  const getEntryById = useCallback(
    async (entryId: string) => {
      if (!client) {
        throw new Error('Catalog manager client not available')
      }

      const existingEntry = entries.find(item => item.id === entryId)
      const entry = (await client.readCatalogEntryById(entryId, {
        localeCode: existingEntry?.localeCode || 'en-US',
        includeTranslations: true
      })) as CatalogEntry
      const mergedEntry = mergeCatalogEntry(entry, existingEntry)
      setEntries(prev => {
        const existingIndex = prev.findIndex(item => item.id === entryId)
        if (existingIndex === -1) {
          return [...prev, mergedEntry]
        }

        return prev.map(item => (item.id === entryId ? mergedEntry : item))
      })

      return mergedEntry
    },
    [client, entries]
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
    getEntryById,
    deleteEntry: softDeleteEntry,
    fetchEntries,
    refetch: loadEntries
  }
}
