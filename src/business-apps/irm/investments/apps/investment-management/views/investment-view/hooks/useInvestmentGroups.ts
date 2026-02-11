import { useState, useEffect, useMemo } from 'react'
import { useCatalogEntries } from '@/common/data/catalog/hooks/useCatalogEntries'

export interface InvestmentGroup {
  id: string
  code: string
  value: string
  label: string
  tabId: string
}

/**
 * Hook to fetch all investment groups from catalog and format them for UI
 * Returns investment groups dynamically discovered from the catalog
 */
export const useInvestmentGroups = (accessToken: string) => {
  const { fetchCatalogEntriesByIdentifier } = useCatalogEntries({ accessToken })
  const [entries, setEntries] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadGroups = async () => {
      if (!accessToken) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        const result = await fetchCatalogEntriesByIdentifier('InvestmentGroup')
        setEntries(result.entries || [])
      } catch (err) {
        console.error('[useInvestmentGroups] Error fetching investment groups:', err)
        setError(err instanceof Error ? err.message : 'Failed to load investment groups')
      } finally {
        setIsLoading(false)
      }
    }

    loadGroups()
  }, [accessToken, fetchCatalogEntriesByIdentifier])

  const investmentGroups = useMemo<InvestmentGroup[]>(() => {
    if (!entries || entries.length === 0) return []

    return entries.map(entry => ({
      id: entry.id,
      code: entry.code,
      value: entry.value,
      label: entry.value,
      tabId: entry.code.toLowerCase().replace(/_/g, '-')
    }))
  }, [entries])

  return {
    investmentGroups,
    isLoading,
    error
  }
}
