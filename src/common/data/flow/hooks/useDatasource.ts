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
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'nin'
  | 'like'
  | 'ilike'
  | 'isNull'
  | 'isNotNull'

export interface FilterInput {
  field: string
  operator: FilterOperator
  value?: any
}

export interface DataSourceOptions {
  kind?: 'CUSTOM_ENTITY' | 'INTERNAL_ENTITY'
  namespace?: string
  labelField?: string
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

export const useDatasource = (accessToken?: string) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getApiUrl = useCallback(() => CUSTOM_FLOW_ENGINE_API_URL, [])

  const list = useCallback(
    async (entityType: string, options: DataSourceOptions = {}): Promise<DataSourceResult | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const apiUrl = getApiUrl()
        const params = new URLSearchParams()

        if (options.search) params.set('search', options.search)
        if (options.limit !== undefined) params.set('limit', String(options.limit))
        if (options.offset !== undefined) params.set('offset', String(options.offset))
        if (options.kind) params.set('kind', options.kind)
        if (options.namespace) params.set('namespace', options.namespace)
        if (options.labelField) params.set('labelField', options.labelField)
        if (options.filters && options.filters.length > 0) {
          params.set('filters', JSON.stringify(options.filters))
        }
        if (options.orderBy && options.orderBy.length > 0) {
          params.set('orderBy', JSON.stringify(options.orderBy))
        }

        const queryString = params.toString()
        const url = `${apiUrl}/datasource/${encodeURIComponent(entityType)}${queryString ? `?${queryString}` : ''}`
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
          }
        })

        if (!response.ok) {
          const errorResponse = await response.json().catch(() => ({}))
          throw new Error(errorResponse.message || `HTTP ${response.status}: ${response.statusText}`)
        }

        return (await response.json()) as DataSourceResult
      } catch (error) {
        const errorObject = error instanceof Error ? error : new Error('Unknown error')
        console.error('Datasource request failed:', errorObject)
        setError(errorObject.message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken, getApiUrl]
  )

  return { isLoading, error, list }
}
