import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { EmployeeRef } from '@/common/data/employee/types/employeeBaseTypes'

interface UseEmployeePopoverDataProps {
  employeeId?: string
  accessToken: string
}

interface UseEmployeePopoverDataReturn {
  employee: EmployeeRef | null
  loading: boolean
  error: string | null
}

const GET_EMPLOYEE_POPOVER_DATA = `
  query GetEmployeePopoverData($employeeId: uuid!) {
    Employee(where: { id: { _eq: $employeeId } }, limit: 1) {
      id
      code
      firstName
      lastName
      displayName
      picture
      employeePosition {
        jobPosition {
          name
        }
        organizationalUnit {
          name
        }
      }
      communication(where: {_and: [{isDeleted: {_eq: false}}, {purpose: {_eq: "INTERNAL"}}]}) {
        purpose
        channel {
          value
          code
        }
        value
        type {
          value
        }
      }
    }
  }
`

export const useEmployeePopoverData = ({
  employeeId,
  accessToken
}: UseEmployeePopoverDataProps): UseEmployeePopoverDataReturn => {
  const [employee, setEmployee] = useState<EmployeeRef | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    if (!employeeId || !accessToken || !graphqlClient) {
      setEmployee(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    graphqlClient
      .request<{ Employee: EmployeeRef[] }>(GET_EMPLOYEE_POPOVER_DATA, { employeeId })
      .then(result => {
        const employeeData = result.Employee?.[0] || null
        setEmployee(employeeData)
        if (!employeeData) {
          setError(`Employee with ID ${employeeId} not found`)
        }
      })
      .catch(err => {
        console.error('Error fetching employee popover data:', err)
        setError(err.message || 'Failed to fetch employee')
        setEmployee(null)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [employeeId, accessToken, graphqlClient])

  return { employee, loading, error }
}
