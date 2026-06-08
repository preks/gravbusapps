import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface SalesVelocityData {
  // Current month metrics
  currentMonthRevenue: number
  currentMonthOpportunitiesClosed: number
  currentMonthName: string

  // Last month metrics
  comparisonMonthRevenue: number
  comparisonMonthOpportunitiesClosed: number
  comparisonMonthName: string

  // Comparison
  revenueChange: number // percentage change
  opportunitiesChange: number // percentage change
  trend: 'up' | 'down' | 'stable'

  // Additional metrics
  avgOpportunitySize: number
  winRate: number
  avgSalesCycleDays: number
}

interface UseSalesVelocityResult {
  velocityData: SalesVelocityData | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Percentage change between a previous and current value.
 * When there is no previous baseline, a positive current value is treated as a full +100% increase.
 */
const calculatePercentChange = (current: number, previous: number): number => {
  if (previous > 0) {
    return ((current - previous) / previous) * 100
  }
  return current > 0 ? 100 : 0
}

/**
 * Hook to calculate monthly sales velocity with last month comparison
 * Shows current month revenue vs last month
 * @param accessToken - Access token for API calls
 * @param selectedCurrencyId - Optional currency ID to filter by
 */
export const useSalesVelocity = (accessToken: string, selectedCurrencyId?: string): UseSalesVelocityResult => {
  const [velocityData, setVelocityData] = useState<SalesVelocityData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchData = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const now = new Date()

      // Current month boundaries
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

      // Last month boundaries
      const comparisonMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const comparisonMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1)

      // Build currency filter
      const currencyFilter = selectedCurrencyId ? `currencyRef: {_eq: "${selectedCurrencyId}"}` : ''

      const query = `
        query GetSalesVelocity {
          # Current month - Won opportunities
          currentMonthWon: Opportunity(
            where: {
              isDeleted: {_eq: false}
              opportunityStatus: {code: {_eq: "WON"}}
              closeDate: {_gte: "${currentMonthStart.toISOString()}", _lt: "${currentMonthEnd.toISOString()}"}
              ${currencyFilter}
            }
          ) {
            id
            estimatedAmount
            createdAt
            closeDate
          }

          # Current month - All closed opportunities (for win rate)
          currentMonthClosed: OpportunityAggregate(
            where: {
              isDeleted: {_eq: false}
              closeDate: {_gte: "${currentMonthStart.toISOString()}", _lt: "${currentMonthEnd.toISOString()}"}
              opportunityStatus: {code: {_in: ["WON", "LOST"]}}
              ${currencyFilter}
            }
          ) {
            aggregate { count }
          }

          # Last month - Won opportunities
          comparisonMonthWon: Opportunity(
            where: {
              isDeleted: {_eq: false}
              opportunityStatus: {code: {_eq: "WON"}}
              closeDate: {_gte: "${comparisonMonthStart.toISOString()}", _lt: "${comparisonMonthEnd.toISOString()}"}
              ${currencyFilter}
            }
          ) {
            id
            estimatedAmount
            createdAt
            closeDate
          }

          # Last month - All closed opportunities (for win rate)
          comparisonMonthClosed: OpportunityAggregate(
            where: {
              isDeleted: {_eq: false}
              closeDate: {_gte: "${comparisonMonthStart.toISOString()}", _lt: "${comparisonMonthEnd.toISOString()}"}
              opportunityStatus: {code: {_in: ["WON", "LOST"]}}
              ${currencyFilter}
            }
          ) {
            aggregate { count }
          }
        }
      `

      const result = await graphqlClient.request<{
        currentMonthWon: Array<{ id: string; estimatedAmount: number; createdAt: string; closeDate: string }>
        currentMonthClosed: { aggregate: { count: number } }
        comparisonMonthWon: Array<{ id: string; estimatedAmount: number; createdAt: string; closeDate: string }>
        comparisonMonthClosed: { aggregate: { count: number } }
      }>(query)

      // Current month calculations
      const currentWonOpportunities = result.currentMonthWon || []
      const currentClosedCount = result.currentMonthClosed?.aggregate?.count || 0
      const currentMonthRevenue = currentWonOpportunities.reduce((sum, opp) => sum + (opp.estimatedAmount || 0), 0)
      const currentMonthOpportunitiesClosed = currentWonOpportunities.length
      const currentWinRate = currentClosedCount > 0 ? (currentMonthOpportunitiesClosed / currentClosedCount) * 100 : 0

      // Average opportunity size (current month)
      const avgOpportunitySize =
        currentMonthOpportunitiesClosed > 0 ? currentMonthRevenue / currentMonthOpportunitiesClosed : 0

      // Average sales cycle (days from created to closed)
      const cycleDays = currentWonOpportunities.map(opp => {
        const created = new Date(opp.createdAt)
        const closed = new Date(opp.closeDate)
        return Math.max(1, Math.floor((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)))
      })
      const avgSalesCycleDays =
        cycleDays.length > 0 ? Math.round(cycleDays.reduce((sum, days) => sum + days, 0) / cycleDays.length) : 0

      // Comparison month calculations (last month)
      const comparisonWonOpportunities = result.comparisonMonthWon || []
      const comparisonMonthRevenue = comparisonWonOpportunities.reduce(
        (sum, opp) => sum + (opp.estimatedAmount || 0),
        0
      )
      const comparisonMonthOpportunitiesClosed = comparisonWonOpportunities.length

      // Calculate changes
      const revenueChange = calculatePercentChange(currentMonthRevenue, comparisonMonthRevenue)

      const opportunitiesChange = calculatePercentChange(
        currentMonthOpportunitiesClosed,
        comparisonMonthOpportunitiesClosed
      )

      const trend: 'up' | 'down' | 'stable' = revenueChange > 5 ? 'up' : revenueChange < -5 ? 'down' : 'stable'

      // Format month names
      const currentMonthName = currentMonthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      const comparisonMonthName = comparisonMonthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

      setVelocityData({
        currentMonthRevenue,
        currentMonthOpportunitiesClosed,
        currentMonthName,
        comparisonMonthRevenue,
        comparisonMonthOpportunitiesClosed,
        comparisonMonthName,
        revenueChange: Math.round(revenueChange * 10) / 10,
        opportunitiesChange: Math.round(opportunitiesChange * 10) / 10,
        trend,
        avgOpportunitySize,
        winRate: Math.round(currentWinRate * 10) / 10,
        avgSalesCycleDays
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch velocity data')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, graphqlClient, selectedCurrencyId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  return {
    velocityData,
    isLoading,
    error,
    refetch: fetchData
  }
}
