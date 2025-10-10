import { useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

export const useDeleteCatalogEntry = (context: BusinessAppContextProps) => {
  const catalogClient = useCatalogManagerClient(context.accessToken)

  const deleteCatalogEntry = useCallback(
    async (catalogIdentifier: string, version: string, entryId: string): Promise<void> => {
      try {
        await catalogClient.deleteCatalogEntry(catalogIdentifier, version, entryId)
      } catch (error) {
        throw error
      }
    },
    [catalogClient]
  )

  return { deleteCatalogEntry }
}

export default useDeleteCatalogEntry
