import { useState, useEffect, useCallback, useMemo } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { getCatalogValue, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

const DISPOSAL_OUTCOME_CATALOG = 'DisposalOutcome'
const CATALOG_VERSION = 'v1'

export interface DisposalOutcomeOption {
  id: string
  value: string
  label: string
}

function buildCatalogRef(version: string, entryId: string): string {
  return `${DISPOSAL_OUTCOME_CATALOG}:${version}:${entryId}`
}

type RawEntry = { id: string; value?: string; code?: string; translations?: { value?: string; localeCode?: string }[] }

export const useDisposalOutcomeCatalog = (accessToken: string) => {
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
        {
          catalogIdentifier: DISPOSAL_OUTCOME_CATALOG,
          version: CATALOG_VERSION
        },
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
      setError(err instanceof Error ? err.message : 'Failed to fetch disposal outcomes')
      setEntries([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, catalogClient])

  useEffect(() => {
    fetchOptions()
  }, [fetchOptions])

  const options = useMemo(
    () =>
      entries.map((entry: RawEntry) => {
        const refCode = entry.code ?? entry.id
        return {
          id: entry.id,
          value: buildCatalogRef(CATALOG_VERSION, refCode),
          label: getCatalogValue(entry) || entry.value || entry.code || entry.id
        }
      }),
    [entries, locale]
  )

  return { options, isLoading, error, refetch: fetchOptions }
}
