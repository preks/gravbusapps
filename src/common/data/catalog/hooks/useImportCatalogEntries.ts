import { useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { CatalogEntryManagement, ImportCatalogEntriesParams } from '@/common/types/CatalogTypes'

export const useImportCatalogEntries = (context: BusinessAppContextProps) => {
  const catalogClient = useCatalogManagerClient(context.accessToken)

  const importCatalogEntries = useCallback(
    async (params: ImportCatalogEntriesParams, file: File): Promise<CatalogEntryManagement[]> => {
      return await catalogClient.importCatalogEntries(params, file)
    },
    [catalogClient]
  )

  return { importCatalogEntries }
}

export default useImportCatalogEntries
