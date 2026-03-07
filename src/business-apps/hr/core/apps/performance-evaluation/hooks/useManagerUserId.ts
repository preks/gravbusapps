import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface ManagerUserIdResponse {
  Employee: Array<{
    id: string
    userId: string | null
  }>
}

interface UseManagerUserIdProps {
  accessToken: string
  managerId?: string | null
}

/**
 * Hook to fetch manager's userId from their employeeId
 */
export const useManagerUserId = ({ accessToken, managerId }: UseManagerUserIdProps) => {
  const [managerUserId, setManagerUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    if (!accessToken || !managerId) {
      setManagerUserId(null)
      return
    }

    const fetchManagerUserId = async () => {
      setLoading(true)
      setError(null)

      try {
        const query = `
          query GetManagerUserId($managerId: uuid!) {
            Employee(where: { id: { _eq: $managerId } }, limit: 1) {
              id
              userId
            }
          }
        `

        const variables = { managerId }
        const result = await graphqlClient.request<ManagerUserIdResponse>(query, variables)

        if (result.Employee && result.Employee.length > 0 && result.Employee[0].userId) {
          setManagerUserId(result.Employee[0].userId)
        } else {
          setManagerUserId(null)
          setError('Manager userId not found')
        }
      } catch (err) {
        console.error('Error fetching manager userId:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch manager userId')
        setManagerUserId(null)
      } finally {
        setLoading(false)
      }
    }

    fetchManagerUserId()
  }, [accessToken, managerId, graphqlClient])

  return { managerUserId, loading, error }
}
