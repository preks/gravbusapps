import { useState, useEffect, useCallback, useMemo } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { getCatalogValue, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

const CATALOG_VERSION = 'v1'

export interface CatalogOption {
  id: string
  value: string
  label: string
}

type RawEntry = {
  id: string
  value?: string
  code?: string
  translations?: { value?: string; localeCode?: string }[]
}

function buildCatalogRef(catalogIdentifier: string, version: string, entryId: string): string {
  return `${catalogIdentifier}:${version}:${entryId}`
}

function useCatalogOptions(accessToken: string, catalogIdentifier: string, errorMessage: string) {
  const [entries, setEntries] = useState<RawEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const locale = getCurrentActiveUserLocale()

  const catalogClient = useCatalogManagerClient(accessToken)

  const fetchOptions = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier, version: CATALOG_VERSION },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true,
          includeTranslations: true,
          localeCode: getCurrentActiveUserLocale()
        }
      )

      setEntries(response.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : errorMessage)
      setEntries([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, catalogClient, catalogIdentifier, errorMessage])

  useEffect(() => {
    fetchOptions()
  }, [fetchOptions])

  const options = useMemo<CatalogOption[]>(
    () =>
      entries.map((entry: RawEntry) => {
        const refCode = entry.code ?? entry.id
        return {
          id: entry.id,
          value: buildCatalogRef(catalogIdentifier, CATALOG_VERSION, refCode),
          label: getCatalogValue(entry) || entry.value || entry.code || entry.id
        }
      }),
    [entries, locale, catalogIdentifier]
  )

  return { options, isLoading, error, refetch: fetchOptions }
}

export function useExitReasonCategoryCatalog(accessToken: string) {
  return useCatalogOptions(accessToken, 'ExitReasonCategory', 'Failed to load exit reason categories')
}

export function useExitReasonCatalog(accessToken: string) {
  return useCatalogOptions(accessToken, 'ExitReason', 'Failed to load exit reasons')
}
