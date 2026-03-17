import { useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CatalogManagement, CatalogEntryManagement, ImportCatalogEntriesParams } from '@/common/types/CatalogTypes'
import {
  useCreateCatalog,
  useUpdateCatalog,
  useDeleteCatalog,
  useCreateCatalogEntry,
  useUpdateCatalogEntry,
  useDeleteCatalogEntry,
  useImportCatalogEntries,
  useExportCatalogs
} from '@/common/data/catalog'

interface UseCatalogDataProps {
  accessToken: string
}

interface CatalogDataState {
  isLoading: boolean
  error: string | null
}

export const useCatalogData = ({ accessToken }: UseCatalogDataProps) => {
  const [state, setState] = useState<CatalogDataState>({
    isLoading: false,
    error: null
  })

  const context = { accessToken } as BusinessAppContextProps
  const { createCatalog: doCreateCatalog } = useCreateCatalog(context)
  const { updateCatalog: doUpdateCatalog } = useUpdateCatalog(context)
  const { deleteCatalog: doDeleteCatalog } = useDeleteCatalog(context)
  const { createCatalogEntry: doCreateCatalogEntry } = useCreateCatalogEntry(context)
  const { updateCatalogEntry: doUpdateCatalogEntry } = useUpdateCatalogEntry(context)
  const { deleteCatalogEntry: doDeleteCatalogEntry } = useDeleteCatalogEntry(context)
  const { importCatalogEntries: doImportCatalogEntries } = useImportCatalogEntries(context)
  const { exportCatalogs: doExportCatalogs } = useExportCatalogs(context)

  const createCatalog = useCallback(
    async (
      catalogData: Omit<CatalogManagement, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>
    ): Promise<CatalogManagement | null> => {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      try {
        const result = await doCreateCatalog(catalogData)
        setState(prev => ({ ...prev, isLoading: false }))
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create catalog'
        setState(prev => ({ ...prev, error: errorMessage, isLoading: false }))
        return null
      }
    },
    [doCreateCatalog]
  )

  const updateCatalog = useCallback(
    async (
      identifier: string,
      version: string,
      catalogData: Partial<CatalogManagement>
    ): Promise<CatalogManagement | null> => {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      try {
        const result = await doUpdateCatalog(identifier, version, catalogData)
        setState(prev => ({ ...prev, isLoading: false }))
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update catalog'
        setState(prev => ({ ...prev, error: errorMessage, isLoading: false }))
        return null
      }
    },
    [doUpdateCatalog]
  )

  const deleteCatalog = useCallback(
    async (identifier: string, version: string): Promise<boolean> => {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      try {
        await doDeleteCatalog(identifier, version)
        setState(prev => ({ ...prev, isLoading: false }))
        return true
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete catalog'
        setState(prev => ({ ...prev, error: errorMessage, isLoading: false }))
        return false
      }
    },
    [doDeleteCatalog]
  )

  const createCatalogEntry = useCallback(
    async (
      catalogIdentifier: string,
      version: string,
      entryData: Omit<CatalogEntryManagement, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'>
    ): Promise<CatalogEntryManagement | null> => {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      try {
        const result = await doCreateCatalogEntry(catalogIdentifier, version, entryData as any)
        setState(prev => ({ ...prev, isLoading: false }))
        return result as unknown as CatalogEntryManagement
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create catalog entry'
        setState(prev => ({ ...prev, error: errorMessage, isLoading: false }))
        return null
      }
    },
    [doCreateCatalogEntry]
  )

  const updateCatalogEntry = useCallback(
    async (
      catalogIdentifier: string,
      version: string,
      entryId: string,
      entryData: Partial<CatalogEntryManagement>
    ): Promise<CatalogEntryManagement | null> => {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      try {
        const result = await doUpdateCatalogEntry(catalogIdentifier, version, entryId, entryData as any)
        setState(prev => ({ ...prev, isLoading: false }))
        return result as unknown as CatalogEntryManagement
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update catalog entry'
        setState(prev => ({ ...prev, error: errorMessage, isLoading: false }))
        return null
      }
    },
    [doUpdateCatalogEntry]
  )

  const deleteCatalogEntry = useCallback(
    async (catalogIdentifier: string, version: string, entryId: string): Promise<boolean> => {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      try {
        await doDeleteCatalogEntry(catalogIdentifier, version, entryId)
        setState(prev => ({ ...prev, isLoading: false }))
        return true
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete catalog entry'
        setState(prev => ({ ...prev, error: errorMessage, isLoading: false }))
        return false
      }
    },
    [doDeleteCatalogEntry]
  )

  const importCatalogEntries = useCallback(
    async (params: ImportCatalogEntriesParams, file: File): Promise<CatalogEntryManagement[] | null> => {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      try {
        const result = await doImportCatalogEntries(params, file)
        setState(prev => ({ ...prev, isLoading: false }))
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to import catalog entries'
        setState(prev => ({ ...prev, error: errorMessage, isLoading: false }))
        return null
      }
    },
    [doImportCatalogEntries]
  )

  const exportCatalogs = useCallback(
    async (catalogIds?: string[]): Promise<Blob | null> => {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      try {
        const result = await doExportCatalogs(catalogIds)
        setState(prev => ({ ...prev, isLoading: false }))
        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to export catalogs'
        setState(prev => ({ ...prev, error: errorMessage, isLoading: false }))
        return null
      }
    },
    [doExportCatalogs]
  )

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    // State
    isLoading: state.isLoading,
    error: state.error,

    // Catalog operations
    createCatalog,
    updateCatalog,
    deleteCatalog,

    // Entry operations
    createCatalogEntry,
    updateCatalogEntry,
    deleteCatalogEntry,

    // Import/Export operations
    importCatalogEntries,
    exportCatalogs,

    // Utilities
    clearError
  }
}

export default useCatalogData
