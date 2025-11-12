import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

export interface EmployeeOption {
  id: string
  name: string
  jobTitle?: string
  department?: string
  pictureThumbnail?: string
  userId?: string
}

const GET_EMPLOYEES = `
  query GetStructureEmployees($structureId: uuid!, $search: String, $limit: Int) {
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
      id
      employeeId
      firstName
      lastName
      employee {
        id
        displayName
        pictureThumbnail
        userId
      }
      jobPosition {
        name
      }
      organizationalUnit {
        name
      }
    }
  }
`

export const useEmployeeSearch = (accessToken: string) => {
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const searchEmployees = useCallback(
    async (search?: string) => {
      if (!accessToken) {
        console.log('useEmployeeSearch: No access token')
        return
      }

      const structureId = getCurrentActiveStructureId()

      if (!structureId) {
        setError('No active structure ID available')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const searchPattern = search ? `%${search}%` : '%'

        const result = await graphqlClient.request<any>(GET_EMPLOYEES, {
          structureId,
          search: searchPattern,
          limit: 50
        })

        const employeeOptions: EmployeeOption[] = result.EmployeePosition.map((emp: any) => ({
          id: emp.employeeId,
          name: emp.employee?.displayName || `${emp.firstName} ${emp.lastName}`,
          jobTitle: emp.jobPosition?.name,
          department: emp.organizationalUnit?.name,
          pictureThumbnail: emp.employee?.pictureThumbnail,
          userId: emp.employee?.userId
        }))

        setEmployees(employeeOptions)
      } catch (err) {
        console.error('useEmployeeSearch: Error fetching employees:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch employees')
        setEmployees([])
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken, graphqlClient]
  )

  useEffect(() => {
    searchEmployees()
  }, [searchEmployees])

  return {
    employees,
    isLoading,
    error,
    searchEmployees
  }
}
