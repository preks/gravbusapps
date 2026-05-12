import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface OpportunityVelocityData {
  flowTrend: {
    month: string
    startDate: string
    endDate: string
    opportunitiesCreated: number
    opportunitiesWon: number
  }[]
}

export interface OpportunityVelocityConfig {
  opportunityEntity: string // 'Opportunity' or 'InvestmentOpportunity'
  opportunityAggregate: string // 'OpportunityAggregate' or 'InvestmentOpportunityAggregate'
  statusFilterField?: 'code' | 'type'
}

/**
 * Generic Opportunity Velocity Data Hook
 * Optimized with monthly aggregates for velocity trend
 * Configurable for both CRM and IRM
 */
export const useGenericOpportunityVelocityData = (accessToken: string, config: OpportunityVelocityConfig) => {
  const [data, setData] = useState<OpportunityVelocityData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchVelocityData = async () => {
      if (!accessToken) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)

        const currentDate = new Date()

        // Generate monthly periods for last 6 months
        const monthlyPeriods = []
        for (let i = 5; i >= 0; i--) {
          const periodEnd = new Date(currentDate)
          periodEnd.setMonth(currentDate.getMonth() - i)
          periodEnd.setDate(1)
          periodEnd.setHours(0, 0, 0, 0)

          const periodStart = new Date(periodEnd)
          periodStart.setMonth(periodEnd.getMonth() - 1)

          const nextMonth = new Date(periodEnd)
          nextMonth.setMonth(periodEnd.getMonth() + 1)

          monthlyPeriods.push({
            start: periodStart.toISOString(),
            end: nextMonth.toISOString(),
            label: periodEnd.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          })
        }

        // Build aggregate queries for each month
        const monthlyAggregates = monthlyPeriods
          .map((period, idx) => {
            return `
          month${idx}Total: ${config.opportunityAggregate}(
            where: {
              isDeleted: {_eq: false}
              createdAt: {_gte: "${period.start}", _lt: "${period.end}"}
            }
          ) {
            aggregate { count }
          }

          month${idx}Won: ${config.opportunityAggregate}(
            where: {
              isDeleted: {_eq: false}
              createdAt: {_gte: "${period.start}", _lt: "${period.end}"}
              opportunityStatus: {${config.statusFilterField ?? 'code'}: {_eq: "WON"}}
            }
          ) {
            aggregate { count }
          }`
          })
          .join('\n')

        const query = `
          query GetOpportunityVelocityData {
            # Monthly aggregates for velocity trend (last 6 months)
            ${monthlyAggregates}
          }
        `

        const result = await graphqlClient.request<any>(query)

        // Process monthly aggregates for velocity trend
        const flowTrend = monthlyPeriods.map((period, idx) => ({
          month: period.label,
          startDate: period.start,
          endDate: period.end,
          opportunitiesCreated: result[`month${idx}Total`]?.aggregate?.count || 0,
          opportunitiesWon: result[`month${idx}Won`]?.aggregate?.count || 0
        }))

        setData({
          flowTrend
        })
      } catch (error) {
        console.error('Error fetching velocity data:', error)
        setData(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchVelocityData()
  }, [accessToken, graphqlClient, config.opportunityEntity, config.opportunityAggregate, config.statusFilterField])

  return { data, isLoading }
}
