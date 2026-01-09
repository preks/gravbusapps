import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface EmployeeData {
  id: string
  lastName: string
  firstName: string
  userId: string
  [key: string]: any
}

export const useEmployeeData = (accessToken: string, userId?: string) => {
  const [employee, setEmployee] = useState<EmployeeData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchEmployee = useCallback(async () => {
    if (!userId || !accessToken) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const query = `
        query fetchEmployeeId($id: String!) {
          Employee(where: {userId: {_eq: $id}}) {
            id
            lastName
            firstName
            userId
          }
        }
      `

      const result = await graphqlClient.request<{ Employee: EmployeeData[] }>(query, { id: userId })
      if (result?.Employee && result.Employee.length > 0) {
        setEmployee(result.Employee[0])
      } else {
        setEmployee(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch employee')
      setEmployee(null)
    } finally {
      setLoading(false)
    }
  }, [userId, accessToken, graphqlClient])

  useEffect(() => {
    if (userId && accessToken) {
      fetchEmployee()
    }
  }, [userId, accessToken, fetchEmployee])

  return { employee, loading, error, refetch: fetchEmployee }
}
