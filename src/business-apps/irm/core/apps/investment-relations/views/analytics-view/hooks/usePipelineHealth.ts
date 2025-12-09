import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface PipelineHealthData {
  healthScore: number
  avgOpportunityAge: number
  totalOpportunities: number
  avgWinningChance: number
}

interface HealthQueryResult {
  totalOpportunities: { aggregate: { count: number; avg?: { winningChance?: number } } }
  stalledOpportunities: { aggregate: { count: number } }
  opportunitySample: Array<{
    createdAt: string
  }>
}

/**
 * IRM Pipeline Health hook - Optimized with aggregates
 * Uses same approach as CRM for consistency and performance
 */
export const usePipelineHealth = (accessToken: string, selectedPipelineId?: string) => {
  const [pipelineHealth, setPipelineHealth] = useState<PipelineHealthData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchPipelineHealth = async () => {
      if (!accessToken) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        const currentDate = new Date()
        const thirtyDaysAgo = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

        // Build where condition for pipeline filtering
        const pipelineFilter = selectedPipelineId ? `opportunityPipeline: {id: {_eq: "${selectedPipelineId}"}}` : ''

        const baseWhere = `isDeleted: {_eq: false} ${pipelineFilter ? ', ' + pipelineFilter : ''}`
        // Simplified active opportunities filter - exclude known closed states
        const activeOppsWhere = `${baseWhere}, opportunityStatus: {code: {_nin: ["WON", "LOST"]}}`

        const query = `
          query GetInvestmentPipelineHealth {
            # Total active opportunities aggregate (optimized - no full record fetch)
            totalOpportunities: InvestmentOpportunityAggregate(
              where: { ${activeOppsWhere} }
            ) {
              aggregate {
                count
                sum { estimatedAmount }
              }
            }
            
            # Stalled opportunities (no update in 30 days)
            stalledOpportunities: InvestmentOpportunityAggregate(
              where: {
                ${activeOppsWhere}
                updatedAt: {_lt: "${thirtyDaysAgo}"}
              }
            ) {
              aggregate { count }
            }

            # Sample opportunities for age calculation (limited to 1000 like CRM)
            opportunitySample: InvestmentOpportunity(
              where: { ${activeOppsWhere} }
              limit: 1000
            ) {
              createdAt
            }
          }
        `

        const result = await graphqlClient.request<HealthQueryResult>(query)

        if (!result.totalOpportunities) {
          throw new Error('No opportunities data received from GraphQL')
        }

        // Get aggregate data directly from GraphQL (no frontend iteration)
        const totalOpps = result.totalOpportunities.aggregate.count || 0
        const stalledCount = result.stalledOpportunities.aggregate.count || 0
        // Note: IRM doesn't have winningChance field
        const avgWinningChance = 0

        // Calculate average age from sample (max 1000 records instead of ALL)
        const avgAge =
          result.opportunitySample?.length > 0
            ? result.opportunitySample.reduce((sum, opp) => {
                const age = Math.floor(
                  (currentDate.getTime() - new Date(opp.createdAt).getTime()) / (1000 * 60 * 60 * 24)
                )
                return sum + age
              }, 0) / result.opportunitySample.length
            : 0

        // Calculate health score
        const stalledRatio = totalOpps > 0 ? stalledCount / totalOpps : 0
        const ageScore = Math.max(0, 100 - avgAge / 2) // Penalty for old opportunities (sample-based)
        const winChanceScore = avgWinningChance // IRM doesn't have this field
        const activityScore = Math.max(0, 100 - stalledRatio * 100)

        const healthScore = totalOpps > 0 ? Math.round((ageScore + winChanceScore + activityScore) / 3) : 0

        const healthData = {
          healthScore,
          avgOpportunityAge: Math.round(avgAge),
          totalOpportunities: totalOpps,
          avgWinningChance: Math.round(avgWinningChance)
        }

        setPipelineHealth(healthData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setPipelineHealth(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPipelineHealth()
  }, [accessToken, graphqlClient, selectedPipelineId])

  return { pipelineHealth, isLoading, error }
}
