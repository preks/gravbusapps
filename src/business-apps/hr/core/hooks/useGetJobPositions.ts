'use client'

import { useState, useEffect } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

export interface JobPositionOption {
  id: string
  name: string
}

/**
 * Custom hook to fetch job positions with a search filter and pagination (limit 5).
 * @param accessToken Access token for authentication.
 * @param searchRegex Search regex string for filtering job positions.
 * @param offset Pagination offset
 */
export function useGetJobPositions(accessToken: string, searchRegex: string, offset: number = 0) {
  const client = useGraphqlClient(accessToken)
  const [positions, setPositions] = useState<JobPositionOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    setLoading(true)
    setError(null)
    async function fetchPositions() {
      try {
        const query = `
          query getJobPositions($searchRegex: String!, $offset: Int!) {
            JobPosition(
              where: {
                _or: [{ name: { _iregex: $searchRegex } }]
              }
              limit: 5
              offset: $offset
            ) {
              id
              name
            }
          }
        `
        const variables = { searchRegex, offset }
        const res = await client.request(query, variables)
        const results = (res as any).JobPosition ?? []
        setPositions(
          results.map((row: any) => ({
            id: row.id,
            name: row.name ?? ''
          }))
        )
        setHasMore(results.length === 5)
      } catch (err: any) {
        setError(err)
        setPositions([])
        setHasMore(false)
      } finally {
        setLoading(false)
      }
    }
    fetchPositions()
  }, [client, searchRegex, offset])

  return { positions, loading, error, hasMore }
}
