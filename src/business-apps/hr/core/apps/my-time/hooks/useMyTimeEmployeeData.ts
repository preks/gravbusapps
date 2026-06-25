import { useEffect, useCallback, useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

export interface MyTimeWorkingCondition {
  hireDate: string
  activeFrom?: string | null
  activeTo?: string | null
  contractType?: {
    objectValue?: Record<string, unknown> | null
  }
}

export interface MyTimeWorkingHours {
  activeFrom?: string | null
  activeTo?: string | null
  mondayHours?: number
  tuesdayHours?: number
  wednesdayHours?: number
  thursdayHours?: number
  fridayHours?: number
  saturdayHours?: number
  sundayHours?: number
}

export interface MyTimeEmployee {
  id: string
  code: string
  firstName: string
  lastName: string
  workingCondition: MyTimeWorkingCondition[]
  workingHours: MyTimeWorkingHours[]
}

interface MyTimeEmployeeData {
  EmployeePosition: {
    employee: MyTimeEmployee
  }[]
}

const GET_MY_TIME_EMPLOYEE_DATA = `
  query GetMyTimeEmployeeData($employeeId: uuid!) {
    EmployeePosition(where: { employeeId: { _eq: $employeeId } }) {
      employee {
        id
        code
        firstName
        lastName
        workingCondition(
          where: { isDeleted: { _eq: false } }
          orderBy: [{ activeFrom: ASC }, { createdAt: ASC }]
        ) {
          hireDate
          activeFrom
          activeTo
          contractType {
            objectValue
          }
        }
        workingHours(
          where: { isDeleted: { _eq: false } }
          orderBy: [{ activeFrom: ASC }, { createdAt: ASC }]
        ) {
          activeFrom
          activeTo
          mondayHours
          tuesdayHours
          wednesdayHours
          thursdayHours
          fridayHours
          saturdayHours
          sundayHours
        }
      }
    }
  }
`

export const useMyTimeEmployeeData = (accessToken: string, employeeId: string) => {
  const client = useGraphqlClient(accessToken)
  const [employee, setEmployee] = useState<MyTimeEmployee | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    if (!accessToken || !employeeId) {
      setEmployee(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const result = await client.request<MyTimeEmployeeData>(GET_MY_TIME_EMPLOYEE_DATA, { employeeId })
      setEmployee(result?.EmployeePosition?.[0]?.employee ?? null)
    } catch {
      setEmployee(null)
    } finally {
      setLoading(false)
    }
  }, [accessToken, client, employeeId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { employee, loading }
}
