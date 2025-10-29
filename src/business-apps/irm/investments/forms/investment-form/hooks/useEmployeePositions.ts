import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { SelectOption } from '../types'

const EMPLOYEES_PER_PAGE = 20

export interface EmployeePositionData {
  id: string
  employeeId: string
  firstName: string | null
  lastName: string | null
  hireDate: string | null
  employee: {
    id: string
    displayName: string | null
    picture: string | null
    pictureThumbnail: string | null
    userId: string | null
  } | null
  jobPosition: {
    id: string
    name: string
    jobFunction: {
      name: string
    } | null
    jobLevel: {
      name: string
    } | null
  } | null
  organizationalUnit: {
    id: string
    name: string
    code: string | null
    description: string
  } | null
}

export interface EmployeePositionResponse {
  EmployeePosition: EmployeePositionData[]
  EmployeePositionAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface EmployeePositionVariables {
  limit?: number
  offset?: number
  search?: string
}

export interface UseEmployeePositionsProps {
  accessToken: string
  search?: string
}

export interface UseEmployeePositionsReturn {
  employeePositions: SelectOption[]
  loading: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => void
  searchEmployees: (search?: string) => void
  retry: () => void
}

export const GET_EMPLOYEE_POSITIONS = (variables: EmployeePositionVariables): string => {
  const searchFilter = variables.search
    ? `, {
        _or: [
          { firstName: { _ilike: "${variables.search}" } }
          { lastName: { _ilike: "${variables.search}" } }
          { employee: { displayName: { _ilike: "${variables.search}" } } }
        ]
      }`
    : ''

  return `
    query GetEmployeePositions {
      EmployeePosition(
        limit: ${variables.limit || EMPLOYEES_PER_PAGE}
        offset: ${variables.offset || 0}
        where: {
          _and: [
            { employee: { isDeleted: { _eq: false } } }${searchFilter}
          ]
        }
        orderBy: [
          { firstName: ASC }
          { lastName: ASC }
        ]
      ) {
        id
        employeeId
        firstName
        lastName
        hireDate
        employee {
          id
          displayName
          picture
          pictureThumbnail
          userId
        }
        jobPosition {
          id
          name
          jobFunction {
            name
          }
          jobLevel {
            name
          }
        }
        organizationalUnit {
          id
          name
          code
          description
        }
      }

      EmployeePositionAggregate(
        where: {
          _and: [
            { employee: { isDeleted: { _eq: false } } }${searchFilter}
          ]
        }
      ) {
        aggregate {
          count
        }
      }
    }
  `
}

/**
 * Custom hook for fetching employee positions with infinite scroll and search functionality
 */
export const useEmployeePositions = ({
  accessToken,
  search
}: UseEmployeePositionsProps): UseEmployeePositionsReturn => {
  const [employeePositions, setEmployeePositions] = useState<EmployeePositionData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [currentSearch, setCurrentSearch] = useState<string | undefined>(search)
  const [initialized, setInitialized] = useState(false)

  const graphqlClient = useGraphQLClient(accessToken)

  // Load more employee positions with proper useCallback
  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !accessToken || !graphqlClient) return

    setLoading(true)
    setError(null)

    try {
      const variables: EmployeePositionVariables = {
        offset,
        limit: EMPLOYEES_PER_PAGE,
        search: currentSearch ? `%${currentSearch}%` : undefined
      }

      const query = GET_EMPLOYEE_POSITIONS(variables)
      const result = await graphqlClient.request<EmployeePositionResponse>(query)

      const newEmployees = result.EmployeePosition || []
      const totalCount = result.EmployeePositionAggregate?.aggregate?.count || 0

      // Validate and filter employee data before setting state
      const validEmployees = newEmployees.filter(emp => {
        if (!emp || !emp.employeeId) {
          console.warn('Invalid employee record found:', emp)
          return false
        }
        return true
      })

      // Append new data for infinite scroll
      setEmployeePositions(prev => (offset === 0 ? validEmployees : [...prev, ...validEmployees]))

      setOffset(prev => prev + EMPLOYEES_PER_PAGE)

      // Set hasMore to false if we got fewer items than requested OR if we've loaded all items
      const hasMoreItems = validEmployees.length === EMPLOYEES_PER_PAGE && offset + EMPLOYEES_PER_PAGE < totalCount
      setHasMore(hasMoreItems)

      // Mark as initialized
      if (!initialized) {
        setInitialized(true)
      }
    } catch (err: any) {
      console.error('Error loading employee positions:', err)
      setError(err.message || 'Failed to load employee positions')
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, accessToken, graphqlClient, offset, currentSearch, initialized])

  // Search employees
  const searchEmployees = useCallback(
    (searchTerm?: string) => {
      // Only reset if search actually changed
      if (currentSearch !== searchTerm) {
        setCurrentSearch(searchTerm)
        setEmployeePositions([])
        setOffset(0)
        setHasMore(true)
        setError(null)
        setInitialized(false)
      }
    },
    [currentSearch]
  )

  // Retry loading
  const retry = useCallback(() => {
    setError(null)
    setHasMore(true)
    loadMore()
  }, [loadMore])

  // Auto-load on mount and when search changes
  useEffect(() => {
    if (accessToken && !initialized) {
      loadMore()
    }
  }, [accessToken, loadMore, initialized])

  // Transform employee data to SelectOption format - filter out any null/invalid records first
  const mappedEmployeePositions: SelectOption[] = employeePositions
    .filter((emp: EmployeePositionData) => emp && emp.employeeId && emp.employee)
    .map((emp: EmployeePositionData) => ({
      id: emp.employeeId,
      value: emp.employeeId,
      label: emp.employee?.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
      name: emp.employee?.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
      extraInfo: {
        picture: emp.employee?.picture || null,
        pictureThumbnail: emp.employee?.pictureThumbnail || null,
        jobPosition: emp.jobPosition?.name || 'No Position',
        organizationalUnit: emp.organizationalUnit?.name || 'No Unit',
        department: emp.organizationalUnit?.name || 'No Department',
        position: emp.jobPosition?.name || 'No Position',
        userId: emp.employee?.userId || null
      }
    }))

  return {
    employeePositions: mappedEmployeePositions,
    loading,
    error,
    hasMore,
    loadMore,
    searchEmployees,
    retry
  }
}
