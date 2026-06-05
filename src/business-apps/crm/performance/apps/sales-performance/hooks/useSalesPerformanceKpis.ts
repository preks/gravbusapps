import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { type SalesPerformanceKpis } from '../types'

interface UseSalesPerformanceKpisResult {
  kpis: SalesPerformanceKpis | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Build the KPIs query with 30-day trend comparison
 * Current period: last 30 days
 * Previous period: 30-60 days ago
 * @param selectedCurrencyId - Optional currency ID to filter by (e.g., "Currency:v1:EUR")
 */
const buildSalesPerformanceKpisQuery = (
  current30DaysStart: string,
  previous30DaysStart: string,
  previous30DaysEnd: string,
  selectedCurrencyId?: string
): string => {
  // Build base where and currency filter following CRM pattern
  const currencyFilter = selectedCurrencyId ? `currencyRef: {_eq: "${selectedCurrencyId}"}` : ''
  const baseWhere = `isDeleted: {_eq: false}${currencyFilter ? '\n        ' + currencyFilter : ''}`

  return `
  query GetSalesPerformanceKpis {
    currentAllClosed: OpportunityAggregate(
      where: {
        ${baseWhere}
        opportunityStatus: {code: {_in: ["WON", "LOST"]}}
        closeDate: {_gte: "${current30DaysStart}"}
      }
    ) {
      aggregate {
        count
      }
    }
    
    currentWon: OpportunityAggregate(
      where: {
        ${baseWhere}
        opportunityStatus: {code: {_eq: "WON"}}
        closeDate: {_gte: "${current30DaysStart}"}
      }
    ) {
      aggregate {
        count
        sum {
          estimatedAmount
        }
        avg {
          estimatedAmount
        }
      }
    }
    
    previousAllClosed: OpportunityAggregate(
      where: {
        ${baseWhere}
        opportunityStatus: {code: {_in: ["WON", "LOST"]}}
        closeDate: {_gte: "${previous30DaysStart}", _lt: "${previous30DaysEnd}"}
      }
    ) {
      aggregate {
        count
      }
    }
    
    previousWon: OpportunityAggregate(
      where: {
        ${baseWhere}
        opportunityStatus: {code: {_eq: "WON"}}
        closeDate: {_gte: "${previous30DaysStart}", _lt: "${previous30DaysEnd}"}
      }
    ) {
      aggregate {
        count
        sum {
          estimatedAmount
        }
        avg {
          estimatedAmount
        }
      }
    }
    
    allTimeWon: OpportunityAggregate(
      where: {
        ${baseWhere}
        opportunityStatus: {code: {_eq: "WON"}}
      }
    ) {
      aggregate {
        count
        sum {
          estimatedAmount
        }
      }
    }
    
    allTimeClosed: OpportunityAggregate(
      where: {
        ${baseWhere}
        opportunityStatus: {code: {_in: ["WON", "LOST"]}}
      }
    ) {
      aggregate {
        count
      }
    }
    
    allOpportunitiesForAvg: OpportunityAggregate(
      where: {
        ${baseWhere}
        estimatedAmount: {_isNull: false}
      }
    ) {
      aggregate {
        avg {
          estimatedAmount
        }
      }
    }
    
    sampleOpportunity: Opportunity(
      where: {
        isDeleted: {_eq: false}
        currencyRef: {_isNull: false}
      }
      limit: 1
    ) {
      currencyRef
      currency {
        id
        code
        value
      }
    }
  }
`
}

interface KpisQueryResult {
  currentAllClosed: { aggregate: { count: number } }
  currentWon: {
    aggregate: { count: number; sum: { estimatedAmount: number | null }; avg: { estimatedAmount: number | null } }
  }
  previousAllClosed: { aggregate: { count: number } }
  previousWon: {
    aggregate: { count: number; sum: { estimatedAmount: number | null }; avg: { estimatedAmount: number | null } }
  }
  allTimeWon: { aggregate: { count: number; sum: { estimatedAmount: number | null } } }
  allTimeClosed: { aggregate: { count: number } }
  allOpportunitiesForAvg: { aggregate: { avg: { estimatedAmount: number | null } } }
  sampleOpportunity: Array<{ currencyRef: string; currency: { id: string; code: string; value: string } }>
}

/**
 * Hook to fetch sales performance KPIs with 30-day trend comparison:
 * - Total Revenue: sum of estimated amounts for opportunities with status WON
 * - Opportunities Won: count of opportunities with status WON
 * - Average Opportunity Size: Average of estimated amounts of all opportunities
 * - Win Rate: count of WON / count of all closed opportunities
 *
 * Each KPI includes trend data comparing current 30 days vs previous 30 days
 *
 * @param accessToken - The access token for API authentication
 * @param selectedCurrencyId - Optional currency ID to filter by (e.g., "Currency:v1:EUR")
 */
export const useSalesPerformanceKpis = (
  accessToken: string,
  selectedCurrencyId?: string
): UseSalesPerformanceKpisResult => {
  const [kpis, setKpis] = useState<SalesPerformanceKpis | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchKpis = useCallback(async () => {
    if (!accessToken) {
      setError('Access token is required')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Calculate date ranges for 30-day periods
      const now = new Date()
      const current30DaysStart = new Date(now)
      current30DaysStart.setDate(now.getDate() - 30)

      const previous30DaysEnd = new Date(current30DaysStart)
      const previous30DaysStart = new Date(previous30DaysEnd)
      previous30DaysStart.setDate(previous30DaysEnd.getDate() - 30)

      const query = buildSalesPerformanceKpisQuery(
        current30DaysStart.toISOString(),
        previous30DaysStart.toISOString(),
        previous30DaysEnd.toISOString(),
        selectedCurrencyId
      )

      const result = await graphqlClient.request<KpisQueryResult>(query)

      // Extract all-time totals for main KPI values
      const totalRevenue = result.allTimeWon?.aggregate?.sum?.estimatedAmount || 0
      const wonCount = result.allTimeWon?.aggregate?.count || 0
      const totalClosedCount = result.allTimeClosed?.aggregate?.count || 0
      const avgOpportunitySize = result.allOpportunitiesForAvg?.aggregate?.avg?.estimatedAmount || 0
      const winRate = totalClosedCount > 0 ? (wonCount / totalClosedCount) * 100 : 0

      // Extract current period data
      const currentRevenue = result.currentWon?.aggregate?.sum?.estimatedAmount || 0
      const currentWonCount = result.currentWon?.aggregate?.count || 0
      const currentClosedCount = result.currentAllClosed?.aggregate?.count || 0
      const currentAvgOpportunitySize = result.currentWon?.aggregate?.avg?.estimatedAmount || 0
      const currentWinRate = currentClosedCount > 0 ? (currentWonCount / currentClosedCount) * 100 : 0

      // Extract previous period data
      const previousRevenue = result.previousWon?.aggregate?.sum?.estimatedAmount || 0
      const previousWonCount = result.previousWon?.aggregate?.count || 0
      const previousClosedCount = result.previousAllClosed?.aggregate?.count || 0
      const previousAvgOpportunitySize = result.previousWon?.aggregate?.avg?.estimatedAmount || 0
      const previousWinRate = previousClosedCount > 0 ? (previousWonCount / previousClosedCount) * 100 : 0

      // Extract currency code from sample opportunity or from selectedCurrencyId
      let currencyCode = 'EUR'
      if (selectedCurrencyId) {
        // Extract code from ID like "Currency:v1:EUR"
        currencyCode = selectedCurrencyId.split(':').pop() || 'EUR'
      } else if (result.sampleOpportunity?.[0]) {
        const currencyRef = result.sampleOpportunity[0].currencyRef || ''
        currencyCode = result.sampleOpportunity[0].currency?.code || currencyRef.split(':').pop() || 'EUR'
      }

      setKpis({
        totalRevenue,
        opportunitiesWon: wonCount,
        averageOpportunitySize: avgOpportunitySize,
        winRate,
        currencyCode,
        trends: {
          totalRevenue: {
            current: currentRevenue,
            previous: previousRevenue
          },
          opportunitiesWon: {
            current: currentWonCount,
            previous: previousWonCount
          },
          averageOpportunitySize: {
            current: currentAvgOpportunitySize,
            previous: previousAvgOpportunitySize
          },
          winRate: {
            current: currentWinRate,
            previous: previousWinRate
          }
        }
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch KPIs'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, graphqlClient, selectedCurrencyId])

  useEffect(() => {
    void fetchKpis()
  }, [fetchKpis])

  return {
    kpis,
    isLoading,
    error,
    refetch: () => void fetchKpis()
  }
}
