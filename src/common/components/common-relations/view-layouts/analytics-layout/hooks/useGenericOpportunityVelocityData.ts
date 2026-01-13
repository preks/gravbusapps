import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface OpportunityVelocityData {
  averageDaysInPipeline: number
  velocityTrend: { month: string; averageDays: number; opportunityCount: number; conversionRate: number }[]
  quickWins: { id: string; title: string; value: number; closeDate: string; daysSinceClosed: number; isWon: boolean }[]
  slowMovers: { id: string; title: string; value: number; createdAt: string; daysSinceCreated: number }[]
}

export interface OpportunityVelocityConfig {
  opportunityEntity: string // 'Opportunity' or 'InvestmentOpportunity'
  opportunityAggregate: string // 'OpportunityAggregate' or 'InvestmentOpportunityAggregate'
  useWinningChance: boolean // true for CRM (has winningChance field), false for IRM
  quickWinsFilter?: string // Additional filter for quickWins query (e.g., 'winningChance: {_gte: 80}')
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
        const sixMonthsAgo = new Date(currentDate)
        sixMonthsAgo.setMonth(currentDate.getMonth() - 6)

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
            const baseAggregates = `
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
              opportunityStatus: {code: {_eq: "WON"}}
            }
          ) {
            aggregate { count }
          }`

            // Add winning chance aggregate for CRM
            const winningChanceAggregate = config.useWinningChance
              ? `

          month${idx}HighWinChance: ${config.opportunityAggregate}(
            where: {
              isDeleted: {_eq: false}
              createdAt: {_gte: "${period.start}", _lt: "${period.end}"}
              winningChance: {_gte: 70}
            }
          ) {
            aggregate { count }
          }`
              : ''

            return baseAggregates + winningChanceAggregate
          })
          .join('\n')

        // Build quick wins filter
        const quickWinsWhere = config.quickWinsFilter
          ? `isDeleted: {_eq: false}, closeDate: {_neq: null}, ${config.quickWinsFilter}`
          : `isDeleted: {_eq: false}, closeDate: {_neq: null}, opportunityStatus: {code: {_eq: "WON"}}`

        const query = `
          query GetOpportunityVelocityData {
            # Monthly aggregates for velocity trend (last 6 months)
            ${monthlyAggregates}

            # Sample for avg pipeline days calculation (last 6 months only)
            recentOpportunities: ${config.opportunityEntity}(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${sixMonthsAgo.toISOString()}"}
              }
              limit: 100
            ) {
              createdAt
            }

            # Quick Wins (Recent Wins)
            quickWins: ${config.opportunityEntity}(
              where: {
                ${quickWinsWhere}
              }
              orderBy: [{closeDate: DESC}]
              limit: 5
            ) {
              id
              name
              estimatedAmount
              closeDate
              opportunityAccounts(where: { isDeleted: { _eq: false } }, limit: 1) {
                account {
                  name
                }
              }
              currency {
                code
                value
              }
            }

            # Slow Movers (Oldest Open)
            slowMovers: ${config.opportunityEntity}(
              where: {
                isDeleted: {_eq: false}
                closeDate: {_eq: null}
              }
              orderBy: [{createdAt: ASC}]
              limit: 5
            ) {
              id
              name
              estimatedAmount
              createdAt
              opportunityAccounts(where: { isDeleted: { _eq: false } }, limit: 1) {
                account {
                  name
                }
              }
              currency {
                code
                value
              }
            }
          }
        `

        const result = await graphqlClient.request<any>(query)

        // Calculate avg days in pipeline from last 6 months sample
        const recentOpportunities = result.recentOpportunities || []
        const avgDaysInPipeline =
          recentOpportunities.length > 0
            ? Math.round(
                recentOpportunities.reduce((sum: number, opp: any) => {
                  const createdDate = new Date(opp.createdAt)
                  const days = Math.floor((currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
                  return sum + days
                }, 0) / recentOpportunities.length
              )
            : 0

        // Process monthly aggregates for velocity trend
        const velocityTrend = monthlyPeriods.map((period, idx) => {
          const totalCount = result[`month${idx}Total`]?.aggregate?.count || 0
          const wonCount = result[`month${idx}Won`]?.aggregate?.count || 0

          // Conversion rate calculation differs between CRM and IRM
          let conversionRate = 0
          if (config.useWinningChance) {
            // CRM: Use high winning chance as conversion indicator
            const highWinChanceCount = result[`month${idx}HighWinChance`]?.aggregate?.count || 0
            conversionRate = totalCount > 0 ? Math.round((highWinChanceCount / totalCount) * 100) : 0
          } else {
            // IRM: Use actual won opportunities
            conversionRate = totalCount > 0 ? Math.round((wonCount / totalCount) * 100) : 0
          }

          return {
            month: period.label,
            averageDays: avgDaysInPipeline,
            opportunityCount: totalCount,
            conversionRate
          }
        })

        // Process Quick Wins
        const quickWins = (result.quickWins || []).map((opp: any) => {
          const closeDate = new Date(opp.closeDate)
          const daysSinceClosed = Math.floor((currentDate.getTime() - closeDate.getTime()) / (1000 * 60 * 60 * 24))
          return {
            id: opp.id,
            title: opp.name,
            value: opp.estimatedAmount || 0,
            closeDate: opp.closeDate,
            daysSinceClosed,
            isWon: true,
            currencyCode: opp.currency?.code || 'EUR'
          }
        })

        // Process Slow Movers
        const slowMovers = (result.slowMovers || []).map((opp: any) => {
          const createdDate = new Date(opp.createdAt)
          const daysSinceCreated = Math.floor((currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
          return {
            id: opp.id,
            title: opp.name,
            value: opp.estimatedAmount || 0,
            createdAt: opp.createdAt,
            daysSinceCreated,
            currencyCode: opp.currency?.code || 'EUR'
          }
        })

        setData({
          averageDaysInPipeline: avgDaysInPipeline,
          velocityTrend,
          quickWins,
          slowMovers
        })
      } catch (error) {
        console.error('Error fetching velocity data:', error)
        setData(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchVelocityData()
  }, [
    accessToken,
    graphqlClient,
    config.opportunityEntity,
    config.opportunityAggregate,
    config.useWinningChance,
    config.quickWinsFilter
  ])

  return { data, isLoading }
}
