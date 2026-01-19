import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

export interface SalesManagerEmployee {
  id: string
  firstName: string
  lastName: string
  displayName: string
  pictureThumbnail?: string
}

export const useSalesManagerEmployees = (accessToken: string) => {
  const [salesManagers, setSalesManagers] = useState<SalesManagerEmployee[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const graphQLClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchSalesManagers = async () => {
      if (!accessToken) return

      setLoading(true)
      setError(null)

      try {
        const structureId = getCurrentActiveStructureId()

        // Query to fetch employees with Manager role for approval assignments
        const GET_SALES_MANAGERS = `
              query GetSalesManagers($structureId: uuid!) {
                EmployeeOrganizationalUnit(
                  where: {
                    role: { _eq: "Manager" }
                    structureId: { _eq: $structureId }
                    employee: {
                      isDeleted: { _eq: false }
                    }
                  }
                ) {
                  employee {
                    id
                    firstName
                    lastName
                    displayName
                    pictureThumbnail
                  }
                }
              }
            `

        const result = await graphQLClient.request<{
          EmployeeOrganizationalUnit: { employee: SalesManagerEmployee }[]
        }>(GET_SALES_MANAGERS, {
          structureId
        })

        // Extract employees from the organizational units and sort them
        const employees = (result.EmployeeOrganizationalUnit || [])
          .map(unit => unit.employee)
          .sort((a, b) => {
            const firstNameCompare = a.firstName.localeCompare(b.firstName)
            return firstNameCompare !== 0 ? firstNameCompare : a.lastName.localeCompare(b.lastName)
          })

        setSalesManagers(employees)
      } catch (err) {
        console.error('Error fetching sales managers:', err)
        setError(err instanceof Error ? err.message : 'Failed to load sales managers')
        setSalesManagers([])
      } finally {
        setLoading(false)
      }
    }

    fetchSalesManagers()
  }, [accessToken, graphQLClient])

  return {
    salesManagers,
    loading,
    error
  }
}
