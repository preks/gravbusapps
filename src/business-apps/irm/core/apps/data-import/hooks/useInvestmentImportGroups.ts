/**
 * Fetches the `InvestmentGroup` catalog and produces descriptors for the
 * data-import index screen.
 *
 * Failure mode: returns `error` with an empty `investmentGroups` list — the
 * caller is expected to render an explicit error state. We deliberately do
 * NOT fall back to a synthetic group list, because the synthetic catalog
 * ids would propagate into the import payload via `ImportConfig.investmentGroupRef`
 * and the backend would silently reject every row.
 */

import { useCallback, useEffect, useState } from 'react'
import { useCatalogEntries } from '@/common/data/catalog/hooks/useCatalogEntries'
import { InvestmentImportGroupDescriptor } from '../types/commonInvestmentImportTypes'
import { toInvestmentImportGroupDescriptors } from '../config/investmentGroupImportUtils'

export interface UseInvestmentImportGroupsResult {
  investmentGroups: InvestmentImportGroupDescriptor[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useInvestmentImportGroups = (accessToken: string): UseInvestmentImportGroupsResult => {
  const { fetchCatalogEntriesByIdentifier } = useCatalogEntries({ accessToken })
  const [investmentGroups, setInvestmentGroups] = useState<InvestmentImportGroupDescriptor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Bumped by `refetch()` to re-trigger the effect without a page reload.
  const [reloadToken, setReloadToken] = useState(0)

  const refetch = useCallback(() => setReloadToken(token => token + 1), [])

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false)
      setError('Missing access token')
      return
    }

    let cancelled = false

    const loadGroups = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const result = await fetchCatalogEntriesByIdentifier('InvestmentGroup')
        if (cancelled) return
        const normalizedGroups = toInvestmentImportGroupDescriptors(result.entries)
        setInvestmentGroups(normalizedGroups)
      } catch (fetchError) {
        if (cancelled) return
        console.error('Failed to load InvestmentGroup catalog:', fetchError)
        setInvestmentGroups([])
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load investment groups')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadGroups()

    return () => {
      cancelled = true
    }
  }, [accessToken, fetchCatalogEntriesByIdentifier, reloadToken])

  return { investmentGroups, isLoading, error, refetch }
}
