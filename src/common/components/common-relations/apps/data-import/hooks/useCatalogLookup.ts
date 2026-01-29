/**
 * Catalog Lookup Hook
 * Provides catalog entry lookup with caching and data loading
 * Extracted from LeadImportExample lines 95-328
 */

import { useState, useEffect, useCallback } from 'react'
import { useCatalogEntries } from '@/common/data/catalog/hooks/useCatalogEntries'
import { CatalogData } from '@/common/components/common-relations/apps/data-import/types'
import { lookupCatalogEntry as lookupUtil } from '@/common/components/common-relations/apps/data-import/utils'

export interface UseCatalogLookupProps {
  accessToken: string
  catalogIdentifiers: string[]
}

export interface UseCatalogLookupReturn {
  catalogData: CatalogData
  isLoadingCatalogs: boolean
  catalogError: string | null
  lookupCatalogEntry: (catalogIdentifier: string, searchValue: string) => string | null
  reloadCatalogs: () => Promise<void>
}

export function useCatalogLookup(props: UseCatalogLookupProps): UseCatalogLookupReturn {
  const { accessToken, catalogIdentifiers } = props
  const [catalogData, setCatalogData] = useState<CatalogData>({})
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(false)
  const [catalogError, setCatalogError] = useState<string | null>(null)

  const { fetchCatalogEntriesByIdentifier } = useCatalogEntries({ accessToken })

  // Catalog loading function (used for both initial load and manual reload)
  const loadCatalogs = useCallback(async () => {
    if (catalogIdentifiers.length === 0) {
      return
    }

    setIsLoadingCatalogs(true)
    setCatalogError(null)

    try {
      const results = await Promise.all(
        catalogIdentifiers.map(identifier => fetchCatalogEntriesByIdentifier(identifier, { limit: 300 }))
      )

      const newCatalogData: CatalogData = {}
      catalogIdentifiers.forEach((identifier, index) => {
        newCatalogData[identifier] = results[index].entries
      })

      setCatalogData(newCatalogData)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load catalogs'
      setCatalogError(errorMessage)
      console.error('Failed to load catalogs:', error)
    } finally {
      setIsLoadingCatalogs(false)
    }
  }, [catalogIdentifiers, fetchCatalogEntriesByIdentifier])

  // Load catalogs on mount and when loadCatalogs changes
  useEffect(() => {
    loadCatalogs()
  }, [loadCatalogs])

  const lookupCatalogEntry = useCallback(
    (catalogIdentifier: string, searchValue: string): string | null => {
      const entries = catalogData[catalogIdentifier]
      if (!entries) {
        console.warn(`Catalog not loaded: ${catalogIdentifier}`)
        return null
      }

      return lookupUtil(entries, searchValue)
    },
    [catalogData]
  )

  return {
    catalogData,
    isLoadingCatalogs,
    catalogError,
    lookupCatalogEntry,
    reloadCatalogs: loadCatalogs
  }
}
