import { useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { CatalogManagement } from '@/common/types/CatalogTypes'

export const useUpdateCatalog = (context: BusinessAppContextProps) => {
  const catalogClient = useCatalogManagerClient(context.accessToken)

  const updateCatalog = useCallback(
    async (
      identifier: string,
      version: string,
      catalogData: Partial<CatalogManagement>
    ): Promise<CatalogManagement> => {
      try {
        return await catalogClient.updateCatalog(identifier, version, catalogData)
      } catch (error) {
        throw error
      }
    },
    [catalogClient]
  )

  return { updateCatalog }
}

export default useUpdateCatalog
