import { useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

export const useExportCatalogs = (context: BusinessAppContextProps) => {
  const catalogClient = useCatalogManagerClient(context.accessToken)

  const exportCatalogs = useCallback(
    async (catalogIds?: string[]): Promise<Blob> => {
      return await catalogClient.exportCatalogs({ catalogIds })
    },
    [catalogClient]
  )

  return { exportCatalogs }
}

export default useExportCatalogs
