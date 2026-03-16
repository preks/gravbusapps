/**
 * Fetches employees eligible for "Responsible person" and "Performed by" in the retire-asset flow.
 * Uses the same approach as the employee profile: members of the "all-it-admin" group
 * (aligned with scope employee-record-all-IT-admin). Falls back to structure employees if the
 * group API is unavailable or returns no members.
 */

import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { useUserManagementClient } from '@/common/network/users/useUserManagementClient'

export interface ITAdminEmployeeOption {
  id: string
  name: string
}

const IT_ADMIN_GROUP_NAME = 'all-it-admin'

const GET_STRUCTURE_EMPLOYEES = `
  query GetStructureEmployeesForRetire($structureId: uuid!, $search: String, $limit: Int) {
    EmployeePosition(
      where: {
        structureId: { _eq: $structureId },
        employee: { isDeleted: { _eq: false } },
        _or: [
          { firstName: { _ilike: $search } },
          { lastName: { _ilike: $search } },
          { employee: { displayName: { _ilike: $search } } }
        ]
      },
      limit: $limit,
      orderBy: { firstName: ASC, lastName: ASC }
    ) {
      employeeId
      firstName
      lastName
      employee {
        id
        displayName
        userId
      }
    }
  }
`

const GET_EMPLOYEES_BY_USER_IDS = `
  query GetEmployeesByUserIds($userIds: [String!]) {
    Employee(where: { userId: { _in: $userIds }, isDeleted: { _eq: false } }) {
      id
      displayName
      userId
    }
  }
`

function buildName(m: { givenName?: string; familyName?: string; name?: string }): string {
  if (m.givenName != null || m.familyName != null) {
    return [m.givenName, m.familyName].filter(Boolean).join(' ').trim()
  }
  if (typeof m.name === 'string' && m.name.trim()) return m.name.trim()
  return 'Unknown'
}

function sortByFirstNameAsc(options: ITAdminEmployeeOption[]): ITAdminEmployeeOption[] {
  return [...options].sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }))
}

export function useITAdminEmployees(accessToken: string, currentUserEmployeeId?: string) {
  const [employees, setEmployees] = useState<ITAdminEmployeeOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)
  const userManagementClient = useUserManagementClient(accessToken)

  const fetchEmployees = useCallback(
    async (search?: string) => {
      if (!accessToken) return

      setIsLoading(true)
      setError(null)

      try {
        let list: ITAdminEmployeeOption[] = []

        const groupRes = await userManagementClient.getGroups({ searchParam: IT_ADMIN_GROUP_NAME, limit: 50 })
        const group = (groupRes?.data ?? []).find(
          (g: { name?: string }) => String(g?.name ?? '').toLowerCase() === IT_ADMIN_GROUP_NAME.toLowerCase()
        )

        if (group?.id) {
          const members: Array<{
            id: string
            givenName?: string
            familyName?: string
            name?: string
            employeeId?: string
          }> = []
          const pageSize = 100
          let offset = 0
          let hasMore = true
          while (hasMore) {
            const page = await userManagementClient.getGroupUsers(group.id, { limit: pageSize, offset })
            const data = page?.data ?? []
            members.push(...data)
            if (
              data.length < pageSize ||
              (page.paging?.totalRecords != null && members.length >= page.paging.totalRecords)
            ) {
              hasMore = false
            } else {
              offset += pageSize
            }
          }

          if (members.length > 0) {
            const withEmployeeId = members.filter((m: any) => m.employeeId)
            const userIdsOnly = members.filter((m: any) => !m.employeeId).map((m: any) => m.id)

            list = withEmployeeId.map((m: any) => ({
              id: m.employeeId,
              name: buildName(m)
            }))

            if (userIdsOnly.length > 0) {
              const empResult = await graphqlClient.request<{ Employee: any[] }>(GET_EMPLOYEES_BY_USER_IDS, {
                userIds: userIdsOnly
              })
              const fromGraphQL = (empResult?.Employee ?? []).map((e: any) => ({
                id: e.id,
                name: e.displayName || 'Unknown'
              }))
              list = list.concat(fromGraphQL)
            }

            const byId = new Map<string, ITAdminEmployeeOption>()
            list.forEach(e => byId.set(e.id, e))
            if (currentUserEmployeeId && !byId.has(currentUserEmployeeId)) {
              byId.set(currentUserEmployeeId, { id: currentUserEmployeeId, name: 'Current user' })
            }
            setEmployees(sortByFirstNameAsc(Array.from(byId.values())))
            return
          }
        }

        const structureId = getCurrentActiveStructureId()
        if (!structureId) {
          setError('No structure ID available')
          setEmployees([])
          return
        }

        const result = await graphqlClient.request<{ EmployeePosition: any[] }>(GET_STRUCTURE_EMPLOYEES, {
          structureId,
          search: (search ?? '').trim() ? `%${search}%` : '%',
          limit: 200
        })

        const fallbackList = (result?.EmployeePosition ?? []).map((pos: any) => ({
          id: pos.employeeId ?? pos.employee?.id,
          name: pos.employee?.displayName || `${pos.firstName ?? ''} ${pos.lastName ?? ''}`.trim() || 'Unknown'
        }))

        const byId = new Map<string, ITAdminEmployeeOption>()
        fallbackList.forEach((e: ITAdminEmployeeOption) => byId.set(e.id, e))
        if (currentUserEmployeeId && !byId.has(currentUserEmployeeId)) {
          byId.set(currentUserEmployeeId, { id: currentUserEmployeeId, name: 'Current user' })
        }
        setEmployees(sortByFirstNameAsc(Array.from(byId.values())))
      } catch (err) {
        console.error('useITAdminEmployees: Error fetching employees', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch employees')
        setEmployees([])
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken, graphqlClient, userManagementClient, currentUserEmployeeId]
  )

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  return {
    employees,
    isLoading,
    error,
    refetch: fetchEmployees
  }
}
