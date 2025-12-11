import { useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { CatalogEntry } from '@/common/types/CatalogTypes'
import { prepareCatalogEntryForApi } from '../mappers/catalogMappers'

export interface CreateCatalogEntryResult {
  entry: Omit<CatalogEntry, 'id' | 'type'>
  success: boolean
  createdEntry?: CatalogEntry
  error?: Error
}

export interface CreateCatalogEntriesResult {
  results: CreateCatalogEntryResult[]
  successCount: number
  failureCount: number
  totalCount: number
}

export const useCreateCatalogEntries = (context: BusinessAppContextProps) => {
  const catalogClient = useCatalogManagerClient(context.accessToken)

  const createCatalogEntries = useCallback(
    async (
      catalogIdentifier: string,
      version: string,
      entriesData: Array<Omit<CatalogEntry, 'id' | 'type'>>
    ): Promise<CreateCatalogEntriesResult> => {
      if (entriesData.length === 0) {
        return {
          results: [],
          successCount: 0,
          failureCount: 0,
          totalCount: 0
        }
      }

      const createPromises = entriesData.map(async (entryData): Promise<CreateCatalogEntryResult> => {
        try {
          const preparedData = prepareCatalogEntryForApi(entryData)
          const createdEntry = await catalogClient.createCatalogEntry(catalogIdentifier, version, preparedData)
          return {
            entry: entryData,
            success: true,
            createdEntry
          }
        } catch (error) {
          return {
            entry: entryData,
            success: false,
            error: error instanceof Error ? error : new Error(String(error))
          }
        }
      })

      const results = await Promise.all(createPromises)
      const successCount = results.filter(r => r.success).length
      const failureCount = results.filter(r => !r.success).length

      return {
        results,
        successCount,
        failureCount,
        totalCount: entriesData.length
      }
    },
    [catalogClient]
  )

  return { createCatalogEntries }
}

export default useCreateCatalogEntries
