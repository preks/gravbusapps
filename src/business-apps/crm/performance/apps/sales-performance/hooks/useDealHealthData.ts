import { useEffect, useState, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface DealHealthItem {
  id: string
  name: string
  winningChance: number
  estimatedAmount: number
  daysInPipeline: number
  healthScore: number
  healthCategory: 'excellent' | 'healthy' | 'warning' | 'critical'
  riskFactors: string[]
  account?: string
  owner?: string
}

export interface DealHealthData {
  healthDistribution: { excellent: number; healthy: number; warning: number; critical: number }
  matrixData: DealHealthItem[]
}

const calculateHealthScore = (opportunity: any): { score: number; riskFactors: string[] } => {
  let score = 100
  const riskFactors: string[] = []
  const currentDate = new Date()
  const createdDate = new Date(opportunity.createdAt)
  const daysInPipeline = Math.floor((currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))

  if (daysInPipeline > 365) {
    score -= 30
    riskFactors.push('Very old opportunity (>1 year)')
  } else if (daysInPipeline > 180) {
    score -= 20
    riskFactors.push('Old opportunity (>6 months)')
  } else if (daysInPipeline > 90) {
    score -= 10
    riskFactors.push('Aging opportunity (>3 months)')
  }

  const winChance = opportunity.winningChance || 0
  if (winChance < 30) {
    score -= 25
    riskFactors.push('Low win probability (<30%)')
  } else if (winChance < 50) {
    score -= 15
    riskFactors.push('Moderate win probability (30-50%)')
  } else if (winChance > 90) {
    score += 10
  }

  const amount = opportunity.estimatedAmount || 0
  if (amount < 50000) {
    score -= 10
    riskFactors.push('Small deal size (<€50k)')
  } else if (amount > 200000) {
    score += 5
  }

  if (!opportunity.opportunityAccounts?.length) {
    score -= 15
    riskFactors.push('No associated account')
  }

  if (!opportunity.ownerEmployee) {
    score -= 20
    riskFactors.push('No assigned owner')
  }

  if (opportunity.updatedAt) {
    const updatedDate = new Date(opportunity.updatedAt)
    const daysSinceUpdate = Math.floor((currentDate.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceUpdate > 30) {
      score -= 15
      riskFactors.push('No recent activity (>30 days)')
    }
  } else {
    score -= 15
    riskFactors.push('No recent activity')
  }

  return { score: Math.max(0, Math.min(100, score)), riskFactors }
}

const getHealthCategory = (score: number): DealHealthItem['healthCategory'] => {
  if (score >= 85) return 'excellent'
  if (score >= 70) return 'healthy'
  if (score >= 50) return 'warning'
  return 'critical'
}

interface UseDealHealthDataResult {
  data: DealHealthData | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook to fetch deal health data for opportunities
 * Calculates health scores based on win probability, deal age, activity, and other factors
 */
export const useDealHealthData = (accessToken: string): UseDealHealthDataResult => {
  const [data, setData] = useState<DealHealthData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchHealthData = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const query = `
        query GetDealHealthData($where: OpportunityBoolExp, $orderBy: [OpportunityOrderBy!], $limit: Int) {
          opportunities: Opportunity(where: $where, orderBy: $orderBy, limit: $limit) {
            id
            name
            estimatedAmount
            winningChance
            createdAt
            updatedAt
            opportunityAccounts(where: { isDeleted: { _eq: false } }, limit: 1) {
              account {
                name
              }
            }
            ownerEmployee { displayName }
          }
        }
      `

      const variables = {
        where: { isDeleted: { _eq: false }, closeDate: { _eq: null } },
        orderBy: [{ createdAt: 'DESC' as const }],
        limit: 150
      }

      const result = await graphqlClient.request<any>(query, variables)

      const processed = result.opportunities.map((opp: any) => {
        const currentDate = new Date()
        const createdDate = new Date(opp.createdAt)
        const daysInPipeline = Math.floor((currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
        const { score, riskFactors } = calculateHealthScore(opp)
        const healthCategory = getHealthCategory(score)

        return {
          id: opp.id,
          name: opp.name,
          winningChance: opp.winningChance || 0,
          estimatedAmount: opp.estimatedAmount || 0,
          daysInPipeline,
          healthScore: score,
          healthCategory,
          riskFactors,
          account: opp.opportunityAccounts?.[0]?.account?.name,
          owner: opp.ownerEmployee?.displayName
        } as DealHealthItem
      })

      const distribution = processed.reduce(
        (acc: any, opp: DealHealthItem) => {
          acc[opp.healthCategory] = (acc[opp.healthCategory] || 0) + 1
          return acc
        },
        { excellent: 0, healthy: 0, warning: 0, critical: 0 }
      )

      setData({ healthDistribution: distribution, matrixData: processed })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch deal health data')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, graphqlClient])

  useEffect(() => {
    void fetchHealthData()
  }, [fetchHealthData])

  return { data, isLoading, error, refetch: fetchHealthData }
}
