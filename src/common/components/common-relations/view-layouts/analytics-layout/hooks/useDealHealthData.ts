import { useEffect, useState } from 'react'
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
  currencyCode?: string
}

export interface DealHealthData {
  healthDistribution: { excellent: number; healthy: number; warning: number; critical: number }
  matrixData: DealHealthItem[]
}

interface OpportunityForHealthScore {
  estimatedAmount?: number
  estimatedCloseDate?: string
  winningChance?: number
}

interface OpportunityQueryResult {
  opportunities: {
    id: string
    name: string
    createdAt: string
    estimatedAmount?: number
    estimatedCloseDate?: string
    winningChance?: number
    opportunityAccounts?: Array<{ account?: { name: string } }>
    ownerEmployee?: { displayName: string }
    currency?: { code: string }
  }[]
}

const calculateHealthScore = (
  opportunity: OpportunityForHealthScore,
  daysInPipeline: number,
  currentDate: Date
): { score: number; riskFactors: string[] } => {
  let score = 100
  const riskFactors: string[] = []
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

/**
 * Shared hook for fetching deal health data
 * Used by both CRM and IRM analytics modules
 *
 * @param accessToken - Authentication token
 * @param entityName - Entity name ('Opportunity' for CRM, 'InvestmentOpportunity' for IRM)
 * @param includeWinningChance - Whether to include winningChance field (CRM has it, IRM doesn't)
 */
export const useDealHealthData = (
  accessToken: string,
  entityName: 'Opportunity' | 'InvestmentOpportunity' = 'Opportunity',
  includeWinningChance = true
) => {
  const [data, setData] = useState<DealHealthData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchHealthData = async () => {
      try {
        setIsLoading(true)
        const currentDate = new Date()

        const winningChanceField = includeWinningChance ? 'winningChance' : ''

        const query = `
          query GetDealHealthData($where: ${entityName}BoolExp, $orderBy: [${entityName}OrderBy!], $limit: Int) {
            opportunities: ${entityName}(where: $where, orderBy: $orderBy, limit: $limit) {
              id
              name
              estimatedAmount
              ${winningChanceField}
              createdAt
              updatedAt
              opportunityAccounts(where: { isDeleted: { _eq: false } }, limit: 1) {
                account {
                  name
                }
              }
              ownerEmployee { displayName }
              currency { code value }
            }
          }
        `
        const variables = {
          where: { isDeleted: { _eq: false }, closeDate: { _eq: null } },
          orderBy: [{ createdAt: 'DESC' as const }],
          limit: 100
        }
        const result = await graphqlClient.request<OpportunityQueryResult>(query, variables)

        const processed = result.opportunities.map(opp => {
          const createdDate = new Date(opp.createdAt)
          const daysInPipeline = Math.floor((currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
          const { score, riskFactors } = calculateHealthScore(opp, daysInPipeline, currentDate)
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
            owner: opp.ownerEmployee?.displayName,
            currencyCode: opp.currency?.code || 'EUR'
          } as DealHealthItem
        })
        const distribution = processed.reduce(
          (acc: { excellent: number; healthy: number; warning: number; critical: number }, opp: DealHealthItem) => {
            acc[opp.healthCategory] = (acc[opp.healthCategory] || 0) + 1
            return acc
          },
          { excellent: 0, healthy: 0, warning: 0, critical: 0 }
        )
        setData({ healthDistribution: distribution, matrixData: processed })
      } finally {
        setIsLoading(false)
      }
    }
    if (accessToken) fetchHealthData()
  }, [accessToken, graphqlClient, entityName, includeWinningChance])

  return { data, isLoading }
}
