'use client'

import { useEffect, useState, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

const MISSING_JOB_PROFILE_COUNT_QUERY = `
  query MissingJobProfileCount($structureId: uuid!) {
    JobPositionAggregate(
      where: {
        _and: [
          {
            organizationalUnitEmployees: {
              structureId: { _eq: $structureId }
            }
          },
          { isDeleted: { _eq: false } },
          { jobProfileId: { _isNull: true } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

/**
 * Custom hook to fetch the count of job positions with missing job profiles
 * @param accessToken User access token
 */
export function useMissingJobProfileCount(accessToken: string, enabled: boolean = true) {
  const [count, setCount] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const client = useGraphqlClient(accessToken)
  const structureId = getCurrentActiveStructureId()

  const fetchCount = useCallback(async () => {
    if (!client || !accessToken || !structureId) return

    setLoading(true)
    setError(null)

    try {
      const response = await client.request(MISSING_JOB_PROFILE_COUNT_QUERY, {
        structureId
      })

      const countData = response?.JobPositionAggregate?.aggregate?.count || 0
      setCount(countData)
    } catch (err: any) {
      console.error('Error fetching missing job profile count:', err)
      setError(err)
      setCount(0)
    } finally {
      setLoading(false)
    }
  }, [client, accessToken, structureId])

  useEffect(() => {
    if (enabled) {
      fetchCount()
    }
  }, [enabled, fetchCount])

  return { count, loading, error, refetch: fetchCount }
}
