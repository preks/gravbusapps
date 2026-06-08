import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { type TopPerformer } from '../types'

interface UseBottomPerformersResult {
  bottomPerformers: TopPerformer[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

// Sales Associate capability name for filtering
const SALES_ASSOCIATE_CAPABILITY = 'Sales Associate'

// Query to get all employees with Sales Associate capability
const buildSalesAssociateEmployeesQuery = (): string => `
  query GetSalesAssociateEmployees {
    Employee(
      where: {
        isDeleted: {_eq: false}
        employeePosition: {
          employeeCapabilities: {
            capability: {
              name: {_eq: "${SALES_ASSOCIATE_CAPABILITY}"}
            }
          }
        }
      }
    ) {
      ${EMPLOYEE_REF}
    }
  }
`

// Query to get WON opportunities for specific employees
const buildOpportunitiesForEmployeesQuery = (selectedCurrencyId?: string): string => {
  const currencyFilter = selectedCurrencyId ? `currencyRef: {_eq: "${selectedCurrencyId}"}` : ''
  const baseWhere = `isDeleted: {_eq: false}${currencyFilter ? '\n        ' + currencyFilter : ''}`

  return `
  query GetWonOpportunitiesForEmployees($employeeIds: [uuid!]!) {
    Opportunity(
      where: {
        ${baseWhere}
        opportunityStatus: {code: {_eq: "WON"}}
        ownerEmployeeId: {_in: $employeeIds}
        estimatedAmount: {_isNull: false}
      }
    ) {
      id
      estimatedAmount
      currencyRef
      ownerEmployeeId
    }
  }
`
}

interface EmployeeRef {
  id: string
  code: string
  firstName: string
  lastName: string
  displayName: string
  fullName: string
  picture: string | null
  pictureThumbnail: string | null
  employeePosition: Array<{
    jobPosition: { name: string } | null
    organizationalUnit: { id: string; name: string } | null
  }>
}

interface OpportunityData {
  id: string
  estimatedAmount: number
  currencyRef: string
  ownerEmployeeId: string
}

/**
 * Hook to fetch bottom 5 individual performers (employees) by revenue generated
 * These are employees that need attention - lowest revenue (including €0)
 * Revenue is calculated from opportunities with status WON
 * Includes ALL Sales Associate employees, even those with no WON opportunities
 *
 * @param accessToken - The access token for API authentication
 * @param limit - Maximum number of performers to return
 * @param selectedCurrencyId - Optional currency ID to filter by (e.g., "Currency:v1:EUR")
 */
export const useBottomPerformers = (
  accessToken: string,
  limit: number = 5,
  selectedCurrencyId?: string
): UseBottomPerformersResult => {
  const [bottomPerformers, setBottomPerformers] = useState<TopPerformer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchBottomPerformers = useCallback(async () => {
    if (!accessToken) {
      setError('Access token is required')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Step 1: Get all Sales Associate employees
      const employeesQuery = buildSalesAssociateEmployeesQuery()
      const employeesResult = await graphqlClient.request<{
        Employee: EmployeeRef[]
      }>(employeesQuery)

      const employees = employeesResult.Employee || []

      if (employees.length === 0) {
        setBottomPerformers([])
        setIsLoading(false)
        return
      }

      // Step 2: Get WON opportunities for these employees
      const employeeIds = employees.map(emp => emp.id)
      const opportunitiesQuery = buildOpportunitiesForEmployeesQuery(selectedCurrencyId)
      const opportunitiesResult = await graphqlClient.request<{
        Opportunity: OpportunityData[]
      }>(opportunitiesQuery, { employeeIds })

      const opportunities = opportunitiesResult.Opportunity || []

      // Create a map of employee revenue
      const employeeRevenue = new Map<string, { revenue: number; opportunitiesWon: number; currencyCode: string }>()
      opportunities.forEach(opp => {
        const existing = employeeRevenue.get(opp.ownerEmployeeId)
        const currencyCode = opp.currencyRef?.split(':').pop() || 'EUR'

        if (existing) {
          existing.revenue += opp.estimatedAmount
          existing.opportunitiesWon += 1
        } else {
          employeeRevenue.set(opp.ownerEmployeeId, {
            revenue: opp.estimatedAmount,
            opportunitiesWon: 1,
            currencyCode
          })
        }
      })

      // Build performer list including ALL employees (even €0 revenue)
      const defaultCurrencyCode = selectedCurrencyId?.split(':').pop() || 'EUR'
      const allPerformers: TopPerformer[] = employees.map(employee => {
        const revenueData = employeeRevenue.get(employee.id)

        return {
          id: employee.id,
          name: employee.fullName || `${employee.firstName} ${employee.lastName}`,
          displayName: employee.displayName || employee.fullName || `${employee.firstName} ${employee.lastName}`,
          picture: employee.picture || undefined,
          pictureThumbnail: employee.pictureThumbnail || undefined,
          revenue: revenueData?.revenue || 0,
          opportunitiesWon: revenueData?.opportunitiesWon || 0,
          currencyCode: revenueData?.currencyCode || defaultCurrencyCode
        }
      })

      // Sort by revenue ASCENDING (lowest first) and take bottom performers
      const sortedPerformers = allPerformers.sort((a, b) => a.revenue - b.revenue).slice(0, limit)

      setBottomPerformers(sortedPerformers)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch bottom performers'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, graphqlClient, limit, selectedCurrencyId])

  useEffect(() => {
    void fetchBottomPerformers()
  }, [fetchBottomPerformers])

  return {
    bottomPerformers,
    isLoading,
    error,
    refetch: () => void fetchBottomPerformers()
  }
}
