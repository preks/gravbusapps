import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { SelectOption } from '../types'

export interface JobLevelData {
  id: string
  name: string
  code?: string
  jobLevelGroup?: {
    id: string
  } | null
}

export interface QueryVariablesJobLevel {
  jobLevelId?: string
  jobLevelGroupId?: string
  offset?: number
  limit?: number
  search?: string
}

const GET_JOB_LEVELS_QUERY = `
  query GetJobLevels($search: String, $limit: Int, $offset: Int, $jobLevelId: uuid, $jobLevelGroupId: String) {
    JobLevel(
      where: {
        name: { _ilike: $search },
        id: { _eq: $jobLevelId },
        jobLevelGroup: { id: { _eq: $jobLevelGroupId } }
      },
      limit: $limit,
      offset: $offset,
      orderBy: { name: ASC }
    ) {
      id
      name
      code
      jobLevelGroup {
        id
      }
    }
    JobLevelAggregate(
      where: {
        name: { _ilike: $search },
        id: { _eq: $jobLevelId },
        jobLevelGroup: { id: { _eq: $jobLevelGroupId } }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

export type JobLevelQueryData = {
  JobLevel: JobLevelData[]
  JobLevelAggregate: {
    aggregate: {
      count: number
    }
  }
}

export const useJobLevels = (context: BusinessAppContextProps) => {
  const [jobLevels, setJobLevels] = useState<SelectOption[]>([])
  const [allJobLevels, setAllJobLevels] = useState<JobLevelData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const graphqlClient = useGraphqlClient(context.accessToken)

  const fetchJobLevels = useCallback(
    async (
      params: {
        limit?: number
        offset?: number
        search?: string
        jobLevelGroupId?: string
        reset?: boolean
      } = {}
    ) => {
      const { limit = 20, offset = 0, search = '', jobLevelGroupId, reset = false } = params

      if (reset) {
        setJobLevels([])
        setAllJobLevels([])
      }

      setLoading(true)
      setError(null)

      try {
        const variables = {
          search: search ? `%${search}%` : undefined,
          limit,
          offset,
          jobLevelId: undefined,
          jobLevelGroupId: jobLevelGroupId || undefined
        }

        const result = await graphqlClient.request<JobLevelQueryData>(GET_JOB_LEVELS_QUERY, variables)

        const levelsData = result?.JobLevel || []
        const selectOptions: SelectOption[] = levelsData.map((level: JobLevelData) => ({
          id: level.id,
          name: level.name,
          label: level.name,
          value: level.id
        }))

        if (reset || offset === 0) {
          setJobLevels(selectOptions)
          setAllJobLevels(levelsData)
        } else {
          setJobLevels(prev => [...prev, ...selectOptions])
          setAllJobLevels(prev => [...prev, ...levelsData])
        }

        setHasMore(levelsData.length === limit)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch job levels'
        setError(errorMessage)
        console.error('Error fetching job levels:', err)
      } finally {
        setLoading(false)
      }
    },
    [context.accessToken, graphqlClient]
  )

  const searchJobLevels = useCallback(
    (search: string) => {
      setSearchTerm(search)
      fetchJobLevels({ search, reset: true })
    },
    [fetchJobLevels]
  )

  const loadMoreJobLevels = useCallback(() => {
    if (!loading && hasMore) {
      fetchJobLevels({
        search: searchTerm,
        offset: jobLevels.length
      })
    }
  }, [fetchJobLevels, loading, hasMore, searchTerm, jobLevels.length])

  const fetchJobLevelsByGroup = useCallback(
    (jobLevelGroupId: string) => {
      if (jobLevelGroupId) {
        fetchJobLevels({ jobLevelGroupId, reset: true })
      } else {
        fetchJobLevels({ reset: true })
      }
    },
    [fetchJobLevels]
  )

  // Load initial data
  useEffect(() => {
    if (context.accessToken) {
      fetchJobLevels({ reset: true })
    }
  }, [context.accessToken, fetchJobLevels])

  return {
    jobLevels,
    allJobLevels,
    loading,
    error,
    hasMore,
    searchJobLevels,
    loadMoreJobLevels,
    fetchJobLevelsByGroup,
    refetch: () => fetchJobLevels({ reset: true })
  }
}
