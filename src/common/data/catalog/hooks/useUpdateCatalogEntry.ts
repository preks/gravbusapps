import { useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { CatalogEntry } from '@/common/types/CatalogTypes'

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
        return await catalogClient.updateCatalogEntry(catalogIdentifier, version, entryId, entryData)
      } catch (error) {
        throw error
      }
    },
    [catalogClient]
  )

  return { updateCatalogEntry }
}

export default useUpdateCatalogEntry
