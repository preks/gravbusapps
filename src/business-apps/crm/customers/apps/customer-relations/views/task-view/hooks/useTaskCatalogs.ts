import { useState, useCallback, useEffect } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

export interface CatalogOption {
  id: string
  value: string
  code?: string
}

export interface UseTaskCatalogsProps {
  accessToken: string
  sourceApp?: string
}

export interface UseTaskCatalogsReturn {
  statuses: CatalogOption[]
  priorities: CatalogOption[]
  types: CatalogOption[]
  loading: {
    statuses: boolean
    priorities: boolean
    types: boolean
  }
  error: {
    statuses: Error | null
    priorities: Error | null
    types: Error | null
  }
  refetch: () => void
}

export const useTaskCatalogs = ({ accessToken, sourceApp = 'CRM' }: UseTaskCatalogsProps): UseTaskCatalogsReturn => {
  const [statuses, setStatuses] = useState<CatalogOption[]>([])
  const [priorities, setPriorities] = useState<CatalogOption[]>([])
  const [types, setTypes] = useState<CatalogOption[]>([])

  const [loading, setLoading] = useState({
    statuses: false,
    priorities: false,
    types: false
  })

  const [error, setError] = useState({
    statuses: null as Error | null,
    priorities: null as Error | null,
    types: null as Error | null
  })

  const catalogClient = useCatalogManagerClient(accessToken)

  // Determine catalog names based on source app
  const getCatalogNames = () => {
    const prefix = sourceApp === 'CRM' ? 'SalesTask' : 'InvestmentTask'
    return {
      status: `${prefix}Status`,
      priority: `${prefix}Priority`,
      type: `${prefix}Type`
    }
  }

  const fetchStatuses = useCallback(async () => {
    if (!accessToken) return

    setLoading(prev => ({ ...prev, statuses: true }))
    setError(prev => ({ ...prev, statuses: null }))

    try {
      const catalogNames = getCatalogNames()
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: catalogNames.status,
          version: 'v1'
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      )

      const statusData =
        response.data?.map((entry: any) => ({
          id: entry.id,
          value: entry.value || entry.label || 'Unknown',
          code: entry.code
        })) || []

      setStatuses(statusData)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch task statuses')
      setError(prev => ({ ...prev, statuses: error }))
      console.error('Error fetching task statuses:', error)
    } finally {
      setLoading(prev => ({ ...prev, statuses: false }))
    }
  }, [accessToken, sourceApp, catalogClient])

  const fetchPriorities = useCallback(async () => {
    if (!accessToken) return

    setLoading(prev => ({ ...prev, priorities: true }))
    setError(prev => ({ ...prev, priorities: null }))

    try {
      const catalogNames = getCatalogNames()
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: catalogNames.priority,
          version: 'v1'
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      )

      const priorityData =
        response.data?.map((entry: any) => ({
          id: entry.id,
          value: entry.value || entry.label || 'Unknown',
          code: entry.code
        })) || []

      setPriorities(priorityData)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch task priorities')
      setError(prev => ({ ...prev, priorities: error }))
      console.error('Error fetching task priorities:', error)
    } finally {
      setLoading(prev => ({ ...prev, priorities: false }))
    }
  }, [accessToken, sourceApp, catalogClient])

  const fetchTypes = useCallback(async () => {
    if (!accessToken) return

    setLoading(prev => ({ ...prev, types: true }))
    setError(prev => ({ ...prev, types: null }))

    try {
      const catalogNames = getCatalogNames()
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: catalogNames.type,
          version: 'v1'
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      )

      const typeData =
        response.data?.map((entry: any) => ({
          id: entry.id,
          value: entry.value || entry.label || 'Unknown',
          code: entry.code
        })) || []

      setTypes(typeData)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch task types')
      setError(prev => ({ ...prev, types: error }))
      console.error('Error fetching task types:', error)
    } finally {
      setLoading(prev => ({ ...prev, types: false }))
    }
  }, [accessToken, sourceApp, catalogClient])

  const refetch = useCallback(() => {
    fetchStatuses()
    fetchPriorities()
    fetchTypes()
  }, [fetchStatuses, fetchPriorities, fetchTypes])

  useEffect(() => {
    if (accessToken) {
      refetch()
    }
  }, [accessToken, sourceApp])

  return {
    statuses,
    priorities,
    types,
    loading,
    error,
    refetch
  }
}
