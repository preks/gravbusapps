import { useState, useEffect, useCallback } from 'react'
import { CatalogEntryWithConfig } from '../types'
import { InvestmentCatalogData } from '@/common/data/investment/hooks/useInvestmentCatalogs'
import { mapCatalogEntryToTyped } from '../../../hooks'

interface UseCatalogDataLoaderProps {
  accessToken: string
  fetchInvestmentCatalogData: () => Promise<InvestmentCatalogData>
  onDataLoaded: (data: InvestmentCatalogData) => void
  onGroupSelected: (group: CatalogEntryWithConfig) => void
  onEntrySelected: (entry: CatalogEntryWithConfig) => void
}

export const useCatalogDataLoader = ({
  accessToken,
  fetchInvestmentCatalogData,
  onDataLoaded,
  onGroupSelected,
  onEntrySelected
}: UseCatalogDataLoaderProps) => {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await fetchInvestmentCatalogData()
      onDataLoaded(data)

      // Auto-select first group if available
      if (data.investmentGroups && data.investmentGroups.length > 0) {
        const firstGroup = data.investmentGroups[0]
        const groupEntry = mapCatalogEntryToTyped(firstGroup)
        onGroupSelected(groupEntry)
        onEntrySelected(groupEntry)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load catalog data'
      setError(errorMessage)
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, fetchInvestmentCatalogData, onDataLoaded, onGroupSelected, onEntrySelected])

  useEffect(() => {
    if (accessToken) {
      refetch()
    }
  }, [accessToken, refetch])

  return { isLoading, error, refetch }
}
