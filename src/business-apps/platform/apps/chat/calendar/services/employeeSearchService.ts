/**
 * Employee Search Service for Calendar
 * Provides real employee search using GraphQL
 */

import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface CalendarEmployee {
  id: string
  displayName: string
  firstName?: string
  lastName?: string
  userId: string
  pictureThumbnail?: string
  organizationalUnitName?: string
  jobPositionName?: string
}

export interface EmployeeSearchVariables {
  search?: string
  limit?: number
  offset?: number
}

/**
 * GraphQL query for searching employees
 * Note: Employee entity only allows filtering by firstName, lastName, code - NOT email or displayName
 */
export const SEARCH_EMPLOYEES_QUERY = (variables: EmployeeSearchVariables = {}): string => {
  const search = (variables.search || '').trim()
  const limit = Math.min(variables.limit ?? 20, 50)
  const offset = variables.offset ?? 0

  return `
    query SearchEmployeesForCalendar {
      Employee(
        limit: ${limit}
        offset: ${offset}
        orderBy: { firstName: ASC }
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { _or: [
              { firstName: { _ilike: "%${search}%" } }
              { lastName: { _ilike: "%${search}%" } }
              { code: { _ilike: "%${search}%" } }
            ]}
          ]
        }
      ) {
        id
        displayName
        firstName
        lastName
        userId
        pictureThumbnail
        employeePosition {
          jobPosition { name }
          organizationalUnit { name }
        }
      }
    }
  `
}

/**
 * Service class for employee search operations
 */
export class EmployeeSearchService {
  private graphqlClient: ReturnType<typeof useGraphQLClient>

  constructor(accessToken: string) {
    // Note: In actual usage, this should be called within a React component
    // using the useGraphQLClient hook. For the service pattern, we'll create
    // a standalone client.
    this.graphqlClient = {
      request: async <T>(query: string): Promise<T> => {
        const baseUrl = import.meta.env.VITE_GRAPHQL_URL || 'https://newwork-dev.newwork.com/v1/graphql'

        const response = await fetch(baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({ query })
        })

        if (!response.ok) {
          throw new Error(`GraphQL request failed: ${response.status}`)
        }

        const result = await response.json()

        if (result.errors?.length) {
          throw new Error(result.errors[0].message)
        }

        return result.data as T
      }
    } as ReturnType<typeof useGraphQLClient>
  }

  /**
   * Search for employees by name or email
   */
  async searchEmployees(query: string, limit: number = 10): Promise<CalendarEmployee[]> {
    try {
      const graphqlQuery = SEARCH_EMPLOYEES_QUERY({ search: query, limit })
      const result = await this.graphqlClient.request<{ Employee: any[] }>(graphqlQuery)

      return (result.Employee || []).map(e => ({
        id: e.id,
        displayName: e.displayName || `${e.firstName || ''} ${e.lastName || ''}`.trim() || 'Unknown',
        firstName: e.firstName,
        lastName: e.lastName,
        userId: e.userId,
        pictureThumbnail: e.pictureThumbnail,
        organizationalUnitName: e.employeePosition?.organizationalUnit?.name,
        jobPositionName: e.employeePosition?.jobPosition?.name
      }))
    } catch (error) {
      console.error('Error searching employees:', error)
      return []
    }
  }
}

/**
 * Create an employee search service instance
 */
export const createEmployeeSearchService = (accessToken: string): EmployeeSearchService => {
  return new EmployeeSearchService(accessToken)
}
