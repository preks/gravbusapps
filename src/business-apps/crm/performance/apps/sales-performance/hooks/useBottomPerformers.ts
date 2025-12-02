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

// Build query using central EMPLOYEE_REF fragment
const buildBottomPerformersQuery = (selectedCurrencyId?: string): string => {
  const currencyFilter = selectedCurrencyId ? `currencyRef: {_eq: "${selectedCurrencyId}"}` : ''
  const baseWhere = `isDeleted: {_eq: false}${currencyFilter ? '\n        ' + currencyFilter : ''}`

  return `
  query GetBottomPerformers {
    Opportunity(
      where: {
        ${baseWhere}
        opportunityStatus: {code: {_eq: "WON"}}
        ownerEmployeeId: {_isNull: false}
        estimatedAmount: {_isNull: false}
      }
    ) {
      id
      estimatedAmount
      currencyRef
      ownerEmployeeId
      ownerEmployee {
        ${EMPLOYEE_REF}
      }
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

interface OpportunityWithEmployee {
  id: string
  estimatedAmount: number
  currencyRef: string
  ownerEmployeeId: string
  ownerEmployee: EmployeeRef
}

/**
 * Hook to fetch bottom 5 individual performers (employees) by revenue generated
 * These are employees that need attention - lowest revenue
 * Revenue is calculated from opportunities with status WON
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
      const query = buildBottomPerformersQuery(selectedCurrencyId)

      const result = await graphqlClient.request<{
        Opportunity: OpportunityWithEmployee[]
      }>(query)

      const opportunities = result.Opportunity || []

      // Aggregate by employee
      const performerMap = new Map<string, TopPerformer>()

      opportunities.forEach(opp => {
        const employee = opp.ownerEmployee
        if (!employee) return

        const existing = performerMap.get(employee.id)
        const currencyCode = opp.currencyRef?.split(':').pop() || 'EUR'

        if (existing) {
          existing.revenue += opp.estimatedAmount
          existing.dealsWon += 1
        } else {
          performerMap.set(employee.id, {
            id: employee.id,
            name: employee.fullName || `${employee.firstName} ${employee.lastName}`,
            displayName: employee.displayName || employee.fullName || `${employee.firstName} ${employee.lastName}`,
            picture: employee.picture || undefined,
            pictureThumbnail: employee.pictureThumbnail || undefined,
            revenue: opp.estimatedAmount,
            dealsWon: 1,
            currencyCode
          })
        }
      })

      // Sort by revenue ASCENDING (lowest first) and take bottom performers
      const sortedPerformers = Array.from(performerMap.values())
        .sort((a, b) => a.revenue - b.revenue)
        .slice(0, limit)

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
