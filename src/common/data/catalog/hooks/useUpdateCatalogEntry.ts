import { useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { CatalogEntry } from '@/common/types/CatalogTypes'
import { prepareCatalogEntryForApi } from '../mappers/catalogMappers'

export const useUpdateCatalogEntry = (context: BusinessAppContextProps) => {
  const catalogClient = useCatalogManagerClient(context.accessToken)

  const updateCatalogEntry = useCallback(
    async (
      catalogIdentifier: string,
      version: string,
      entryId: string,
      entryData: Partial<Omit<CatalogEntry, 'id' | 'type'>>
    ): Promise<CatalogEntry> => {
      try {
        // Convert translation fields to the format expected by the API
        const preparedData = prepareCatalogEntryForApi(entryData)
        return await catalogClient.updateCatalogEntry(catalogIdentifier, version, entryId, preparedData)
      } catch (error) {
        throw error
      }
    },
    [catalogClient]
  )

  return { updateCatalogEntry }
}

export default useUpdateCatalogEntry
