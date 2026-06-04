import { useState, useCallback, useEffect } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { SelectOption } from '../types'

const ITEMS_PER_PAGE = 20

const GET_LEGAL_ENTITIES = `
  query GetLegalEntities($structureId: uuid!, $search: String, $limit: Int!, $offset: Int!) {
    Company(
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
    CompanyAggregate(
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

interface CompanyItem {
  id: string
  name: string
  code: string
}

interface LegalEntitiesResponse {
  Company: CompanyItem[]
  CompanyAggregate: { aggregate: { count: number } }
}

export interface UseLegalEntitiesProps {
  accessToken: string
  structureId: string
  search?: string
}

export const useLegalEntities = ({ accessToken, structureId, search }: UseLegalEntitiesProps) => {
  const client = useGraphqlClient(accessToken)
  const [legalEntities, setLegalEntities] = useState<SelectOption[]>([])
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
      const data = await client.request<LegalEntitiesResponse>(GET_LEGAL_ENTITIES, {
        structureId,
        search: searchPattern,
        limit: ITEMS_PER_PAGE,
        offset
      })

      const items = data.Company || []
      const newOptions: SelectOption[] = items.map(item => ({
        id: item.id,
        name: item.name,
        label: item.name,
        value: item.id
      }))

      const totalCount = data.CompanyAggregate.aggregate.count
      setLegalEntities(prev => (offset === 0 ? newOptions : [...prev, ...newOptions]))
      setOffset(prev => prev + ITEMS_PER_PAGE)
      setHasMore(items.length === ITEMS_PER_PAGE && offset + ITEMS_PER_PAGE < totalCount)

      if (!initialLoadDone) setInitialLoadDone(true)
    } catch (err: any) {
      console.error('Error loading legal entities:', err)
      setError(err.message || 'Failed to load legal entities')
      setHasMore(false)
      setInitialLoadDone(true)
    } finally {
      setLoading(false)
    }
  }, [client, loading, hasMore, offset, currentSearch, accessToken, structureId, initialLoadDone])

  const searchLegalEntities = useCallback((searchTerm?: string) => {
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
    legalEntities,
    loading,
    error,
    hasMore,
    loadMore,
    searchLegalEntities
  }
}
