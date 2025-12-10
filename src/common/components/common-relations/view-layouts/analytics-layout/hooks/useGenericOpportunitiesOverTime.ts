import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export type TimeFilter = 'month' | 'quarter' | 'sixMonths' | 'year' | 'historical'

export interface OpportunityTimeSeriesData {
  date: string
  count: number
  value: number
  opportunitiesCreated: number
  opportunitiesWon: number
}

export interface OpportunitiesOverTimeConfig {
  opportunityEntity: string // 'Opportunity' or 'InvestmentOpportunity'
  wonStatusCode: string // 'WON' for both
  pipelineField?: string // 'salesPipeline' for CRM, 'opportunityPipeline' for IRM
}

/**
 * Helper to generate time periods for aggregation based on time filter
 */
function generateTimePeriods(
  startDate: Date,
  endDate: Date,
  timeFilter: TimeFilter
): Array<{ key: string; start: string; end: string }> {
  const periods: Array<{ key: string; start: string; end: string }> = []

  if (timeFilter === 'month') {
    // Daily periods
    const current = new Date(startDate)
    while (current <= endDate) {
      const next = new Date(current)
      next.setDate(next.getDate() + 1)
      periods.push({
        key: current.toISOString().split('T')[0],
        start: current.toISOString(),
        end: next.toISOString()
      })
      current.setDate(current.getDate() + 1)
    }
  } else if (timeFilter === 'historical') {
    // Yearly periods
    const currentYear = endDate.getFullYear()
    for (let i = 4; i >= 0; i--) {
      const year = currentYear - i
      const yearStart = new Date(year, 0, 1).toISOString()
      const yearEnd = new Date(year + 1, 0, 1).toISOString()
      periods.push({
        key: `${year}-01-01`,
        start: yearStart,
        end: yearEnd
      })
    }
  } else {
    // Monthly periods
    const current = new Date(startDate)
    while (current <= endDate) {
      const next = new Date(current)
      next.setMonth(next.getMonth() + 1)
      const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-01`
      periods.push({
        key: monthKey,
        start: current.toISOString(),
        end: next.toISOString()
      })
      current.setMonth(current.getMonth() + 1)
    }
  }

  return periods
}

/**
 * Generic hook for fetching opportunity lifecycle data using aggregate queries.
 * Optimized to avoid fetching full opportunity records.
 */
export const useGenericOpportunitiesOverTime = (
  accessToken: string,
  config: OpportunitiesOverTimeConfig,
  timeFilter: TimeFilter,
  selectedPipelineId?: string
) => {
  const [data, setData] = useState<OpportunityTimeSeriesData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchOpportunitiesOverTime = useCallback(async () => {
    if (!accessToken) {
      setError('Access token is required')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Calculate date range based on selected time filter
      const endDate = new Date()
      const startDate = new Date()

      switch (timeFilter) {
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1)
          break
        case 'quarter':
          startDate.setMonth(endDate.getMonth() - 3)
          break
        case 'sixMonths':
          startDate.setMonth(endDate.getMonth() - 6)
          break
        case 'year':
          startDate.setFullYear(endDate.getFullYear() - 1)
          break
        case 'historical':
          startDate.setFullYear(endDate.getFullYear() - 5)
          break
        default:
          startDate.setMonth(endDate.getMonth() - 3)
      }

      // Generate time periods for aggregation
      const timePeriods = generateTimePeriods(startDate, endDate, timeFilter)

      // Build pipeline filter
      const pipelineFilter =
        selectedPipelineId && config.pipelineField
          ? `${config.pipelineField}: { id: { _eq: "${selectedPipelineId}" } }`
          : ''

      // Build dynamic aggregate queries for each time period
      let queryParts = ''
      timePeriods.forEach((period, index) => {
        const alias = `period_${index}`
        // Build where condition without nested template literals
        const pipelinePart = pipelineFilter ? `, ${pipelineFilter}` : ''
        const whereCondition = `{ isDeleted: { _eq: false }, createdAt: { _gte: "${period.start}", _lt: "${period.end}" }${pipelinePart} }`

        queryParts += `
          # All opportunities in period ${index}
          ${alias}_total: ${config.opportunityEntity}Aggregate(
            where: ${whereCondition}
          ) {
            aggregate {
              count
              sum { estimatedAmount }
            }
          }

          # Won opportunities in period ${index}
          ${alias}_won: ${config.opportunityEntity}Aggregate(
            where: { 
              isDeleted: { _eq: false },
              createdAt: { _gte: "${period.start}", _lt: "${period.end}" },
              opportunityStatus: { code: { _eq: "${config.wonStatusCode}" } }${pipelineFilter ? `, ${pipelineFilter}` : ''}
            }
          ) {
            aggregate {
              count
            }
          }
        `
      })

      const query = `
        query GetOpportunitiesOverTimeAggregates {
          ${queryParts}
        }
      `

      const result = await graphqlClient.request<any>(query)

      // Transform result into time series data
      const timeSeriesData: OpportunityTimeSeriesData[] = timePeriods.map((period, index) => {
        const totalKey = `period_${index}_total`
        const wonKey = `period_${index}_won`

        const totalCount = result[totalKey]?.aggregate?.count || 0
        const totalValue = result[totalKey]?.aggregate?.sum?.estimatedAmount || 0
        const wonCount = result[wonKey]?.aggregate?.count || 0

        return {
          date: period.key,
          count: totalCount,
          value: totalValue,
          opportunitiesCreated: totalCount,
          opportunitiesWon: wonCount
        }
      })

      setData(timeSeriesData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [
    accessToken,
    graphqlClient,
    timeFilter,
    selectedPipelineId,
    config.opportunityEntity,
    config.wonStatusCode,
    config.pipelineField
  ])

  useEffect(() => {
    fetchOpportunitiesOverTime()
  }, [fetchOpportunitiesOverTime])

  return { data, isLoading, error, refetch: fetchOpportunitiesOverTime }
}
