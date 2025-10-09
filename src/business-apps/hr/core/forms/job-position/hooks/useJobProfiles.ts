import { useState, useCallback, useEffect } from 'react'
import { fetchJobProfileData, JobProfileItem, QueryVariablesJobProfile } from '../queries/JobProfileQueries'
import { SelectOption } from '../types'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

const PROFILES_PER_PAGE = 20

export interface UseJobProfilesProps {
  accessToken: string
  search?: string
  enabled?: boolean // Lazy loading support
}

export interface UseJobProfilesReturn {
  jobProfiles: SelectOption[]
  allJobProfiles: JobProfileItem[] // Full data for auto-filling other fields
  loading: boolean
  error: string | null
  hasMore: boolean
  total: number
  loadMore: () => void
  searchProfiles: (searchTerm?: string) => void
  retry: () => void
}

/**
 * Custom hook for fetching job profiles with infinite scroll and search functionality
 */
export const useJobProfiles = ({ accessToken, search, enabled = true }: UseJobProfilesProps): UseJobProfilesReturn => {
  const client = useGraphqlClient(accessToken)
  const [jobProfiles, setJobProfiles] = useState<SelectOption[]>([])
  const [allJobProfiles, setAllJobProfiles] = useState<JobProfileItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [currentSearch, setCurrentSearch] = useState<string | undefined>(search)

  // Convert JobProfileItem to SelectOption (exact format that works with gravity-ui-catalog Select)
  const convertToSelectOption = useCallback((profile: JobProfileItem): SelectOption => {
    // Use the EXACT same format as working organizational units
    const displayName = profile.code ? `${profile.name} (${profile.code})` : profile.name
    const option = {
      id: profile.id,
      name: displayName, // This is what gets displayed
      label: displayName, // Keep label same as name
      value: profile.id // This is what gets selected
    }
    return option
  }, []) // No dependencies since the function only uses its parameter

  // Reset data when search changes
  useEffect(() => {
    if (currentSearch !== search) {
      setCurrentSearch(search)
      setJobProfiles([])
      setAllJobProfiles([])
      setOffset(0)
      setHasMore(true)
      setTotal(0)
      setError(null)
    }
  }, [search, currentSearch])

  // Load more job profiles
  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !accessToken || !client) {
      return
    }
    setLoading(true)
    setError(null)

    try {
      const variables: QueryVariablesJobProfile = {
        offset,
        limit: PROFILES_PER_PAGE,
        search: currentSearch
      }

      const data = await fetchJobProfileData(client, variables)

      const newProfiles = data.JobProfile || []
      const newSelectOptions = newProfiles.map(convertToSelectOption)

      // Append new data for infinite scroll - always create new array reference
      setJobProfiles(prev => {
        const updatedSelectOptions = offset === 0 ? [...newSelectOptions] : [...prev, ...newSelectOptions]
        return updatedSelectOptions
      })

      setAllJobProfiles(prev => (offset === 0 ? [...newProfiles] : [...prev, ...newProfiles]))

      const totalCount = data.JobProfileAggregate.aggregate.count
      const newOffset = offset + PROFILES_PER_PAGE
      const hasMoreData = newProfiles.length === PROFILES_PER_PAGE && newOffset < totalCount

      setTotal(totalCount)
      setOffset(newOffset)
      setHasMore(hasMoreData)
    } catch (err: any) {
      console.error('Error loading job profiles:', err)
      setError(err.message || 'Failed to load job profiles')
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [client, loading, hasMore, offset, currentSearch, accessToken])

  // Search profiles
  const searchProfiles = useCallback(
    (searchTerm?: string) => {
      // Set loading FIRST, then reset state
      setLoading(true)
      setCurrentSearch(searchTerm)
      setJobProfiles([])
      setAllJobProfiles([])
      setOffset(0)
      setHasMore(true)
      setTotal(0)
      setError(null)

      // 🔥 IMMEDIATE FIX: Force load data right after state reset
      // Use setTimeout to ensure state has been updated
      setTimeout(() => {
        if (accessToken && client) {
          const variables: QueryVariablesJobProfile = {
            offset: 0,
            limit: PROFILES_PER_PAGE,
            search: searchTerm
          }

          setLoading(true)
          fetchJobProfileData(client, variables)
            .then(data => {
              const newProfiles = data.JobProfile || []
              const newSelectOptions = newProfiles.map(convertToSelectOption)

              // Always create new array references to trigger React updates
              setJobProfiles([...newSelectOptions])
              setAllJobProfiles([...newProfiles])
              const totalCount = data.JobProfileAggregate.aggregate.count
              const hasMoreData = newProfiles.length === PROFILES_PER_PAGE && PROFILES_PER_PAGE < totalCount

              setTotal(totalCount)
              setOffset(PROFILES_PER_PAGE)
              setHasMore(hasMoreData)
              setLoading(false)
            })
            .catch(err => {
              console.error('❌ Direct search failed:', err)
              setError(err.message || 'Search failed')
              setLoading(false)
            })
        }
      }, 100)
    },
    [accessToken, client, convertToSelectOption]
  )

  // Retry loading
  const retry = useCallback(() => {
    setError(null)
    setHasMore(true)
    loadMore()
  }, [loadMore])

  // 🔥 FIX: Auto-load data when needed (with lazy loading support)
  useEffect(() => {
    const shouldLoad = enabled && accessToken && client && !loading && jobProfiles.length === 0 && hasMore

    if (shouldLoad) {
      loadMore()
    }
  }, [enabled, currentSearch, accessToken, client, jobProfiles.length, loading, hasMore, offset, loadMore])

  return {
    jobProfiles,
    allJobProfiles,
    loading,
    error,
    hasMore,
    total,
    loadMore,
    searchProfiles,
    retry
  }
}
