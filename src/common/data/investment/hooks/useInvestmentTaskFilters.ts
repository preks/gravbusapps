// Investment Task Filters hook
import { useEffect, useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

interface FilterOption {
  id: string
  label: string
}

export interface UseInvestmentTaskFiltersReturn {
  types: FilterOption[]
  statuses: FilterOption[]
  priorities: FilterOption[]
  isLoading: boolean
}

export const useInvestmentTaskFilters = (context: BusinessAppContextProps): UseInvestmentTaskFiltersReturn => {
  const [isLoading, setIsLoading] = useState(true)
  const catalogClient = useCatalogManagerClient(context.accessToken)

  const [types, setTypes] = useState<FilterOption[]>([])
  const [statuses, setStatuses] = useState<FilterOption[]>([])
  const [priorities, setPriorities] = useState<FilterOption[]>([])

  const loadFilters = useCallback(async () => {
    if (!context.accessToken) return

    setIsLoading(true)

    try {
      const [typesResp, statusesResp, prioritiesResp] = await Promise.all([
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'InvestmentTaskType', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: false, includeChildCatalogEntries: false }
        ),
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'InvestmentTaskStatus', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: false, includeChildCatalogEntries: false }
        ),
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'InvestmentTaskPriority', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: false, includeChildCatalogEntries: false }
        )
      ])

      setTypes((typesResp?.data || []).map((e: any) => ({ id: e.id, label: e.value || e.code })))
      setStatuses((statusesResp?.data || []).map((e: any) => ({ id: e.id, label: e.value || e.code })))
      setPriorities((prioritiesResp?.data || []).map((e: any) => ({ id: e.id, label: e.value || e.code })))
    } catch (error) {
      console.error('Error loading task filters:', error)
      setTypes([])
      setStatuses([])
      setPriorities([])
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, catalogClient])

  useEffect(() => {
    loadFilters()
  }, [loadFilters])

  return {
    types,
    statuses,
    priorities,
    isLoading
  }
}
