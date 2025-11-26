import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

const EMPLOYEE_BY_ID_QUERY = `
query employeeById($id: uuid) {
  Employee(where: {id: {_eq: $id}}) {
    id
    firstName
    lastName
    pictureThumbnail
    employeePosition {
      jobPosition {
        name
      }
      supervisorEmployee {
        id
        firstName
        lastName
        pictureThumbnail
        employeePosition {
          jobPosition {
            name
          }
        }
      }
    }
  }
}
`

type EmployeeWithSupervisorInfo = {
  id: string
  firstName: string
  lastName: string
  pictureThumbnail: string | null
  employeePosition: {
    jobPosition: {
      name: string
    } | null
    supervisorEmployee: {
      id: string
      firstName: string
      lastName: string
      pictureThumbnail: string | null
      employeePosition: {
        jobPosition: {
          name: string
        }
      }
    } | null
  }
}

type EmployeeResponse = {
  Employee: EmployeeWithSupervisorInfo[]
}

type Employee = {
  id: string
  firstName: string
  lastName: string
  pictureThumbnail: string | null
  jobPositionName: string | null
  profileUrl: string
}

const loadingState = {
  state: 'loading'
} as const

type ErrorState = {
  state: 'error'
  message: string
}

type SuccessState = {
  state: 'success'
  employee: Employee
  manager: Employee | null
}

type EmployeeDetailsState = typeof loadingState | ErrorState | SuccessState

const idToProfileUrl = (id: string) => `/platform/employee-record?tab=summary&employeeId=${id}`

export function useEmployeeDetails(employeeId: string, accessToken: string) {
  const [state, setState] = useState<EmployeeDetailsState>(loadingState)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    async function fetchData() {
      setState(loadingState)
      try {
        const empRes = (await graphqlClient.request(EMPLOYEE_BY_ID_QUERY, { id: employeeId })) as EmployeeResponse
        const employees = empRes?.Employee
        if (!Array.isArray(employees) || employees.length === 0 || !employees[0]) {
          throw new Error('Employee not found.')
        }
        const employeeWithSupervisor = employees[0]

        const employee = {
          id: employeeWithSupervisor.id,
          firstName: employeeWithSupervisor.firstName,
          lastName: employeeWithSupervisor.lastName,
          pictureThumbnail: employeeWithSupervisor.pictureThumbnail,
          jobPositionName: employeeWithSupervisor.employeePosition?.jobPosition?.name || null,
          profileUrl: idToProfileUrl(employeeId)
        }

        const managerInfo = employeeWithSupervisor.employeePosition?.supervisorEmployee
        const manager = managerInfo
          ? {
              id: managerInfo.id,
              firstName: managerInfo.firstName,
              lastName: managerInfo.lastName,
              pictureThumbnail: managerInfo.pictureThumbnail,
              jobPositionName: managerInfo.employeePosition?.jobPosition?.name,
              profileUrl: idToProfileUrl(managerInfo.id)
            }
          : null

        setState({
          state: 'success',
          employee: employee,
          manager: manager
        })
      } catch {
        setState({ state: 'error', message: 'Error fetching employee details.' })
      }
    }
    if (employeeId && accessToken) {
      fetchData()
    }
  }, [employeeId, accessToken, graphqlClient])

  return { state }
}
