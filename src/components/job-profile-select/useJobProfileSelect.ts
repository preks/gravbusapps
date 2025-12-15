import { useEffect, useState, useMemo, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface JobProfileOption {
  id: string
  code?: string
  name?: string
  description?: string
}

// Query to fetch job profiles
const GET_JOB_PROFILES_QUERY = (search?: string, limit = 20, offset = 0): string => {
  const searchCondition = search?.trim()
    ? `_or: [
        { code: { _ilike: "%${search.trim()}%" } },
        { name: { _ilike: "%${search.trim()}%" } },
        { description: { _ilike: "%${search.trim()}%" } }
      ]`
    : ''

  return `
    query GetJobProfiles {
      JobProfile(
        where: {
          isDeleted: { _eq: false }
          ${searchCondition ? `, ${searchCondition}` : ''}
        }
        limit: ${limit}
        offset: ${offset}
        orderBy: { name: ASC_NULLS_LAST }
      ) {
        id
        code
        name
        description
      }
      JobProfileAggregate(
        where: {
          isDeleted: { _eq: false }
          ${searchCondition ? `, ${searchCondition}` : ''}
        }
      ) {
        aggregate {
          count
        }
      }
    }
  `
}

export interface UseJobProfileSelectProps {
  onValueChange?: (value: string | null) => void
  onJobProfileChange?: (jobProfile: JobProfileOption | null) => void
  businessAppContext?: BusinessAppContextProps
  accessToken?: string
  initialJobProfile?: JobProfileOption | null
  // Manual mode props
  jobProfiles?: JobProfileOption[]
  onSearch?: (q: string) => void
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
}

export interface UseJobProfileSelectReturn {
  jobProfiles: JobProfileOption[]
  loading: boolean
  hasMore: boolean
  onSearch: (q: string) => void
  onLoadMore: () => void
  handleValueChange: (newValue: string | null) => void
  jobProfilesWithInitial: JobProfileOption[]
}

export const useJobProfileSelect = ({
  onValueChange,
  onJobProfileChange,
  businessAppContext,
  accessToken,
  initialJobProfile,
  jobProfiles: manualJobProfiles,
  onSearch: manualOnSearch,
  loading: manualLoading,
  hasMore: manualHasMore,
  onLoadMore: manualOnLoadMore
}: UseJobProfileSelectProps): UseJobProfileSelectReturn => {
  const token = accessToken || businessAppContext?.accessToken || ''
  const graphqlClient = useGraphQLClient(token)

  const [jobProfiles, setJobProfiles] = useState<JobProfileOption[]>(manualJobProfiles || [])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [offset, setOffset] = useState(0)
  const limit = 20

  // Determine if we should use manual mode
  const isManualMode = Boolean(manualJobProfiles || manualOnSearch)

  // Fetch job profiles
  const fetchJobProfiles = useCallback(
    async (search: string = '', resetOffset = true) => {
      if (isManualMode) return

      setLoading(true)
      try {
        const query = GET_JOB_PROFILES_QUERY(search, limit, resetOffset ? 0 : offset)
        const result = await graphqlClient.request<{
          JobProfile: Array<{
            id: string
            code?: string
            name?: string
            description?: string
          }>
          JobProfileAggregate: {
            aggregate: {
              count: number
            }
          }
        }>(query)

        const profiles: JobProfileOption[] = (result.JobProfile || []).map(profile => ({
          id: profile.id,
          code: profile.code,
          name: profile.name,
          description: profile.description
        }))

        if (resetOffset) {
          setJobProfiles(profiles)
          setOffset(limit)
        } else {
          setJobProfiles(prev => [...prev, ...profiles])
          setOffset(prev => prev + limit)
        }

        const count = result.JobProfileAggregate?.aggregate?.count || 0
        setHasMore((resetOffset ? limit : offset + limit) < count)
      } catch (error) {
        console.error('Error fetching job profiles:', error)
      } finally {
        setLoading(false)
      }
    },
    [graphqlClient, token, isManualMode, offset]
  )

  // Initial load
  useEffect(() => {
    if (!isManualMode && token) {
      fetchJobProfiles('', true)
    }
  }, [isManualMode, token])

  // Search handler
  const handleSearch = useCallback(
    (search: string) => {
      setSearchTerm(search)
      if (isManualMode) {
        manualOnSearch?.(search)
      } else {
        fetchJobProfiles(search, true)
      }
    },
    [isManualMode, manualOnSearch, fetchJobProfiles]
  )

  // Load more handler
  const handleLoadMore = useCallback(() => {
    if (isManualMode) {
      manualOnLoadMore?.()
    } else {
      fetchJobProfiles(searchTerm, false)
    }
  }, [isManualMode, manualOnLoadMore, fetchJobProfiles, searchTerm])

  // Value change handler
  const handleValueChange = useCallback(
    (newValue: string | null) => {
      onValueChange?.(newValue || null)

      if (newValue && onJobProfileChange) {
        const profile = jobProfiles.find(p => p.id === newValue)
        if (profile) {
          onJobProfileChange(profile)
        } else if (initialJobProfile && initialJobProfile.id === newValue) {
          onJobProfileChange(initialJobProfile)
        } else {
          onJobProfileChange(null)
        }
      } else {
        onJobProfileChange?.(null)
      }
    },
    [onValueChange, onJobProfileChange, jobProfiles, initialJobProfile]
  )

  // Combine initial with fetched profiles
  const jobProfilesWithInitial = useMemo(() => {
    if (!initialJobProfile) return jobProfiles

    const hasInitial = jobProfiles.some(p => p.id === initialJobProfile.id)
    if (hasInitial) return jobProfiles

    return [initialJobProfile, ...jobProfiles]
  }, [jobProfiles, initialJobProfile])

  return {
    jobProfiles: isManualMode ? manualJobProfiles || [] : jobProfiles,
    loading: isManualMode ? Boolean(manualLoading) : loading,
    hasMore: isManualMode ? Boolean(manualHasMore) : hasMore,
    onSearch: handleSearch,
    onLoadMore: handleLoadMore,
    handleValueChange,
    jobProfilesWithInitial
  }
}
