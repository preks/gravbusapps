'use client'

import { useEffect, useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

export interface JobFunctionFilterOption {
  id: string
  name: string
}

const GET_JOB_FUNCTIONS_QUERY = `
  query GetJobFunctions($search: String, $limit: Int, $offset: Int) {
    JobFunction(
      where: {
        _and: [
          { isDeleted: { _eq: false } },
          { name: { _ilike: $search } }
        ]
      },
      limit: $limit,
      offset: $offset,
      orderBy: { name: ASC }
    ) {
      id
      name
    }
  }
`

/**
 * Custom hook to fetch job functions for filter options
 * @param accessToken User access token
 * @param search Search string for filtering
 * @param offset Pagination offset
 */
export function useJobFunctionFilters(
  accessToken: string,
  search: string = '',
  offset: number = 0,
  enabled: boolean = true
) {
  const [functions, setFunctions] = useState<JobFunctionFilterOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const client = useGraphqlClient(accessToken)

  useEffect(() => {
    if (!enabled || !client) return

    setLoading(true)
    setError(null)

    const searchQuery = search ? `%${search}%` : '%'

    client
      .request(GET_JOB_FUNCTIONS_QUERY, {
        search: searchQuery,
        limit: 5,
        offset
      })
      .then((response: any) => {
        const functionsData = response?.JobFunction || []
        const functionOptions = functionsData.map((func: any) => ({
          id: func.id,
          name: func.name || ''
        }))

        setFunctions(functionOptions)
      })
      .catch((err: any) => {
        console.error('Error fetching job functions:', err)
        setError(err)
        setFunctions([])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [enabled, search, offset, client])

  return { functions, loading, error }
}
