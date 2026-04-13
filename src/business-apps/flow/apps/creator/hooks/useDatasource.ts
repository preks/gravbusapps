import { useCallback, useState } from 'react'
import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'

export type SortDirection =
  | 'ASC'
  | 'DESC'
  | 'ASC_NULLS_FIRST'
  | 'ASC_NULLS_LAST'
  | 'DESC_NULLS_FIRST'
  | 'DESC_NULLS_LAST'

export interface SortInput {
  field: string
  direction: SortDirection
}

export type FilterOperator =
  | 'eq' // Equal
  | 'neq' // Not equal
  | 'gt' // Greater than
  | 'gte' // Greater than or equal
  | 'lt' // Less than
  | 'lte' // Less than or equal
  | 'in' // In array
  | 'nin' // Not in array
  | 'like' // Case-sensitive pattern match
  | 'ilike' // Case-insensitive pattern match
  | 'isNull' // Is null
  | 'isNotNull' // Is not null

export interface FilterInput {
  field: string
  operator: FilterOperator
  value?: any
}

export interface DataSourceOptions {
  search?: string
  limit?: number
  offset?: number
  filters?: FilterInput[]
  orderBy?: SortInput[]
}

export interface DataSourceResult {
  entities: any[]
  meta: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
    entity: string
    search: string | null
    orderBy?: SortInput[]
    filters?: FilterInput[]
    conformsToBaseEntity?: boolean
  }
}

export const useDatasource = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getApiUrl = useCallback(() => {
    return CUSTOM_FLOW_ENGINE_API_URL
  }, [])

  const list = useCallback(
    async (entityType: string, options: DataSourceOptions = {}): Promise<DataSourceResult | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const apiUrl = getApiUrl()
        const params = new URLSearchParams()

        // Build query parameters (entity type is now in path)
        if (options.search) params.set('search', options.search)
        if (options.limit !== undefined) params.set('limit', String(options.limit))
        if (options.offset !== undefined) params.set('offset', String(options.offset))
        if (options.filters && options.filters.length > 0) {
          params.set('filters', JSON.stringify(options.filters))
        }
        if (options.orderBy && options.orderBy.length > 0) {
          params.set('orderBy', JSON.stringify(options.orderBy))
        }

        // Entity type is now in the path
        const queryString = params.toString()
        const url = `${apiUrl}/datasource/${entityType}${queryString ? `?${queryString}` : ''}`

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
        }

        const data: DataSourceResult = await response.json()
        return data
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error('Unknown error')
        console.error('Datasource request failed:', errorObj)
        setError(errorObj.message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [getApiUrl]
  )

  return { isLoading, error, list }
}
