/**
 * Utility for resolving employee information
 */

import { GraphQLClient } from '@/common/network/graphql/GraphQLClient'

export interface EmployeeInfo {
  employeeId: string
  displayName: string
  firstName: string
  lastName: string
}

const GET_EMPLOYEES_BY_IDS = (): string => {
  return `
    query GetEmployeesByIds($employeeIds: [uuid!]!) {
      EmployeePosition(
        where: { employeeId: { _in: $employeeIds } }
      ) {
        employeeId
        firstName
        lastName
        employee {
          displayName
        }
      }
    }
  `
}

interface EmployeePositionData {
  employeeId: string
  firstName: string
  lastName: string
  employee: {
    displayName: string
  }
}

interface EmployeesByIdsResponse {
  EmployeePosition: EmployeePositionData[]
}

/**
 * Fetch employee information for multiple employee IDs
 */
export const fetchEmployeesByIds = async (
  employeeIds: string[],
  graphqlClient: GraphQLClient | null
): Promise<Map<string, EmployeeInfo>> => {
  const employeeMap = new Map<string, EmployeeInfo>()

  if (employeeIds.length === 0 || !graphqlClient) {
    return employeeMap
  }

  try {
    const query = GET_EMPLOYEES_BY_IDS()
    const result = await graphqlClient.request<EmployeesByIdsResponse>(query, { employeeIds })

    result.EmployeePosition.forEach(emp => {
      employeeMap.set(emp.employeeId, {
        employeeId: emp.employeeId,
        displayName: emp.employee?.displayName || `${emp.firstName} ${emp.lastName}`,
        firstName: emp.firstName,
        lastName: emp.lastName
      })
    })
  } catch (err) {
    console.error('Error fetching employees:', err)
  }

  return employeeMap
}

/**
 * Resolve a single employee ID to a display name
 */
export const resolveEmployeeName = (employeeId: string, employeeMap: Map<string, EmployeeInfo>): string => {
  const employee = employeeMap.get(employeeId)
  return employee?.displayName || employeeId
}
