import { useEffect, useState, useCallback } from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

export interface EmployeeTerminationData {
  id: string
  firstName: string
  lastName: string
  pictureThumbnail?: string
  employeePosition?: {
    exitDate?: string | null
    activeTo?: string | null
    jobPosition?: {
      name: string
      activeTo?: string | null
    }
    organizationalUnit?: {
      name: string
    }
  }
}

interface UseEmployeeTerminationDataProps {
  employeeId: string
  accessToken: string
}

export function useEmployeeTerminationData({ employeeId, accessToken }: UseEmployeeTerminationDataProps) {
  const graphqlClient = useGraphqlClient(accessToken)
  const [employee, setEmployee] = useState<EmployeeTerminationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEmployeeData = useCallback(async () => {
    if (!employeeId || !graphqlClient) return
    setLoading(true)
    setError(null)

    const EMPLOYEE_QUERY = `
      query GetEmployeeForTermination($employeeId: uuid!) {
        EmployeePosition(where: { employeeId: { _eq: $employeeId } }) {
          id
          exitDate
          organizationalUnit {
            name
          }
          jobPosition {
            name
            activeTo
          }
          employee {
            id
            firstName
            lastName
            pictureThumbnail
          }
        }
      }
    `

    try {
      const data = await graphqlClient.request(EMPLOYEE_QUERY, { employeeId })
      if (data && data.EmployeePosition && data.EmployeePosition.length > 0) {
        const employeePosition = data.EmployeePosition[0]
        const employeeData: EmployeeTerminationData = {
          id: employeePosition.employee.id,
          firstName: employeePosition.employee.firstName,
          lastName: employeePosition.employee.lastName,
          pictureThumbnail: employeePosition.employee.pictureThumbnail,
          employeePosition: {
            exitDate: employeePosition.exitDate,
            activeTo: employeePosition.jobPosition?.activeTo ?? (employeePosition as any)?.activeTo ?? null,
            jobPosition: {
              name: employeePosition.jobPosition?.name,
              activeTo: employeePosition.jobPosition?.activeTo
            },
            organizationalUnit: {
              name: employeePosition.organizationalUnit?.name
            }
          }
        }
        setEmployee(employeeData)
      } else {
        setEmployee(null)
        setError(
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:employee_termination.no_data_found_text',
            'No employee data found'
          )
        )
      }
    } catch (err) {
      console.error('Error fetching employee data for termination:', err)
      setError(
        err instanceof Error
          ? err.message
          : getTranslationFromI18nKeyAndLabel(
              'lowcoder:employee_termination.fail_employee_data_load_text',
              'Failed to load employee data'
            )
      )
      setEmployee(null)
    } finally {
      setLoading(false)
    }
  }, [graphqlClient, employeeId])

  useEffect(() => {
    fetchEmployeeData()
  }, [fetchEmployeeData])

  return { employee, loading, error, refetch: fetchEmployeeData }
}
