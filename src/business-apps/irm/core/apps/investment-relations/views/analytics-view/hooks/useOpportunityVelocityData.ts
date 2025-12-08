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

        const query = `
          query GetInvestmentOpportunityVelocityData(
            $recentWhere: InvestmentOpportunityBoolExp
            $recentOrderBy: [InvestmentOpportunityOrderBy!]
            $recentLimit: Int
            $quickWinsWhere: InvestmentOpportunityBoolExp
            $quickWinsOrderBy: [InvestmentOpportunityOrderBy!]
            $quickWinsLimit: Int
            $slowMoversWhere: InvestmentOpportunityBoolExp
            $slowMoversOrderBy: [InvestmentOpportunityOrderBy!]
            $slowMoversLimit: Int
          ) {
            opportunities: InvestmentOpportunity(where: $recentWhere, orderBy: $recentOrderBy, limit: $recentLimit) {
              id
              name
              estimatedAmount
              createdAt
              updatedAt
              closeDate
              account { name }
            }
            quickWins: InvestmentOpportunity(where: $quickWinsWhere, orderBy: $quickWinsOrderBy, limit: $quickWinsLimit) {
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
            slowMovers: InvestmentOpportunity(where: $slowMoversWhere, orderBy: $slowMoversOrderBy, limit: $slowMoversLimit) {
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

        const variables = {
          recentWhere: { isDeleted: { _eq: false }, createdAt: { _gte: '2024-01-01T00:00:00Z' } },
          recentOrderBy: [{ createdAt: 'DESC' as const }],
          recentLimit: 200,
          quickWinsWhere: { isDeleted: { _eq: false }, closeDate: { _neq: null } },
          quickWinsOrderBy: [{ closeDate: 'DESC' as const }],
          quickWinsLimit: 5,
          slowMoversWhere: { isDeleted: { _eq: false }, closeDate: { _eq: null } },
          slowMoversOrderBy: [{ createdAt: 'ASC' as const }],
          slowMoversLimit: 5
        }

        const result = await graphqlClient.request<any>(query, variables)
        const currentDate = new Date()

        const avgDaysInPipeline =
          result.opportunities.reduce((sum: number, opp: any) => {
            const createdDate = new Date(opp.createdAt)
            const days = Math.floor((currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
            return sum + days
          }, 0) / (result.opportunities.length || 1)

        const monthly = new Map<string, { opportunities: any[]; totalDays: number }>()
        result.opportunities.forEach((opp: any) => {
          const date = new Date(opp.createdAt)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          if (!monthly.has(monthKey)) monthly.set(monthKey, { opportunities: [], totalDays: 0 })
          const days = Math.floor((currentDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
          monthly.get(monthKey)!.opportunities.push(opp)
          monthly.get(monthKey)!.totalDays += days
        })

        const velocityTrend = Array.from(monthly.entries())
          .map(([month, m]) => {
            const avgDays = m.totalDays / m.opportunities.length
            return {
              month,
              averageDays: Math.round(avgDays),
              opportunityCount: m.opportunities.length,
              conversionRate: 0
            }
          })
          .slice(-6)

        const quickWins = result.quickWins.map((opp: any) => {
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

        const slowMovers = result.slowMovers.map((opp: any) => {
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

        setData({ averageDaysInPipeline: Math.round(avgDaysInPipeline), velocityTrend, quickWins, slowMovers })
      } finally {
        setIsLoading(false)
      }
    }

    if (accessToken) fetchVelocityData()
  }, [accessToken, graphqlClient])

  return { data, isLoading }
}
