import { useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { CatalogManagement } from '@/common/types/CatalogTypes'

export const useCreateCatalog = (context: BusinessAppContextProps) => {
  const catalogClient = useCatalogManagerClient(context.accessToken)

  const createCatalog = useCallback(
    async (
      catalogData: Omit<CatalogManagement, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>
    ): Promise<CatalogManagement> => {
      try {
        return await catalogClient.createCatalog(catalogData)
      } catch (error) {
        throw error
      }
    },
    [catalogClient]
  )

  return { createCatalog }
}

export default useCreateCatalog
