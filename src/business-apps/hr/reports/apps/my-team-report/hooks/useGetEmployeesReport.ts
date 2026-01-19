import { useEffect, useState, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface CatalogEntry {
  value: string
  objectValue?: any
  translations?: Array<{
    id?: string
    value: string
    objectValue?: any
    localeCode: string
  }>
}

export interface Employee {
  startDate?: string
  exitDate?: string | null
  tenure?: string
  id: string
  userId?: string
  firstName: string
  lastName: string
  jobPosition: string
  location: string
  locationDetails?: {
    id?: string
  }
  email: string
  profilePicture: string
  employmentType?: CatalogEntry
  contractType?: CatalogEntry
}

export interface EmployeeWorkingCondition {
  id: string
  employeeId: string
  hireDate?: string | null
  exitDate?: string | null
  probationEnd?: string | null
  contractType?: {
    id: string
    value: string
  }
  employmentType?: {
    id: string
    value: string
  }
}

const EMPLOYEE_POSITION_QUERY = `
    query EmployeePositions($limit: Int!, $supervisorId: uuid!) {
    EmployeePosition(
      limit: $limit,
      orderBy: [{ firstName: ASC }, { lastName: ASC }],
      where: {
        _and: [
          { jobPositionId: { _isNull: false } },
          { employeeId: { _isNull: false } },
          { supervisor: { id: { _eq: $supervisorId } } }
        ]
      }
    ) {
      employeeId
      userId
      supervisor {
        id
        firstName
        lastName
      }
      firstName
      lastName
      jobPosition {
        name
      }
      siteLocation {
        name
        id
      }
      organizationalUnit {
        name
        id
      }
      employee {
        id
        pictureThumbnail
        workingCondition {
          id
          contractType {
            id
            value
            objectValue
          	translations {
              value
              localeCode
          	}
          }
          employmentType {
            id
            value
            objectValue
            translations {
              value
              localeCode
          	}
          }
          hireDate
          exitDate
          probationEnd
        }
      }
    }
  }
`

function calculateTenure(startDate: string | undefined, exitDate: string | null | undefined): string {
  if (!startDate) return ''

  const start = new Date(startDate)
  const end = exitDate ? new Date(exitDate) : new Date()

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return ''

  let years = end.getFullYear() - start.getFullYear()
  let months = end.getMonth() - start.getMonth()

  if (months < 0) {
    years--
    months += 12
  }

  let result = ''

  if (years > 0) {
    result += `${years} ${years === 1 ? 'year' : 'years'}`
  }

  if (months > 0) {
    if (result) result += ', '
    result += `${months} ${months === 1 ? 'month' : 'months'}`
  }

  if (!result) {
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    result = `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`
  }

  return result
}

export function useGetEmployeesReport({
  accessToken,
  userInfo
}: Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'>) {
  const ALL_EMPLOYEES_LIMIT = 10000
  const client = useGraphqlClient(accessToken)
  const supervisorEmployeeId = userInfo?.employeeDetails?.employeeId

  const [employees, setEmployees] = useState<Employee[]>([])
  const [workingConditions, setWorkingConditions] = useState<EmployeeWorkingCondition[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchEmployees = useCallback(() => {
    if (typeof window === 'undefined' || !client || !supervisorEmployeeId) return

    setLoading(true)
    setError(null)

    const variables = {
      limit: ALL_EMPLOYEES_LIMIT,
      supervisorId: supervisorEmployeeId
    }

    client
      .request?.(EMPLOYEE_POSITION_QUERY, variables)
      .then((res: any) => {
        if (!res) {
          throw new Error('No response from GraphQL query')
        }
        const employeePositions = res.EmployeePosition ?? []

        const newEmployees = employeePositions.map((ep: any) => {
          const workingCondition = ep.employee?.workingCondition?.[0]
          const startDate = workingCondition?.hireDate ?? ''
          const exitDate = workingCondition?.exitDate ?? null

          return {
            id: ep.employeeId,
            userId: ep.userId,
            supervisor: ep.supervisor,
            firstName: ep.firstName,
            lastName: ep.lastName,
            jobPosition: ep.jobPosition?.name ?? '',
            location: ep.siteLocation?.name || ep.organizationalUnit?.name || '',
            locationDetails: {
              id: ep.siteLocation?.id
            },
            email: '',
            employmentType: workingCondition?.employmentType || undefined,
            contractType: workingCondition?.contractType || undefined,
            profilePicture: ep.employee?.pictureThumbnail ?? '',
            startDate,
            exitDate,
            tenure: calculateTenure(startDate, exitDate)
          }
        })

        const newWorkingConditions: EmployeeWorkingCondition[] = employeePositions
          .filter((ep: any) => ep.employee?.workingCondition?.[0])
          .map((ep: any) => {
            const wc = ep.employee.workingCondition[0]
            return {
              id: wc.id || '',
              employeeId: ep.employeeId,
              hireDate: wc.hireDate,
              exitDate: wc.exitDate,
              probationEnd: wc.probationEnd,
              contractType: wc.contractType ? { id: wc.contractType.id, value: wc.contractType.value } : undefined,
              employmentType: wc.employmentType
                ? { id: wc.employmentType.id, value: wc.employmentType.value }
                : undefined
            }
          })

        setEmployees(newEmployees)
        setWorkingConditions(newWorkingConditions)
      })
      .catch((err: any) => {
        setError(err)
        setEmployees([])
        setWorkingConditions([])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [client, supervisorEmployeeId])

  useEffect(() => {
    if (accessToken && supervisorEmployeeId) {
      fetchEmployees()
    }
  }, [accessToken, supervisorEmployeeId, fetchEmployees])

  const retry = useCallback(() => {
    fetchEmployees()
  }, [fetchEmployees])

  return { employees, workingConditions, loading, error, retry }
}
