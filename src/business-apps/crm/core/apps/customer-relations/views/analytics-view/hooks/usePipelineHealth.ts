import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface PipelineHealthData {
  healthScore: number
  avgOpportunityAge: number
  totalOpportunities: number
  avgWinningChance: number
}

interface HealthQueryResult {
  totalOpportunities: { aggregate: { count: number } }
  stalledOpportunities: { aggregate: { count: number } }
  opportunitySample: Array<{
    createdAt: string
    winningChance: number | null
  }>
}

export const usePipelineHealth = (accessToken: string, selectedPipelineId?: string) => {
  const [pipelineHealth, setPipelineHealth] = useState<PipelineHealthData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchPipelineHealth = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const currentDate = new Date()
        const thirtyDaysAgo = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

        // Build where condition for pipeline filtering
        const pipelineFilter = selectedPipelineId ? `salesPipeline: {id: {_eq: "${selectedPipelineId}"}}` : ''

        const baseWhere = `isDeleted: {_eq: false} ${pipelineFilter ? ', ' + pipelineFilter : ''}`
        // Simplified active opportunities filter - exclude known closed states
        const activeOppsWhere = `${baseWhere}, stage: {_nin: ["CLOSED", "LOST"]}, opportunityStatus: {code: {_nin: ["WON", "LOST"]}}, winningChance: {_lte: "100"}`

        const query = `
          query GetPipelineHealth {
            # Total active opportunities aggregate
            totalOpportunities: OpportunityAggregate(
              where: { ${activeOppsWhere} }
            ) {
              aggregate {
                count
                sum { estimatedAmount }
                avg { winningChance }
              }
            }
            
            # Stalled opportunities (no update in 30 days)
            stalledOpportunities: OpportunityAggregate(
              where: {
                ${activeOppsWhere}
                updatedAt: {_lt: "${thirtyDaysAgo}"}
              }
            ) {
              aggregate { count }
            }

            # Sample opportunities for age calculation 
            opportunitySample: Opportunity(
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

        // ✅ Get aggregate data directly from GraphQL (no frontend iteration)
        const totalOpps = result.totalOpportunities.aggregate.count || 0
        const avgWinningChance = result.totalOpportunities.aggregate.avg?.winningChance || 0
        const stalledCount = result.stalledOpportunities.aggregate.count || 0

        // ✅ Calculate average age from sample (100 records instead of ALL)
        const avgAge =
          result.opportunitySample?.length > 0
            ? result.opportunitySample.reduce((sum, opp) => {
                const age = Math.floor(
                  (currentDate.getTime() - new Date(opp.createdAt).getTime()) / (1000 * 60 * 60 * 24)
                )
                return sum + age
              }, 0) / result.opportunitySample.length
            : 0

        // Note: avgAge is calculated from sample, other metrics from aggregates
        const stalledRatio = totalOpps > 0 ? stalledCount / totalOpps : 0
        const ageScore = Math.max(0, 100 - avgAge / 2) // Penalty for old opportunities (sample-based)
        const winChanceScore = avgWinningChance // From aggregate
        const activityScore = Math.max(0, 100 - stalledRatio * 100) // From aggregate

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

    if (accessToken) {
      fetchPipelineHealth()
    }
  }, [accessToken, graphqlClient, selectedPipelineId])

  return { pipelineHealth, isLoading, error }
}
