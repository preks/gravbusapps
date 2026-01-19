import { useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { CatalogEntry } from '@/common/types/CatalogTypes'
import { prepareCatalogEntryForApi } from '../mappers/catalogMappers'

export const useCreateCatalogEntry = (context: BusinessAppContextProps) => {
  const catalogClient = useCatalogManagerClient(context.accessToken)

  const createCatalogEntry = useCallback(
    async (
      catalogIdentifier: string,
      version: string,
      entryData: Omit<CatalogEntry, 'id' | 'type'>
    ): Promise<CatalogEntry> => {
      try {
        // Convert translation fields to the format expected by the API
        const preparedData = prepareCatalogEntryForApi(entryData)
        return await catalogClient.createCatalogEntry(catalogIdentifier, version, preparedData)
      } catch (error) {
        throw error
      }
    },
    [catalogClient]
  )

  return { createCatalogEntry }
}

export default useCreateCatalogEntry
