import { useCallback, useEffect, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useCatalogEntries,
  useCreateCatalogEntry,
  useUpdateCatalogEntry,
  useDeleteCatalogEntry,
  CatalogEntry
} from '@/common/data/catalog'

export interface UseLauncherConfigsOptions {
  launcherId: string
  search?: string
  limit?: number
  offset?: number
}

export const LAUNCHER_CONFIG_CATALOG = 'LauncherConfig'
export const LAUNCHER_CONFIG_VERSION = 'v1'

export const useLauncherConfigs = (context: BusinessAppContextProps, options: UseLauncherConfigsOptions) => {
  const { fetchCatalogEntriesByIdentifier } = useCatalogEntries({ accessToken: context.accessToken })
  const { createCatalogEntry } = useCreateCatalogEntry(context)
  const { updateCatalogEntry } = useUpdateCatalogEntry(context)
  const { deleteCatalogEntry } = useDeleteCatalogEntry(context)

  const [data, setData] = useState<CatalogEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  const limit = options.limit ?? 100
  const offset = options.offset ?? 0
  const search = options.search?.trim() ?? ''
  const launcherId = options.launcherId

  const fetchData = useCallback(async () => {
    if (!context.accessToken || !launcherId) return
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchCatalogEntriesByIdentifier(LAUNCHER_CONFIG_CATALOG, {
        version: LAUNCHER_CONFIG_VERSION,
        limit,
        offset,
        includeChildEntries: true,
        typeEquals: 'CARD',
        parentEntryId: launcherId,
        ...(search && { search })
      })

      const filtered = (result.entries || []).filter(
        e => e.parentEntryId === launcherId && (e.type === 'CARD' || !e.type)
      )
      const sorted = filtered.map(e => ({ ...e })).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      setData(sorted)
      setTotal(sorted.length)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load launcher configs')
    } finally {
      setIsLoading(false)
    }
  }, [fetchCatalogEntriesByIdentifier, limit, offset, search, context.accessToken, launcherId])

  const createConfig = useCallback(
    async (payload: {
      parentEntryId: string
      code: string
      value: string
      displayOrder: number // order
      additionalValue1?: string // description
      additionalValue2?: string // url
      additionalValue3?: string // icon
      translations?: any[] // translations array
      catalogId?: string // catalog relationship
    }) => {
      return createCatalogEntry(LAUNCHER_CONFIG_CATALOG, LAUNCHER_CONFIG_VERSION, {
        code: payload.code,
        value: payload.value,
        parentEntryId: payload.parentEntryId,
        catalogId: payload.catalogId, // Include catalog relationship
        additionalValue1: payload.additionalValue1,
        additionalValue2: payload.additionalValue2,
        additionalValue3: payload.additionalValue3,
        translations: payload.translations || [],
        type: 'CARD',
        // Use displayOrder for ordering
        displayOrder: payload.displayOrder,
        isDeleted: false,
        recordState: 'ACTIVE'
      } as any)
    },
    [createCatalogEntry]
  )

  const updateConfig = useCallback(
    async (
      id: string,
      payload: {
        name: string
        description?: string
        url?: string
        iconName?: string
        translations?: any[] // translations array
      }
    ) => {
      const existing = data.find(d => d.id === id)
      if (!existing) return

      const updatePayload = {
        // Required for updates
        id: existing.id,
        version: (existing as any).version || LAUNCHER_CONFIG_VERSION,

        // Preserve existing fields that shouldn't change
        code: existing.code,
        description: existing.description,
        catalogId: existing.catalogId,
        parentEntryId: existing.parentEntryId,
        alternativeCode: existing.alternativeCode, // Keep existing alternativeCode
        displayOrder: existing.displayOrder, // Keep existing displayOrder
        objectValue: existing.objectValue,

        // Update the fields that can be changed
        value: payload.name,
        additionalValue1: payload.description !== undefined ? payload.description : existing.additionalValue1,
        additionalValue2: payload.url !== undefined ? payload.url : existing.additionalValue2,
        additionalValue3: payload.iconName !== undefined ? payload.iconName : existing.additionalValue3,
        translations: payload.translations !== undefined ? payload.translations : existing.translations || [],
        type: (existing as any).type || 'CARD',

        // Preserve timestamps and state
        activeFrom: existing.activeFrom,
        activeTo: existing.activeTo,
        isDeleted: existing.isDeleted,
        recordState: existing.recordState
      }

      return updateCatalogEntry(LAUNCHER_CONFIG_CATALOG, LAUNCHER_CONFIG_VERSION, id, updatePayload)
    },
    [updateCatalogEntry, data]
  )

  const updateConfigOrder = useCallback(
    async (orderedIds: string[]) => {
      // Only update entries that actually have a different order
      const updatePromises = orderedIds
        .map((id, index) => {
          const entry = data.find(d => d.id === id)
          if (!entry) return null

          const newOrder = index + 1
          const currentOrder = entry.displayOrder || 0

          // Only update if the order actually changed
          if (newOrder === currentOrder) {
            console.log(`Entry ${entry.code} order unchanged: ${currentOrder}`)
            return null
          }

          console.log(`Entry ${entry.code} order changed: ${currentOrder} -> ${newOrder}`)

          const payload = {
            // Required for updates
            id: entry.id,
            version: (entry as any).version || LAUNCHER_CONFIG_VERSION,

            // Preserve all existing fields
            code: entry.code,
            value: entry.value,
            description: entry.description,
            catalogId: entry.catalogId,
            parentEntryId: entry.parentEntryId,
            additionalValue1: entry.additionalValue1,
            additionalValue2: entry.additionalValue2,
            additionalValue3: entry.additionalValue3,
            objectValue: entry.objectValue,

            // Update only the order
            displayOrder: newOrder,
            // Keep existing alternativeCode
            alternativeCode: entry.alternativeCode,

            // Preserve metadata
            translations: entry.translations || [],
            type: (entry as any).type || 'CARD',
            activeFrom: entry.activeFrom,
            activeTo: entry.activeTo,
            isDeleted: entry.isDeleted,
            recordState: entry.recordState
          }

          return updateCatalogEntry(LAUNCHER_CONFIG_CATALOG, LAUNCHER_CONFIG_VERSION, id, payload)
        })
        .filter(Boolean) // Remove null entries (unchanged orders)

      if (updatePromises.length === 0) {
        console.log('No entries need order updates')
        return
      }

      console.log(`Updating ${updatePromises.length} entries with new order`)
      await Promise.all(updatePromises)
    },
    [updateCatalogEntry, data]
  )

  const deleteConfig = useCallback(
    async (id: string) => {
      await deleteCatalogEntry(LAUNCHER_CONFIG_CATALOG, LAUNCHER_CONFIG_VERSION, id)
    },
    [deleteCatalogEntry]
  )

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    total,
    isLoading,
    error,
    refetch: fetchData,
    createConfig,
    updateConfigOrder,
    updateConfig,
    deleteConfig
  }
}
