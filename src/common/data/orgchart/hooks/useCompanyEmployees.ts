/**
 * Company Employees hook - fetch employees for a company with pagination and search
 */
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'

export interface CompanyEmployee {
  id: string
  version?: number
  employeeId?: string
  companyId?: string
  employee?: Employee
  createdAt?: string
  updatedAt?: string
}

export interface UseCompanyEmployeesResult {
  employees: CompanyEmployee[]
  total: number
  loading: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => void
  retry: () => void
}

/**
 * Hook for fetching company employees with infinite scroll pagination
 *
 * @param accessToken - Access token for authentication
 * @param companyId - Company ID to fetch employees for
 * @param initialLimit - Initial page size (default: 20)
 * @param search - Search query
 * @param orderBy - Sort order
 *
 * @example
 * const { employees, hasMore, loadMore, loading, error } = useCompanyEmployees(
 *   accessToken,
 *   companyId,
 *   20,
 *   searchTerm
 * )
 */
export function useCompanyEmployees(
  accessToken: string,
  companyId: string,
  initialLimit: number = 20,
  search?: string,
  orderBy?: Array<{ field: string; direction: 'ASC' | 'DESC' | 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST' }>
): UseCompanyEmployeesResult {
  const [allEmployees, setAllEmployees] = useState<CompanyEmployee[]>([])
  const [currentOffset, setCurrentOffset] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const graphqlClient = useGraphQLClient(accessToken)

  const loadEmployees = useCallback(
    async (offset: number, append: boolean = false) => {
      if (!companyId || !accessToken) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // Build where condition
        const whereConditions: any[] = [{ companyId: { _eq: companyId } }]

        // Add search condition if provided
        if (search?.trim()) {
          const searchPattern = { _ilike: `%${search.trim()}%` }
          whereConditions.push({
            _or: [
              { employee: { firstName: searchPattern } },
              { employee: { lastName: searchPattern } },
              { employee: { displayName: searchPattern } },
              { employee: { email: searchPattern } }
            ]
          })
        }

        const whereObj = whereConditions.length > 1 ? { _and: whereConditions } : whereConditions[0]

        // Build orderBy
        const orderByArray =
          orderBy && orderBy.length > 0
            ? orderBy.map(ob => {
                if (ob.field.startsWith('employee.')) {
                  const employeeField = ob.field.replace('employee.', '')
                  return {
                    employee: {
                      [employeeField]: ob.direction
                    }
                  }
                }
                return { [ob.field]: ob.direction }
              })
            : [{ employee: { displayName: 'ASC' } }]

        const graphQLVariables: Record<string, any> = {
          limit: initialLimit,
          offset,
          where: whereObj,
          orderBy: orderByArray
        }

        const query = `
          query GetCompanyEmployees(
            $limit: Int
            $offset: Int
            $where: EmployeeCompanyBoolExp
            $orderBy: [EmployeeCompanyOrderBy!]
          ) {
            EmployeeCompany(
              limit: $limit
              offset: $offset
              orderBy: $orderBy
              where: $where
            ) {
              id
              version
              employeeId
              companyId
              createdAt
              updatedAt
              employee {
                ${EMPLOYEE_REF}
              }
            }
            
            EmployeeCompanyAggregate(where: $where) {
              aggregate {
                count
              }
            }
          }
        `

        const result = await graphqlClient.request<{
          EmployeeCompany: CompanyEmployee[]
          EmployeeCompanyAggregate: {
            aggregate: {
              count: number
            }
          }
        }>(query, graphQLVariables)

        const newEmployees = result.EmployeeCompany || []
        const total = result.EmployeeCompanyAggregate?.aggregate?.count || 0

        if (append) {
          setAllEmployees(prev => [...prev, ...newEmployees])
        } else {
          setAllEmployees(newEmployees)
        }

        setHasMore(offset + newEmployees.length < total)
        setIsLoading(false)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch company employees'
        console.error('Error fetching company employees:', err)
        setError(errorMessage)
        setIsLoading(false)
      }
    },
    [accessToken, companyId, graphqlClient, initialLimit, search, orderBy]
  )

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      const nextOffset = currentOffset + initialLimit
      setCurrentOffset(nextOffset)
      loadEmployees(nextOffset, true)
    }
  }, [isLoading, hasMore, currentOffset, initialLimit, loadEmployees])

  const retry = useCallback(() => {
    setCurrentOffset(0)
    setAllEmployees([])
    loadEmployees(0, false)
  }, [loadEmployees])

  // Initial load and when dependencies change
  useEffect(() => {
    setCurrentOffset(0)
    setAllEmployees([])
    setHasMore(true)
    loadEmployees(0, false)
  }, [companyId, search, JSON.stringify(orderBy), accessToken]) // Use JSON.stringify for orderBy to prevent unnecessary re-renders

  return {
    employees: allEmployees,
    total: allEmployees.length,
    loading: isLoading,
    error,
    hasMore,
    loadMore,
    retry
  }
}
