// c:\Projects\windsurf workspace\gravity-business-apps\src\business-apps\hr\hooks\useDocumentGroups.ts
'use client'

import { useState, useEffect } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { CatalogEntry, GetCatalogEntriesParams, GetCatalogsParams } from '@/common/types/CatalogTypes'
import { toast } from '@newwork/nw-design-system'

export type DocumentGroup = CatalogEntry

const useDocumentGroups = (accessToken: string) => {
  const client = useCatalogManagerClient(accessToken)
  const [documentGroups, setDocumentGroups] = useState<DocumentGroup[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const userLocale = 'en-US' // Or from context/props if dynamic

  useEffect(() => {
    if (!accessToken || !client) {
      setDocumentGroups([])
      setLoading(false)
      return
    }

    const fetchDocumentGroups = async () => {
      setLoading(true)
      setError(null)
      try {
        const pathParams: GetCatalogEntriesParams = {
          catalogIdentifier: 'DocumentGroup', // As requested
          version: 'v1'
        }
        const queryParams: GetCatalogsParams = {
          includeLocalizedVersions: true,
          localeCode: userLocale,
          limit: 200, // Assuming not an excessive number of document groups
          offset: 0
        }

        const response = await client.getCatalogEntriesList(pathParams, queryParams)
        if (response && response.data) {
          setDocumentGroups(response.data as DocumentGroup[])
        } else {
          setDocumentGroups([])
          throw new Error('No data received for document groups')
        }
      } catch (e: any) {
        console.error('[useDocumentGroups] Failed to fetch document groups:', e)
        setError(e)
        toast.error(e.message || 'Failed to fetch document groups.')
        setDocumentGroups([])
      } finally {
        setLoading(false)
      }
    }

    fetchDocumentGroups()
  }, [accessToken, client, userLocale])

  return {
    documentGroups,
    loading,
    error
  }
}

export default useDocumentGroups
