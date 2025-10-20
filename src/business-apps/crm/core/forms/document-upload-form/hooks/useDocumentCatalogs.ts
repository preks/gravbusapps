import { useState, useCallback, useEffect } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

export interface CatalogOption {
  id: string
  value: string
  label: string
  name: string
  code?: string
  parentId?: string
}

export interface UseDocumentCatalogsReturn {
  documentGroups: CatalogOption[]
  documentTypes: CatalogOption[]
  filteredDocumentTypes: CatalogOption[]
  loading: {
    groups: boolean
    types: boolean
  }
  error: {
    groups: string | null
    types: string | null
  }
  refetch: () => void
}

export const useDocumentCatalogs = (
  accessToken: string,
  selectedGroupId?: string,
  options?: {
    groupCatalogIdentifier?: string
    typeCatalogIdentifier?: string
  }
): UseDocumentCatalogsReturn => {
  const [documentGroups, setDocumentGroups] = useState<CatalogOption[]>([])
  const [documentTypes, setDocumentTypes] = useState<CatalogOption[]>([])
  const [loading, setLoading] = useState({
    groups: false,
    types: false
  })
  const [error, setError] = useState({
    groups: null as string | null,
    types: null as string | null
  })

  const catalogClient = useCatalogManagerClient(accessToken)

  const fetchDocumentGroups = useCallback(async () => {
    if (!accessToken) return

    setLoading(prev => ({ ...prev, groups: true }))
    setError(prev => ({ ...prev, groups: null }))

    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: options?.groupCatalogIdentifier || 'DocumentGroup',
          version: 'v1'
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      )

      const groupData =
        response.data?.map((entry: any) => ({
          id: entry.id,
          value: entry.value || entry.label || 'Unknown',
          label: entry.value || entry.label || 'Unknown',
          name: entry.value || entry.label || 'Unknown',
          code: entry.code
        })) || []

      setDocumentGroups(groupData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch document groups'
      setError(prev => ({ ...prev, groups: errorMessage }))
      console.error('Error fetching document groups:', err)
    } finally {
      setLoading(prev => ({ ...prev, groups: false }))
    }
  }, [accessToken, catalogClient])

  const fetchDocumentTypes = useCallback(async () => {
    if (!accessToken) return

    setLoading(prev => ({ ...prev, types: true }))
    setError(prev => ({ ...prev, types: null }))

    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: options?.typeCatalogIdentifier || 'DocumentType',
          version: 'v1'
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      )

      const typeData =
        response.data?.map((entry: any) => ({
          id: entry.id,
          value: entry.value || entry.label || 'Unknown',
          label: entry.value || entry.label || 'Unknown',
          name: entry.value || entry.label || 'Unknown',
          code: entry.code,
          parentId: entry.parentEntryId || null // Use the correct field name
        })) || []

      setDocumentTypes(typeData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch document types'
      setError(prev => ({ ...prev, types: errorMessage }))
      console.error('Error fetching document types:', err)
    } finally {
      setLoading(prev => ({ ...prev, types: false }))
    }
  }, [accessToken, catalogClient])

  // Filter document types based on selected group
  const filteredDocumentTypes = documentTypes.filter(type => {
    if (!selectedGroupId) return false

    // Strict exact match - Selected: "DocumentGroup:v1:PERSONAL" should match parent: "DocumentGroup:v1:PERSONAL"
    return type.parentId === selectedGroupId
  })

  const refetch = useCallback(() => {
    fetchDocumentGroups()
    fetchDocumentTypes()
  }, [fetchDocumentGroups, fetchDocumentTypes])

  useEffect(() => {
    if (accessToken) {
      refetch()
    }
  }, [accessToken, refetch])

  return {
    documentGroups,
    documentTypes,
    filteredDocumentTypes,
    loading,
    error,
    refetch
  }
}
