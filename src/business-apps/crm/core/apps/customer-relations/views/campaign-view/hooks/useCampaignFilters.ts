import { useEffect, useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

interface FilterOption {
  id: string
  label: string
}

interface UseCampaignFiltersReturn {
  types: FilterOption[]
  isLoading: boolean
}

export const useCampaignFilters = (context: BusinessAppContextProps): UseCampaignFiltersReturn => {
  const [isLoading, setIsLoading] = useState(true)
  const catalogClient = useCatalogManagerClient(context.accessToken)

  const [types, setTypes] = useState<FilterOption[]>([])

  // Load campaign types from catalog
  const loadTypes = useCallback(async () => {
    try {
      const resp = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: 'SalesCampaignType', version: 'v1' },
        { limit: 100, offset: 0, returnTotalRecords: false, includeChildCatalogEntries: false }
      )
      const items = (resp?.data || []).map((e: any) => ({ id: e.id, label: e.value || e.code }))
      setTypes(items)
    } catch {
      setTypes([])
    }
  }, [catalogClient])

  useEffect(() => {
    if (context.accessToken) {
      loadTypes().then(() => {
        setIsLoading(false)
      })
    }
  }, [context.accessToken, loadTypes])

  return {
    types,
    isLoading
  }
}
