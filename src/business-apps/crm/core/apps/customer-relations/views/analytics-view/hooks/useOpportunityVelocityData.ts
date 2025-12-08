import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface OpportunityVelocityData {
  averageDaysInPipeline: number
  velocityTrend: { month: string; averageDays: number; opportunityCount: number; conversionRate: number }[]
  quickWins: { id: string; title: string; value: number; closeDate: string; daysSinceClosed: number; isWon: boolean }[]
  slowMovers: { id: string; title: string; value: number; createdAt: string; daysSinceCreated: number }[]
}

export const useOpportunityVelocityData = (accessToken: string) => {
  const [data, setData] = useState<OpportunityVelocityData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchVelocityData = async () => {
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
          .map(
            (period, idx) => `
          month${idx}Total: OpportunityAggregate(
            where: {
              isDeleted: {_eq: false}
              createdAt: {_gte: "${period.start}", _lt: "${period.end}"}
            }
          ) {
            aggregate { count }
          }

          month${idx}Won: OpportunityAggregate(
            where: {
              isDeleted: {_eq: false}
              createdAt: {_gte: "${period.start}", _lt: "${period.end}"}
              opportunityStatus: {code: {_eq: "WON"}}
            }
          ) {
            aggregate { count }
          }

          month${idx}HighWinChance: OpportunityAggregate(
            where: {
              isDeleted: {_eq: false}
              createdAt: {_gte: "${period.start}", _lt: "${period.end}"}
              winningChance: {_gte: 70}
            }
          ) {
            aggregate { count }
          }
        `
          )
          .join('\n')

        const query = `
          query GetOpportunityVelocityData {
            # Monthly aggregates for velocity trend (last 6 months)
            ${monthlyAggregates}

            # Sample for avg pipeline days calculation (last 6 months only)
            recentOpportunities: Opportunity(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${sixMonthsAgo.toISOString()}"}
              }
              limit: 100
            ) {
              createdAt
            }

            # Quick Wins (Recent Wins)
            quickWins: Opportunity(
              where: {
                isDeleted: {_eq: false}
                closeDate: {_neq: null}
                winningChance: {_gte: 80}
              }
              orderBy: [{closeDate: DESC}]
              limit: 5
            ) {
              id
              name
              estimatedAmount
              closeDate
              account { name }
              currency {
                code
                value
              }
            }

            # Slow Movers (Oldest Open)
            slowMovers: Opportunity(
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
              account { name }
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
            ? recentOpportunities.reduce((sum: number, opp: any) => {
                const createdDate = new Date(opp.createdAt)
                const days = Math.floor((currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
                return sum + days
              }, 0) / recentOpportunities.length
            : 0

        // Process monthly aggregates for velocity trend
        const velocityTrend = monthlyPeriods.map((period, idx) => {
          const totalCount = result[`month${idx}Total`]?.aggregate?.count || 0
          const highWinChanceCount = result[`month${idx}HighWinChance`]?.aggregate?.count || 0

          return {
            month: period.label,
            averageDays: 0, // Will be calculated from sample if needed
            opportunityCount: totalCount,
            conversionRate: totalCount > 0 ? Math.round((highWinChanceCount / totalCount) * 100) : 0
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
          averageDaysInPipeline: Math.round(avgDaysInPipeline),
          velocityTrend,
          quickWins,
          slowMovers
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (accessToken) fetchVelocityData()
  }, [accessToken, graphqlClient])

  return { data, isLoading }
}
