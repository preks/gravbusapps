import { useState, useCallback, useEffect } from 'react'
import {
  fetchOrganizationalUnitData,
  OrganizationalUnitItem,
  QueryVariablesOrganizationalUnit
} from '../../job-position/queries/OrganizationalUnitQueries'
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
  const [initialLoadDone, setInitialLoadDone] = useState(false)

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
      setOffset(0)
      setHasMore(true)
      setTotal(0)
      setError(null)
      setInitialLoadDone(false)
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
      const totalCount = data.OrganizationalUnitAggregate.aggregate.count

      // Append new data for infinite scroll
      setOrganizationalUnits(prev => (offset === 0 ? newSelectOptions : [...prev, ...newSelectOptions]))

      setTotal(totalCount)
      setOffset(prev => prev + UNITS_PER_PAGE)

      // Set hasMore to false if we got fewer items than requested OR if we've loaded all items
      const hasMoreItems = newUnits.length === UNITS_PER_PAGE && offset + UNITS_PER_PAGE < totalCount
      setHasMore(hasMoreItems)

      // Mark initial load as done
      if (!initialLoadDone) {
        setInitialLoadDone(true)
      }
    } catch (err: any) {
      console.error('Error loading organizational units:', err)
      setError(err.message || 'Failed to load organizational units')
      setHasMore(false)
      setInitialLoadDone(true)
    } finally {
      setLoading(false)
    }
  }, [client, loading, hasMore, offset, currentSearch, accessToken, structureId, initialLoadDone])

  // Search organizational units
  const searchUnits = useCallback((searchTerm?: string) => {
    setCurrentSearch(searchTerm)
    setOffset(0)
    setHasMore(true)
    setTotal(0)
    setError(null)
    setInitialLoadDone(false)
  }, [])

  // Retry loading
  const retry = useCallback(() => {
    setError(null)
    setHasMore(true)
    setInitialLoadDone(false)
    setOffset(0)
    setOrganizationalUnits([])
  }, [])

  // Initial load - only trigger once when conditions are met
  useEffect(() => {
    if (accessToken && client && structureId && !initialLoadDone && !loading) {
      loadMore()
    }
  }, [accessToken, client, structureId, initialLoadDone, loading, loadMore])

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
