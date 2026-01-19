import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { SelectOption } from '../types'

export interface JobFunctionData {
  id: string
  name: string
  code?: string
  jobFamily?: {
    id: string
  } | null
  jobLevelGroup?: {
    id: string
  } | null
}

export interface QueryVariablesJobFunction {
  jobFunctionId?: string
  jobFamilyId?: string
  offset?: number
  limit?: number
  search?: string
}

const GET_JOB_FUNCTIONS_QUERY = `
  query GetJobFunctions($search: String, $limit: Int, $offset: Int, $jobFunctionId: uuid, $jobFamilyId: String) {
    JobFunction(
      where: {
        name: { _ilike: $search },
        id: { _eq: $jobFunctionId },
        jobFamily: { id: { _eq: $jobFamilyId } }
      },
      limit: $limit,
      offset: $offset,
      orderBy: { name: ASC }
    ) {
      id
      name
      code
      jobFamily {
        id
      }
      jobLevelGroup {
        id
      }
    }
    JobFunctionAggregate(
      where: {
        name: { _ilike: $search },
        id: { _eq: $jobFunctionId },
        jobFamily: { id: { _eq: $jobFamilyId } }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

export type JobFunctionQueryData = {
  JobFunction: JobFunctionData[]
  JobFunctionAggregate: {
    aggregate: {
      count: number
    }
  }
}

export const useJobFunctions = (context: BusinessAppContextProps) => {
  const [jobFunctions, setJobFunctions] = useState<SelectOption[]>([])
  const [allJobFunctions, setAllJobFunctions] = useState<JobFunctionData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const graphqlClient = useGraphqlClient(context.accessToken)

  const fetchJobFunctions = useCallback(
    async (
      params: {
        limit?: number
        offset?: number
        search?: string
        jobFamilyId?: string
        jobFunctionId?: string
        reset?: boolean
      } = {}
    ) => {
      const { limit = 20, offset = 0, search = '', jobFamilyId, jobFunctionId, reset = false } = params

      if (reset) {
        setJobFunctions([])
        setAllJobFunctions([])
      }

      setLoading(true)
      setError(null)

      try {
        const variables = {
          search: search ? `%${search}%` : undefined,
          limit,
          offset,
          jobFunctionId: jobFunctionId || undefined,
          jobFamilyId: jobFamilyId || undefined
        }

        const result = await graphqlClient.request<JobFunctionQueryData>(GET_JOB_FUNCTIONS_QUERY, variables)

        const functionsData = result?.JobFunction || []
        const selectOptions: SelectOption[] = functionsData.map((func: JobFunctionData) => ({
          id: func.id,
          name: func.name,
          label: func.name,
          value: func.id
        }))

        if (reset || offset === 0) {
          setJobFunctions(selectOptions)
          setAllJobFunctions(functionsData)
        } else {
          setJobFunctions(prev => [...prev, ...selectOptions])
          setAllJobFunctions(prev => [...prev, ...functionsData])
        }

        setHasMore(functionsData.length === limit)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch job functions'
        setError(errorMessage)
        console.error('Error fetching job functions:', err)
      } finally {
        setLoading(false)
      }
    },
    [context.accessToken, graphqlClient]
  )

  const searchJobFunctions = useCallback(
    (search: string) => {
      setSearchTerm(search)
      fetchJobFunctions({ search, reset: true })
    },
    [fetchJobFunctions]
  )

  const loadMoreJobFunctions = useCallback(() => {
    if (!loading && hasMore) {
      fetchJobFunctions({
        search: searchTerm,
        offset: jobFunctions.length
      })
    }
  }, [fetchJobFunctions, loading, hasMore, searchTerm, jobFunctions.length])

  const fetchJobFunctionsByFamily = useCallback(
    (jobFamilyId: string) => {
      if (jobFamilyId) {
        fetchJobFunctions({ jobFamilyId, reset: true })
      } else {
        fetchJobFunctions({ reset: true })
      }
    },
    [fetchJobFunctions]
  )

  // Load initial data
  useEffect(() => {
    if (context.accessToken) {
      fetchJobFunctions({ reset: true })
    }
  }, [context.accessToken, fetchJobFunctions])

  return {
    jobFunctions,
    allJobFunctions,
    loading,
    error,
    hasMore,
    searchJobFunctions,
    loadMoreJobFunctions,
    fetchJobFunctionsByFamily,
    refetch: () => fetchJobFunctions({ reset: true })
  }
}
