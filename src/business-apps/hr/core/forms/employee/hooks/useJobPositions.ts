import { useState, useCallback, useEffect } from 'react'
import { useGetJobPositionData } from '@/business-apps/hr/core/apps/human-resources/components/views/job-position-view/queries/JobPositionQueries'
import { SelectOption } from '../types'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

const POSITIONS_PER_PAGE = 20

export interface UseJobPositionsProps {
  accessToken: string
  structureId: string
  organizationalUnitId?: string
  search?: string
}

export interface UseJobPositionsReturn {
  jobPositions: SelectOption[]
  allJobPositions: any[]
  loading: boolean
  error: string | null
  hasMore: boolean
  total: number
  loadMore: () => void
  searchPositions: (searchTerm?: string) => void
  retry: () => void
  refetch: () => void
}

/**
 * Custom hook for fetching vacant job positions with infinite scroll and search functionality
 */
export const useJobPositions = ({
  accessToken,
  structureId,
  organizationalUnitId,
  search
}: UseJobPositionsProps): UseJobPositionsReturn => {
  const [jobPositions, setJobPositions] = useState<SelectOption[]>([])
  const [allJobPositions, setAllJobPositions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [currentSearch, setCurrentSearch] = useState<string | undefined>(search)
  const [currentOrgUnitId, setCurrentOrgUnitId] = useState<string | undefined>(organizationalUnitId)
  const [initialLoadDone, setInitialLoadDone] = useState(false)

  const { fetchJobPositionData } = useGetJobPositionData({ accessToken } as BusinessAppContextProps)

  // Convert job position to SelectOption
  const convertToSelectOption = (position: any): SelectOption => ({
    id: position.id,
    name: position.name,
    label: position.name,
    value: position.id
  })

  // Build filter object based on organizational unit
  const buildFilter = useCallback(() => {
    const filter: any = {}

    // Filter by organizational unit if specified
    if (currentOrgUnitId) {
      filter.organizationalUnitEmployees = {
        organizationalUnit: {
          id: { _eq: currentOrgUnitId }
        }
      }
    }

    return filter
  }, [currentOrgUnitId])

  // Reset data when search or organizationalUnitId changes
  useEffect(() => {
    if (currentSearch !== search || currentOrgUnitId !== organizationalUnitId) {
      setCurrentSearch(search)
      setCurrentOrgUnitId(organizationalUnitId)
      setOffset(0)
      setHasMore(true)
      setTotal(0)
      setError(null)
      setInitialLoadDone(false)
      setJobPositions([])
      setAllJobPositions([])
    }
  }, [search, currentSearch, organizationalUnitId, currentOrgUnitId])

  // Load more job positions
  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !accessToken || !structureId) return

    setLoading(true)
    setError(null)

    try {
      const filter = buildFilter()
      const searchTerm = currentSearch ? `%${currentSearch}%` : '%%'

      const variables = {
        structureId,
        offset,
        limit: POSITIONS_PER_PAGE,
        vacant: true, // Only fetch vacant positions
        filter,
        search: searchTerm
      }

      const data = await fetchJobPositionData(variables)
      const newPositions = data.JobPosition || []
      const newSelectOptions = newPositions.map(convertToSelectOption)
      const totalCount = data.JobPositionAggregate.aggregate.count

      // Append new data for infinite scroll
      setJobPositions(prev => (offset === 0 ? newSelectOptions : [...prev, ...newSelectOptions]))
      setAllJobPositions(prev => (offset === 0 ? newPositions : [...prev, ...newPositions]))

      setTotal(totalCount)
      setOffset(prev => prev + POSITIONS_PER_PAGE)

      // Set hasMore to false if we got fewer items than requested OR if we've loaded all items
      const hasMoreItems = newPositions.length === POSITIONS_PER_PAGE && offset + POSITIONS_PER_PAGE < totalCount
      setHasMore(hasMoreItems)

      // Mark initial load as done
      if (!initialLoadDone) {
        setInitialLoadDone(true)
      }
    } catch (err: any) {
      console.error('Error loading job positions:', err)
      setError(err.message || 'Failed to load job positions')
      setHasMore(false)
      setInitialLoadDone(true)
    } finally {
      setLoading(false)
    }
  }, [
    accessToken,
    structureId,
    loading,
    hasMore,
    offset,
    currentSearch,
    currentOrgUnitId,
    buildFilter,
    fetchJobPositionData,
    initialLoadDone
  ])

  // Search job positions
  const searchPositions = useCallback((searchTerm?: string) => {
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
    setJobPositions([])
    setAllJobPositions([])
  }, [])

  // Refetch job positions (used after creating a new position)
  const refetch = useCallback(() => {
    setError(null)
    setHasMore(true)
    setInitialLoadDone(false)
    setOffset(0)
    setJobPositions([])
    setAllJobPositions([])
  }, [])

  // Initial load and reload when organizational unit changes - only trigger once when conditions are met
  useEffect(() => {
    if (accessToken && structureId && !initialLoadDone && !loading) {
      loadMore()
    }
  }, [accessToken, structureId, initialLoadDone, loading, loadMore])

  // Reload when organizational unit changes (but only if initial load is done)
  useEffect(() => {
    if (initialLoadDone && currentOrgUnitId !== organizationalUnitId) {
      setInitialLoadDone(false)
      setJobPositions([])
      setAllJobPositions([])
      setOffset(0)
      setHasMore(true)
      setTotal(0)
      setError(null)
    }
  }, [organizationalUnitId, currentOrgUnitId, initialLoadDone])

  return {
    jobPositions,
    allJobPositions,
    loading,
    error,
    hasMore,
    total,
    loadMore,
    searchPositions,
    retry,
    refetch
  }
}
