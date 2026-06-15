import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { type TopPerformer } from '../types'
import { type SalesAssociateEmployee } from './salesAssociateEmployees'
import { type MemberRevenueMap } from './teamsWithMembers'

interface UseEmployeeRevenuesResult {
  // Per-employee revenue rows for the performer cards (includes zero-win employees)
  employeeRevenues: TopPerformer[]
  // Same data keyed by employeeId, for rolling up team totals without an extra query
  revenueByEmployeeId: MemberRevenueMap
  isLoading: boolean
  error: string | null
  refetch: () => void
}

// Build a single batched request with one aliased aggregate per employee.
// Each alias sums estimatedAmount of WON opportunities owned by that employee.
const buildEmployeeRevenuesQuery = (employeeIds: string[], selectedCurrencyId?: string): string => {
  const currencyFilter = selectedCurrencyId ? `\n          currencyRef: {_eq: "${selectedCurrencyId}"}` : ''

  const aggregates = employeeIds
    .map(
      (employeeId, index) => `
    e${index}: OpportunityAggregate(
      where: {
        isDeleted: {_eq: false}
        opportunityStatus: {code: {_eq: "WON"}}
        estimatedAmount: {_isNull: false}
        ownerEmployeeId: {_eq: "${employeeId}"}${currencyFilter}
      }
    ) {
      aggregate {
        count
        sum { estimatedAmount }
        max { currencyRef }
      }
    }
  `
    )
    .join('\n')

  return `
  query GetEmployeeRevenues {
    ${aggregates}
  }
`
}

interface AggregateResult {
  aggregate: {
    count: number
    sum: { estimatedAmount: number | null } | null
    max: { currencyRef: string | null } | null
  } | null
}

/**
 * Fetches per-employee WON revenue for the provided Sales Associates in a single
 * batched aggregate request (one aliased aggregate per employee). Returns an entry
 * for every employee (including those with zero wins), so the result can feed the
 * Top Individual Performers and Employees Needing Attention cards, plus a map keyed
 * by employeeId that the team cards reuse to roll up per-team totals.
 *
 * @param accessToken - The access token for API authentication
 * @param employees - Sales Associate employees to compute revenue for
 * @param selectedCurrencyId - Optional currency ID to filter by (e.g., "Currency:v1:EUR")
 */
export const useEmployeeRevenues = (
  accessToken: string,
  employees: SalesAssociateEmployee[],
  selectedCurrencyId?: string
): UseEmployeeRevenuesResult => {
  const [employeeRevenues, setEmployeeRevenues] = useState<TopPerformer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchEmployeeRevenues = useCallback(async () => {
    if (!accessToken) {
      setError('Access token is required')
      setIsLoading(false)
      return
    }

    if (employees.length === 0) {
      setEmployeeRevenues([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const aggregatesResult = await graphqlClient.request<Record<string, AggregateResult>>(
        buildEmployeeRevenuesQuery(
          employees.map(employee => employee.id),
          selectedCurrencyId
        )
      )

      const fallbackCurrencyCode = selectedCurrencyId?.split(':').pop() || 'EUR'

      const revenues: TopPerformer[] = employees.map((employee, index) => {
        const aggregate = aggregatesResult[`e${index}`]?.aggregate
        const revenue = aggregate?.sum?.estimatedAmount ?? 0
        const opportunitiesWon = aggregate?.count ?? 0
        const currencyCode = aggregate?.max?.currencyRef?.split(':').pop() || fallbackCurrencyCode

        return {
          id: employee.id,
          name: employee.fullName || `${employee.firstName} ${employee.lastName}`,
          displayName: employee.displayName || employee.fullName || `${employee.firstName} ${employee.lastName}`,
          picture: employee.picture || undefined,
          pictureThumbnail: employee.pictureThumbnail || undefined,
          revenue,
          opportunitiesWon,
          currencyCode
        }
      })

      setEmployeeRevenues(revenues)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch employee revenues')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, graphqlClient, employees, selectedCurrencyId])

  useEffect(() => {
    fetchEmployeeRevenues().catch(() => undefined)
  }, [fetchEmployeeRevenues])

  const revenueByEmployeeId = useMemo<MemberRevenueMap>(
    () =>
      new Map(
        employeeRevenues.map(employee => [
          employee.id,
          {
            revenue: employee.revenue,
            opportunitiesWon: employee.opportunitiesWon,
            currencyCode: employee.currencyCode
          }
        ])
      ),
    [employeeRevenues]
  )

  return {
    employeeRevenues,
    revenueByEmployeeId,
    isLoading,
    error,
    refetch: () => {
      fetchEmployeeRevenues().catch(() => undefined)
    }
  }
}
