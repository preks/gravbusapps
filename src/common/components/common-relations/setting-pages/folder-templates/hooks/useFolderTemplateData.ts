import { useState, useEffect, useCallback } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import {
  type FolderNode,
  type InitFoldersConfig,
  ModuleType,
  EntityType,
  FOLDER_CATALOG_IDENTIFIERS,
  CATALOG_IDENTIFIER,
  CATALOG_VERSION
} from '../types'

export const useFolderTemplateData = (accessToken: string, moduleType: ModuleType, entityType: EntityType) => {
  const [folders, setFolders] = useState<FolderNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Store the catalog entry info for updates
  const [catalogEntryId, setCatalogEntryId] = useState<string | null>(null)
  const [catalogEntryCode, setCatalogEntryCode] = useState<string | null>(null)

  const catalogClient = useCatalogManagerClient(accessToken)
  const catalogCode = FOLDER_CATALOG_IDENTIFIERS[moduleType][entityType]

  const loadFolderTemplate = useCallback(async () => {
    if (!accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: CATALOG_IDENTIFIER, version: CATALOG_VERSION },
        {
          code: catalogCode,
          limit: 1,
          returnTotalRecords: true
        }
      )

      const entry = response.data?.[0]
      if (entry) {
        setCatalogEntryId(entry.id)
        setCatalogEntryCode(entry.code || null)
        const objectValue = entry.objectValue as InitFoldersConfig | null
        setFolders(objectValue?.initFolders || [])
      } else {
        // Entry doesn't exist - this shouldn't happen as entries are pre-created
        setCatalogEntryId(null)
        setCatalogEntryCode(null)
        setFolders([])
        setError(`Catalog entry not found for code: ${catalogCode}`)
      }
    } catch (err) {
      console.error('Error loading folder template:', err)
      setError(err instanceof Error ? err.message : 'Failed to load folder template')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, catalogClient, catalogCode])

  const saveFolderTemplate = useCallback(
    async (newFolders: FolderNode[]) => {
      if (!accessToken || !catalogEntryId || !catalogEntryCode) {
        setError('Cannot save: catalog entry not loaded')
        return false
      }

      setIsSaving(true)
      setError(null)

      try {
        const objectValue: InitFoldersConfig = { initFolders: newFolders }

        // Update the objectValue of the existing catalog entry
        await catalogClient.updateCatalogEntry(CATALOG_IDENTIFIER, CATALOG_VERSION, catalogEntryId, {
          id: catalogEntryId,
          code: catalogEntryCode,
          objectValue
        } as any)

        setFolders(newFolders)
        return true
      } catch (err) {
        console.error('Error saving folder template:', err)
        setError(err instanceof Error ? err.message : 'Failed to save folder template')
        return false
      } finally {
        setIsSaving(false)
      }
    },
    [accessToken, catalogClient, catalogEntryId, catalogEntryCode]
  )

  useEffect(() => {
    if (accessToken) {
      loadFolderTemplate()
    }
  }, [accessToken, moduleType, entityType, loadFolderTemplate])

  return {
    folders,
    setFolders,
    isLoading,
    isSaving,
    error,
    saveFolderTemplate,
    refetch: loadFolderTemplate
  }
}
