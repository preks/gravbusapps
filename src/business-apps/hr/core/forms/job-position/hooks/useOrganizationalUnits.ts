import { useState, useCallback, useEffect } from 'react'
import {
  fetchOrganizationalUnitData,
  OrganizationalUnitItem,
  QueryVariablesOrganizationalUnit
} from '../queries/OrganizationalUnitQueries'
import { SelectOption } from '../types'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

const UNITS_PER_PAGE = 20

export interface UseOrganizationalUnitsProps {
  accessToken: string
  structureId: string
  search?: string
}

export interface UseOrganizationalUnitsReturn {
  organizationalUnits: SelectOption[]
  loading: boolean
  error: string | null
  hasMore: boolean
  total: number
  loadMore: () => void
  searchUnits: (searchTerm?: string) => void
  retry: () => void
}

/**
 * Custom hook for fetching organizational units with infinite scroll and search functionality
 */
export const useOrganizationalUnits = ({
  accessToken,
  structureId,
  search
}: UseOrganizationalUnitsProps): UseOrganizationalUnitsReturn => {
  const client = useGraphqlClient(accessToken)
  const [organizationalUnits, setOrganizationalUnits] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [currentSearch, setCurrentSearch] = useState<string | undefined>(search)

  // Convert OrganizationalUnitItem to SelectOption
  const convertToSelectOption = (unit: OrganizationalUnitItem): SelectOption => ({
    id: unit.id,
    name: unit.name,
    label: unit.name,
    value: unit.id
  })

  // Reset data when search changes
  useEffect(() => {
    if (currentSearch !== search) {
      setCurrentSearch(search)
      setOrganizationalUnits([])
      setOffset(0)
      setHasMore(true)
      setTotal(0)
      setError(null)
    }
  }, [search, currentSearch])

  // Load more organizational units
  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !accessToken || !client || !structureId) return

    setLoading(true)
    setError(null)

    try {
      const variables: QueryVariablesOrganizationalUnit = {
        structureId,
        offset,
        limit: UNITS_PER_PAGE,
        search: currentSearch
      }

      const data = await fetchOrganizationalUnitData(client, variables)

      const newUnits = data.OrganizationalUnit || []
      const newSelectOptions = newUnits.map(convertToSelectOption)

      // Append new data for infinite scroll
      setOrganizationalUnits(prev => (offset === 0 ? newSelectOptions : [...prev, ...newSelectOptions]))

      setTotal(data.OrganizationalUnitAggregate.aggregate.count)
      setOffset(prev => prev + UNITS_PER_PAGE)
      setHasMore(
        newUnits.length === UNITS_PER_PAGE && offset + UNITS_PER_PAGE < data.OrganizationalUnitAggregate.aggregate.count
      )
    } catch (err: any) {
      console.error('Error loading organizational units:', err)
      setError(err.message || 'Failed to load organizational units')
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [client, loading, hasMore, offset, currentSearch, accessToken, structureId])

  // Initial load function - separate from loadMore to avoid circular dependency
  const initialLoad = useCallback(async () => {
    if (loading || !accessToken || !client || !structureId) return

    setLoading(true)
    setError(null)
    setOrganizationalUnits([])
    setOffset(0)
    setHasMore(true)
    setTotal(0)

    try {
      const variables: QueryVariablesOrganizationalUnit = {
        structureId,
        offset: 0,
        limit: UNITS_PER_PAGE,
        search: currentSearch
      }

      const data = await fetchOrganizationalUnitData(client, variables)

      const newUnits = data.OrganizationalUnit || []
      const newSelectOptions = newUnits.map(convertToSelectOption)

      setOrganizationalUnits(newSelectOptions)
      setTotal(data.OrganizationalUnitAggregate.aggregate.count)
      setOffset(UNITS_PER_PAGE)
      setHasMore(
        newUnits.length === UNITS_PER_PAGE && UNITS_PER_PAGE < data.OrganizationalUnitAggregate.aggregate.count
      )
    } catch (err: any) {
      console.error('Error loading organizational units:', err)
      setError(err.message || 'Failed to load organizational units')
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [client, loading, currentSearch, accessToken, structureId])

  // Search organizational units
  const searchUnits = useCallback((searchTerm?: string) => {
    setCurrentSearch(searchTerm)
    setOrganizationalUnits([])
    setOffset(0)
    setHasMore(true)
    setTotal(0)
    setError(null)
  }, [])

  // Retry loading
  const retry = useCallback(() => {
    setError(null)
    setHasMore(true)
    initialLoad()
  }, [initialLoad])

  // Initial load - simplified to avoid circular dependencies
  useEffect(() => {
    if (accessToken && client && structureId && organizationalUnits.length === 0 && !loading) {
      initialLoad()
    }
  }, [accessToken, client, structureId, organizationalUnits.length, loading, initialLoad])

  return {
    organizationalUnits,
    loading,
    error,
    hasMore,
    total,
    loadMore,
    searchUnits,
    retry
  }
}
