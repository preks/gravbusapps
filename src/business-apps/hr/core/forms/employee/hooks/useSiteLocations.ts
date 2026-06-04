import { useState, useCallback, useEffect } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { SelectOption } from '../types'

const ITEMS_PER_PAGE = 20

const GET_SITE_LOCATIONS = `
  query GetSiteLocations($structureId: uuid!, $search: String, $limit: Int!, $offset: Int!) {
    SiteLocation(
      where: {
        structureId: { _eq: $structureId }
        isDeleted: { _neq: true }
        name: { _ilike: $search }
      }
      orderBy: [{ name: ASC }]
      limit: $limit
      offset: $offset
    ) {
      id
      name
      code
      locality
    }
    SiteLocationAggregate(
      where: {
        structureId: { _eq: $structureId }
        isDeleted: { _neq: true }
        name: { _ilike: $search }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

interface SiteLocationItem {
  id: string
  name: string
  code: string
  locality?: string
}

interface SiteLocationsResponse {
  SiteLocation: SiteLocationItem[]
  SiteLocationAggregate: { aggregate: { count: number } }
}

export interface UseSiteLocationsProps {
  accessToken: string
  structureId: string
  search?: string
  enabled?: boolean
}

export const useSiteLocations = ({ accessToken, structureId, search, enabled = true }: UseSiteLocationsProps) => {
  const client = useGraphqlClient(accessToken)
  const [siteLocations, setSiteLocations] = useState<SelectOption[]>([])
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

  // Reset when enabled changes (e.g. legal entity selected/cleared)
  useEffect(() => {
    if (!enabled) {
      setSiteLocations([])
      setOffset(0)
      setHasMore(true)
      setError(null)
      setInitialLoadDone(false)
    }
  }, [enabled])

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !accessToken || !client || !structureId || !enabled) return

    setLoading(true)
    setError(null)

    try {
      const searchPattern = currentSearch ? `%${currentSearch}%` : '%'
      const data = await client.request<SiteLocationsResponse>(GET_SITE_LOCATIONS, {
        structureId,
        search: searchPattern,
        limit: ITEMS_PER_PAGE,
        offset
      })

      const items = data.SiteLocation || []
      const newOptions: SelectOption[] = items.map(item => ({
        id: item.id,
        name: item.locality ? `${item.name} (${item.locality})` : item.name,
        label: item.locality ? `${item.name} (${item.locality})` : item.name,
        value: item.id
      }))

      const totalCount = data.SiteLocationAggregate.aggregate.count
      setSiteLocations(prev => (offset === 0 ? newOptions : [...prev, ...newOptions]))
      setOffset(prev => prev + ITEMS_PER_PAGE)
      setHasMore(items.length === ITEMS_PER_PAGE && offset + ITEMS_PER_PAGE < totalCount)

      if (!initialLoadDone) setInitialLoadDone(true)
    } catch (err: any) {
      console.error('Error loading site locations:', err)
      setError(err.message || 'Failed to load site locations')
      setHasMore(false)
      setInitialLoadDone(true)
    } finally {
      setLoading(false)
    }
  }, [client, loading, hasMore, offset, currentSearch, accessToken, structureId, enabled, initialLoadDone])

  const searchSiteLocations = useCallback((searchTerm?: string) => {
    setCurrentSearch(searchTerm)
    setOffset(0)
    setHasMore(true)
    setError(null)
    setInitialLoadDone(false)
  }, [])

  useEffect(() => {
    if (accessToken && client && structureId && enabled && !initialLoadDone && !loading) {
      loadMore()
    }
  }, [accessToken, client, structureId, enabled, initialLoadDone, loading, loadMore])

  return {
    siteLocations,
    loading,
    error,
    hasMore,
    loadMore,
    searchSiteLocations
  }
}
