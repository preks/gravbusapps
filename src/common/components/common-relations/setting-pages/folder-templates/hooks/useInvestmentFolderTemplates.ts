import { useState, useEffect, useCallback } from 'react'
import { useCatalogEntries } from '@/common/data/catalog/hooks/useCatalogEntries'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { type FolderNode, type InvestmentCatalogEntry, InvestmentCatalogType, CATALOG_VERSION } from '../types'

export const useInvestmentFolderTemplates = (accessToken: string, catalogType: InvestmentCatalogType) => {
  const [entries, setEntries] = useState<InvestmentCatalogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use GraphQL-based catalog entries hook for fetching (handles hierarchical catalogs properly)
  const { fetchCatalogEntries } = useCatalogEntries({ accessToken })

  // Use REST client for updates
  const catalogClient = useCatalogManagerClient(accessToken)

  const loadEntries = useCallback(async () => {
    if (!accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      // Use GraphQL fetch with includeChildCatalogEntries for hierarchical catalogs
      const { entries: catalogEntries } = await fetchCatalogEntries({
        catalogIdentifier: catalogType,
        version: CATALOG_VERSION,
        limit: 200,
        offset: 0,
        includeChildCatalogEntries: true
      })

      const mappedEntries: InvestmentCatalogEntry[] = catalogEntries.map(entry => ({
        id: entry.id,
        code: entry.code || '',
        value: entry.value || entry.code || 'Unknown',
        objectValue: entry.objectValue || {},
        parentEntryId: entry.parentEntryId
      }))

      setEntries(mappedEntries)
    } catch (err) {
      console.error(`Error loading ${catalogType} entries:`, err)
      setError(err instanceof Error ? err.message : 'Failed to load entries')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, catalogType, fetchCatalogEntries])

  const saveFolderTemplate = useCallback(
    async (entry: InvestmentCatalogEntry, newFolders: FolderNode[]) => {
      if (!accessToken) return false

      setIsSaving(true)
      setError(null)

      try {
        // Merge initFolders into existing objectValue
        const existingObjectValue = entry.objectValue ?? {}
        const updatedObjectValue = {
          ...existingObjectValue,
          initFolders: newFolders
        }

        // Update the catalog entry's objectValue using REST client
        await catalogClient.updateCatalogEntry(catalogType, CATALOG_VERSION, entry.id, {
          id: entry.id,
          code: entry.code,
          objectValue: updatedObjectValue
        } as any)

        // Update local state
        setEntries(prev => prev.map(e => (e.id === entry.id ? { ...e, objectValue: updatedObjectValue } : e)))

        return true
      } catch (err) {
        console.error('Error saving folder template:', err)
        setError(err instanceof Error ? err.message : 'Failed to save folder template')
        return false
      } finally {
        setIsSaving(false)
      }
    },
    [accessToken, catalogClient, catalogType]
  )

  useEffect(() => {
    if (accessToken) {
      loadEntries()
    }
  }, [accessToken, catalogType, loadEntries])

  return {
    entries,
    isLoading,
    isSaving,
    error,
    saveFolderTemplate,
    refetch: loadEntries
  }
}
