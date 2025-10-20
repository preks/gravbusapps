import { useEffect, useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

export interface EmployeeData {
  id: string
  firstName: string
  lastName: string
  pictureThumbnail?: string
  employeePosition?: {
    jobPosition?: {
      name: string
    }
    organizationalUnit?: {
      name: string
    }
  }
}

interface UseGetEmployeeDataProps {
  employeeId?: string
  accessToken: string
}

export function useGetEmployeeData({ employeeId, accessToken }: UseGetEmployeeDataProps) {
  const client = useGraphqlClient(accessToken)
  const [employee, setEmployee] = useState<EmployeeData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!employeeId || !client) return
    setLoading(true)
    setError(null)

    const EMPLOYEE_QUERY = `
      query GetEmployee($employeeId: uuid!) {
        Employee(where: { id: { _eq: $employeeId } }) {
          id
          firstName
          lastName
          pictureThumbnail
          employeePosition {
            jobPosition {
              name
            }
            organizationalUnit {
              name
            }
          }
        }
      }
    `

    client
      .request(EMPLOYEE_QUERY, { employeeId })
      .then((data: any) => {
        if (data && data.Employee && data.Employee.length > 0) {
          setEmployee(data.Employee[0])
        } else {
          setEmployee(null)
        }
      })
      .catch(err => {
        setError(err as Error)
        setEmployee(null)
      })
      .finally(() => setLoading(false))
  }, [client, employeeId])

  return { employee, loading, error }
}
