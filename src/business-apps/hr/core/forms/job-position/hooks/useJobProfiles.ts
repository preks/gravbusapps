import { useState, useCallback, useEffect, useRef } from 'react'
import { fetchJobProfileData, JobProfileItem, QueryVariablesJobProfile } from '../queries/JobProfileQueries'
import { SelectOption } from '../types'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

const PROFILES_PER_PAGE = 20

export interface UseJobProfilesProps {
  accessToken: string
  search?: string
  enabled?: boolean
  /** Only list job profiles for this job function (required for job position form) */
  jobFunctionId?: string
}

export interface UseJobProfilesReturn {
  jobProfiles: SelectOption[]
  allJobProfiles: JobProfileItem[]
  loading: boolean
  error: string | null
  hasMore: boolean
  total: number
  loadMore: () => void
  searchProfiles: (searchTerm?: string) => void
  retry: () => void
}

export const useJobProfiles = ({
  accessToken,
  search,
  enabled = true,
  jobFunctionId
}: UseJobProfilesProps): UseJobProfilesReturn => {
  const client = useGraphqlClient(accessToken)
  const [jobProfiles, setJobProfiles] = useState<SelectOption[]>([])
  const [allJobProfiles, setAllJobProfiles] = useState<JobProfileItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [currentSearch, setCurrentSearch] = useState<string | undefined>(search)

  const convertToSelectOption = useCallback((profile: JobProfileItem): SelectOption => {
    const displayName = profile.code ? `${profile.name} (${profile.code})` : profile.name
    return {
      id: profile.id,
      name: displayName,
      label: displayName,
      value: profile.id
    }
  }, [])

  const prevJobFunctionIdRef = useRef<string | undefined>(undefined)

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

  useEffect(() => {
    if (prevJobFunctionIdRef.current === jobFunctionId) {
      return
    }
    prevJobFunctionIdRef.current = jobFunctionId
    setJobProfiles([])
    setAllJobProfiles([])
    setOffset(0)
    setHasMore(Boolean(jobFunctionId))
    setTotal(0)
    setError(null)
  }, [jobFunctionId])

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !accessToken || !client || !jobFunctionId) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const variables: QueryVariablesJobProfile = {
        offset,
        limit: PROFILES_PER_PAGE,
        search: currentSearch,
        jobFunctionId
      }

      const data = await fetchJobProfileData(client, variables)

      const newProfiles = data.JobProfile || []
      const newSelectOptions = newProfiles.map(convertToSelectOption)

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load job profiles'
      console.error('Error loading job profiles:', err)
      setError(message)
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [client, loading, hasMore, offset, currentSearch, accessToken, jobFunctionId, convertToSelectOption])

  const searchProfiles = useCallback(
    (searchTerm?: string) => {
      if (!jobFunctionId) {
        return
      }

      setLoading(true)
      setCurrentSearch(searchTerm)
      setJobProfiles([])
      setAllJobProfiles([])
      setOffset(0)
      setHasMore(true)
      setTotal(0)
      setError(null)

      window.setTimeout(() => {
        if (!accessToken || !client || !jobFunctionId) {
          setLoading(false)
          return
        }

        setLoading(true)
        const variables: QueryVariablesJobProfile = {
          offset: 0,
          limit: PROFILES_PER_PAGE,
          search: searchTerm,
          jobFunctionId
        }

        fetchJobProfileData(client, variables)
          .then(data => {
            const newProfiles = data.JobProfile || []
            const newSelectOptions = newProfiles.map(convertToSelectOption)

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
            console.error('Job profile search failed:', err)
            setError(err instanceof Error ? err.message : 'Search failed')
            setLoading(false)
          })
      }, 100)
    },
    [accessToken, client, convertToSelectOption, jobFunctionId]
  )

  const retry = useCallback(() => {
    setError(null)
    setHasMore(true)
    loadMore()
  }, [loadMore])

  useEffect(() => {
    const shouldLoad =
      enabled && Boolean(jobFunctionId) && accessToken && client && !loading && jobProfiles.length === 0 && hasMore

    if (shouldLoad) {
      loadMore()
    }
  }, [enabled, jobFunctionId, accessToken, client, jobProfiles.length, loading, hasMore, loadMore])

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
