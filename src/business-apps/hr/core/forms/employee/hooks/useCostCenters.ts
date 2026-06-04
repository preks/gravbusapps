import { useState, useCallback, useEffect } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { SelectOption } from '../types'

const ITEMS_PER_PAGE = 20

const GET_COST_CENTERS = `
  query GetCostCenters($structureId: uuid!, $search: String, $limit: Int!, $offset: Int!) {
    CostCenter(
      where: {
        structureId: { _eq: $structureId }
        isDeleted: { _eq: false }
        name: { _ilike: $search }
      }
      orderBy: [{ name: ASC }]
      limit: $limit
      offset: $offset
    ) {
      id
      name
      code
    }
    CostCenterAggregate(
      where: {
        structureId: { _eq: $structureId }
        isDeleted: { _eq: false }
        name: { _ilike: $search }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

interface CostCenterItem {
  id: string
  name: string
  code: string
}

interface CostCentersResponse {
  CostCenter: CostCenterItem[]
  CostCenterAggregate: { aggregate: { count: number } }
}

export interface UseCostCentersProps {
  accessToken: string
  structureId: string
  search?: string
}

export const useCostCenters = ({ accessToken, structureId, search }: UseCostCentersProps) => {
  const client = useGraphqlClient(accessToken)
  const [costCenters, setCostCenters] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [currentSearch, setCurrentSearch] = useState<string | undefined>(search)
  const [initialLoadDone, setInitialLoadDone] = useState(false)

  useEffect(() => {
    if (currentSearch !== search) {
      setCurrentSearch(search)
      setOffset(0)
      setHasMore(true)
      setError(null)
      setInitialLoadDone(false)
    }
  }, [search, currentSearch])

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !accessToken || !client || !structureId) return

    setLoading(true)
    setError(null)

    try {
      const searchPattern = currentSearch ? `%${currentSearch}%` : '%'
      const data = await client.request<CostCentersResponse>(GET_COST_CENTERS, {
        structureId,
        search: searchPattern,
        limit: ITEMS_PER_PAGE,
        offset
      })

      const items = data.CostCenter || []
      const newOptions: SelectOption[] = items.map(item => ({
        id: item.id,
        name: item.code ? `${item.name} (${item.code})` : item.name,
        label: item.code ? `${item.name} (${item.code})` : item.name,
        value: item.id
      }))

      const totalCount = data.CostCenterAggregate.aggregate.count
      setCostCenters(prev => (offset === 0 ? newOptions : [...prev, ...newOptions]))
      setOffset(prev => prev + ITEMS_PER_PAGE)
      setHasMore(items.length === ITEMS_PER_PAGE && offset + ITEMS_PER_PAGE < totalCount)

      if (!initialLoadDone) setInitialLoadDone(true)
    } catch (err: any) {
      console.error('Error loading cost centers:', err)
      setError(err.message || 'Failed to load cost centers')
      setHasMore(false)
      setInitialLoadDone(true)
    } finally {
      setLoading(false)
    }
  }, [client, loading, hasMore, offset, currentSearch, accessToken, structureId, initialLoadDone])

  const searchCostCenters = useCallback((searchTerm?: string) => {
    setCurrentSearch(searchTerm)
    setOffset(0)
    setHasMore(true)
    setError(null)
    setInitialLoadDone(false)
  }, [])

  useEffect(() => {
    if (accessToken && client && structureId && !initialLoadDone && !loading) {
      loadMore()
    }
  }, [accessToken, client, structureId, initialLoadDone, loading, loadMore])

  return {
    costCenters,
    loading,
    error,
    hasMore,
    loadMore,
    searchCostCenters
  }
}
