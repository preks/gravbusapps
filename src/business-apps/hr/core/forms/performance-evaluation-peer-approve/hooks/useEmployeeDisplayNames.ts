import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

const GET_EMPLOYEE_DISPLAY_NAMES = `
  query GetEmployeeDisplayNames($employeeIds: [uuid!]!) {
    Employee(
      where: { id: { _in: $employeeIds }, isDeleted: { _eq: false } }
    ) {
      id
      displayName
      firstName
      lastName
    }
  }
`

/**
 * Fetches display names for a list of employee IDs via GraphQL.
 * Returns a map of employeeId -> display name (displayName or "firstName lastName").
 */
export function useEmployeeDisplayNames(accessToken: string | undefined, employeeIds: string[]) {
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchNames = useCallback(async () => {
    if (!accessToken || !employeeIds.length) {
      setDisplayNames({})
      return
    }

    setLoading(true)
    try {
      const result = await graphqlClient.request<{
        Employee: Array<{
          id: string
          displayName?: string | null
          firstName?: string | null
          lastName?: string | null
        }>
      }>(GET_EMPLOYEE_DISPLAY_NAMES, { employeeIds })

      const map: Record<string, string> = {}
      for (const emp of result.Employee ?? []) {
        const name = emp.displayName?.trim() || [emp.firstName, emp.lastName].filter(Boolean).join(' ').trim() || emp.id
        map[emp.id] = name
      }
      setDisplayNames(map)
    } catch {
      setDisplayNames({})
    } finally {
      setLoading(false)
    }
  }, [accessToken, graphqlClient, employeeIds.join(',')])

  useEffect(() => {
    fetchNames()
  }, [fetchNames])

  return { displayNames, loading, refetch: fetchNames }
}
