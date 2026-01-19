'use client'

import { useEffect, useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

export interface JobLevelFilterOption {
  id: string
  name: string
}

const GET_JOB_LEVELS_QUERY = `
  query GetJobLevels($search: String, $limit: Int, $offset: Int) {
    JobLevel(
      where: {
        _and: [
          { isDeleted: { _eq: false } },
          { name: { _ilike: $search } }
        ]
      },
      limit: $limit,
      offset: $offset,
      orderBy: { hierarchyOrder: ASC, name: ASC }
    ) {
      id
      name
    }
  }
`

/**
 * Custom hook to fetch job levels for filter options
 * @param accessToken User access token
 * @param search Search string for filtering
 * @param offset Pagination offset
 */
export function useJobLevelFilters(accessToken: string, search: string = '', offset: number = 0) {
  const [levels, setLevels] = useState<JobLevelFilterOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const client = useGraphqlClient(accessToken)

  useEffect(() => {
    if (!client) return

    setLoading(true)
    setError(null)

    const searchQuery = search ? `%${search}%` : '%'

    client
      .request(GET_JOB_LEVELS_QUERY, {
        search: searchQuery,
        limit: 5,
        offset
      })
      .then((response: any) => {
        const levelsData = response?.JobLevel || []
        const levelOptions = levelsData.map((level: any) => ({
          id: level.id,
          name: level.name || ''
        }))

        setLevels(levelOptions)
      })
      .catch((err: any) => {
        console.error('Error fetching job levels:', err)
        setError(err)
        setLevels([])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [search, offset, client])

  return { levels, loading, error }
}
