import { useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

export const useDeleteCatalog = (context: BusinessAppContextProps) => {
  const catalogClient = useCatalogManagerClient(context.accessToken)

  const deleteCatalog = useCallback(
    async (identifier: string, version: string): Promise<void> => {
      try {
        await catalogClient.deleteCatalog(identifier, version)
      } catch (error) {
        throw error
      }
    },
    [catalogClient]
  )

  return { deleteCatalog }
}

export default useDeleteCatalog
