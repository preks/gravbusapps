import { useState, useEffect } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { CatalogEntry } from '@/common/types/CatalogTypes'

interface UseCatalogLoaderProps {
  catalogIdentifier: string
  accessToken: string
  enabled?: boolean
}

export const useCatalogLoader = ({ catalogIdentifier, accessToken, enabled = true }: UseCatalogLoaderProps) => {
  const catalogClient = useCatalogManagerClient(accessToken)
  const [entries, setEntries] = useState<CatalogEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !accessToken) {
      setEntries([])
      return
    }

    const loadCatalog = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await catalogClient.getCatalogEntriesList(
          { catalogIdentifier, version: '1' },
          {
            limit: 100,
            includeChildCatalogEntries: true,
            returnTotalRecords: true
          }
        )

        setEntries(response.data || [])
      } catch (err) {
        console.error(`Error loading ${catalogIdentifier} catalog:`, err)
        setError(`Failed to load ${catalogIdentifier} entries`)
      } finally {
        setIsLoading(false)
      }
    }

    loadCatalog()
  }, [accessToken, catalogIdentifier, enabled, catalogClient])

  return { entries, isLoading, error }
}
