import { useCallback, useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { SEARCH_EMPLOYEES_LIGHT } from './queries/employeeQueries'

export interface EmployeeOption {
  id: string
  displayName: string
  firstName?: string
  lastName?: string
  userId?: string
}

// Deprecated inline query kept for reference during migration

export const useEmployees = (accessToken?: string) => {
  const graphqlClient = useGraphQLClient(accessToken || '')
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(
    async (q: string) => {
      if (!accessToken) return
      const trimmed = q?.trim() || ''

      setLoading(true)
      setError(null)
      try {
        const query = SEARCH_EMPLOYEES_LIGHT({ search: trimmed, limit: trimmed ? 50 : 100, offset: 0 })
        const result = await graphqlClient.request<{ Employee: any[] }>(query)
        const data = (result.Employee || []).map(e => ({
          id: e.id,
          displayName: e.displayName || `${e.firstName || ''} ${e.lastName || ''}`.trim() || 'Unknown',
          firstName: e.firstName,
          lastName: e.lastName,
          userId: e.userId
        })) as EmployeeOption[]
        setEmployees(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch employees')
      } finally {
        setLoading(false)
      }
    },
    [accessToken, graphqlClient]
  )

  useEffect(() => {
    if (accessToken) {
      search('')
    }
  }, [accessToken, search])

  return { employees, loading, error, search }
}
