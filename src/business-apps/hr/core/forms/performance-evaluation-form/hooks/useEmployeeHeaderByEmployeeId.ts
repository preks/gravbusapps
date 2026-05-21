import { useCallback, useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { EmployeeOption } from '../types'

interface EmployeeHeaderPosition {
  employeeId: string
  firstName: string | null
  lastName: string | null
  employee: {
    id: string
    displayName: string | null
    pictureThumbnail: string | null
  } | null
  jobPosition: {
    name: string | null
  } | null
  organizationalUnit: {
    name: string | null
  } | null
}

interface EmployeeHeaderResponse {
  EmployeePosition: EmployeeHeaderPosition[]
}

interface UseEmployeeHeaderByEmployeeIdProps {
  accessToken: string
  employeeId?: string | null
}

interface UseEmployeeHeaderByEmployeeIdReturn {
  employee: EmployeeOption | null
  loading: boolean
  error: string | null
  fetchEmployee: (employeeId: string) => Promise<void>
}

const GET_EMPLOYEE_HEADER_BY_EMPLOYEE_ID = `
  query GetEmployeeHeaderByEmployeeId($employeeId: uuid!) {
    EmployeePosition(
      where: { employeeId: { _eq: $employeeId } }
      limit: 1
    ) {
      employeeId
      firstName
      lastName
      employee {
        id
        displayName
        pictureThumbnail
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

const toEmployeeOption = (position: EmployeeHeaderPosition): EmployeeOption => {
  const fullName = `${position.firstName ?? ''} ${position.lastName ?? ''}`.trim()

  return {
    id: position.employee?.id ?? position.employeeId,
    name: position.employee?.displayName || fullName,
    jobTitle: position.jobPosition?.name ?? undefined,
    department: position.organizationalUnit?.name ?? undefined,
    pictureThumbnail: position.employee?.pictureThumbnail ?? undefined
  }
}

export const useEmployeeHeaderByEmployeeId = ({
  accessToken,
  employeeId
}: UseEmployeeHeaderByEmployeeIdProps): UseEmployeeHeaderByEmployeeIdReturn => {
  const [employee, setEmployee] = useState<EmployeeOption | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchEmployee = useCallback(
    async (targetEmployeeId: string) => {
      if (!accessToken || !targetEmployeeId) {
        return
      }

      setLoading(true)
      setError(null)

      try {
        const result = await graphqlClient.request<EmployeeHeaderResponse>(GET_EMPLOYEE_HEADER_BY_EMPLOYEE_ID, {
          employeeId: targetEmployeeId
        })
        const employeePosition = result.EmployeePosition?.[0]

        if (employeePosition) {
          setEmployee(toEmployeeOption(employeePosition))
          return
        }

        setEmployee(null)
        setError(`Employee with ID ${targetEmployeeId} not found`)
      } catch (err) {
        setEmployee(null)
        setError(err instanceof Error ? err.message : 'Failed to fetch employee')
      } finally {
        setLoading(false)
      }
    },
    [accessToken, graphqlClient]
  )

  useEffect(() => {
    if (employeeId) {
      fetchEmployee(employeeId)
      return
    }

    setEmployee(null)
    setError(null)
    setLoading(false)
  }, [employeeId, fetchEmployee])

  return {
    employee,
    loading,
    error,
    fetchEmployee
  }
}
