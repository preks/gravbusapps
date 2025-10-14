import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface PositionTerminationData {
  id: string
  name: string
  jobFunction?: {
    id: string
    name: string
  }
  employeePositions: Array<{
    employee: {
      id: string
      firstName: string
      lastName: string
      pictureThumbnail?: string
    }
    firstName: string
    lastName: string
    organizationalUnit?: {
      id: string
      name: string
    }
  }>
}

interface UsePositionTerminationDataProps {
  jobPositionId: string
  accessToken: string
}

export function usePositionTerminationData({ jobPositionId, accessToken }: UsePositionTerminationDataProps) {
  const [position, setPosition] = useState<PositionTerminationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchPositionData = useCallback(async () => {
    if (!jobPositionId || !accessToken) {
      setPosition(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const query = `
        query GetJobPosition($id: uuid!) {
          JobPosition(where: { id: { _eq: $id } }) {
            id
            name
            jobFunction {
              id
              name
            }
            employeePositions {
              employee {
                id
                firstName
                lastName
                pictureThumbnail
              }
              firstName
              lastName
              organizationalUnit {
                id
                name
              }
            }
          }
        }
      `

      const result = await graphqlClient.request(query, { id: jobPositionId })

      if (result.JobPosition && result.JobPosition.length > 0) {
        setPosition(result.JobPosition[0])
      } else {
        setError('Position not found')
      }
    } catch (err) {
      console.error('Error fetching position data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch position data')
    } finally {
      setLoading(false)
    }
  }, [jobPositionId, accessToken, graphqlClient])

  useEffect(() => {
    fetchPositionData()
  }, [fetchPositionData])

  return {
    data: position, // Return as 'data' to match context usage
    loading,
    error,
    refetch: fetchPositionData
  }
}
