'use client'

import { useEffect, useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

export interface DepartmentFilterOption {
  id: string
  name: string
}

const GET_DEPARTMENTS_QUERY = `
  query GetDepartments($structureId: uuid!, $search: String, $limit: Int, $offset: Int) {
    OrganizationalUnit(
      where: {
        _and: [
          { isDeleted: { _eq: false } },
          { structureId: { _eq: $structureId } },
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
 * Custom hook to fetch departments (organizational units) for filter options
 * @param accessToken User access token
 * @param search Search string for filtering
 * @param offset Pagination offset
 */
export function useDepartmentFilters(
  accessToken: string,
  search: string = '',
  offset: number = 0,
  enabled: boolean = true
) {
  const [departments, setDepartments] = useState<DepartmentFilterOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const client = useGraphqlClient(accessToken)
  const structureId = getCurrentActiveStructureId()

  useEffect(() => {
    if (!enabled || !client || !structureId) return

    setLoading(true)
    setError(null)

    const searchQuery = search ? `%${search}%` : '%'

    client
      .request(GET_DEPARTMENTS_QUERY, {
        structureId,
        search: searchQuery,
        limit: 50, // Increased limit to get more departments
        offset
      })
      .then((response: any) => {
        const departmentsData = response?.OrganizationalUnit || []
        const departmentOptions = departmentsData.map((dept: any) => ({
          id: dept.id,
          name: dept.name || ''
        }))

        setDepartments(departmentOptions)
      })
      .catch((err: any) => {
        console.error('Error fetching departments:', err)
        setError(err)
        setDepartments([])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [enabled, search, offset, client, structureId])

  return { departments, loading, error }
}
