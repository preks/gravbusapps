/**
 * Generic pipeline health hook
 * Calculates health metrics for opportunity pipelines
 * Used by both CRM and IRM with different entity configurations
 */

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
    winningChance?: number | null
  }>
}

export interface PipelineHealthConfig {
  opportunityEntity: string // 'Opportunity' or 'InvestmentOpportunity'
  opportunityAggregate: string // 'OpportunityAggregate' or 'InvestmentOpportunityAggregate'
  pipelineField: string // 'salesPipeline' or 'opportunityPipeline'
  includeWinningChanceInQuery?: boolean // CRM includes winningChance in sample query
  includeStageFilter?: boolean // CRM includes stage filter
}

// ============================================================================
// HELPER FUNCTIONS - Reduce cognitive complexity
// ============================================================================

/** Build WHERE conditions for pipeline health queries */
function buildPipelineHealthWhereConditions(
  config: PipelineHealthConfig,
  selectedPipelineId: string | undefined
): { baseWhere: string; activeOppsWhere: string } {
  const pipelineFilter = selectedPipelineId ? `${config.pipelineField}: {id: {_eq: "${selectedPipelineId}"}}` : ''
  const baseWhere = `isDeleted: {_eq: false} ${pipelineFilter ? ', ' + pipelineFilter : ''}`

  let activeOppsWhere = `${baseWhere}, opportunityStatus: {code: {_nin: ["WON", "LOST"]}}`

  if (config.includeStageFilter) {
    activeOppsWhere = `${baseWhere}, stage: {_nin: ["CLOSED", "LOST"]}, opportunityStatus: {code: {_nin: ["WON", "LOST"]}}, winningChance: {_lte: "100"}`
  }

  return { baseWhere, activeOppsWhere }
}

/** Calculate average opportunity age from sample */
function calculateAvgOpportunityAge(sample: Array<{ createdAt: string }>): number {
  if (sample.length === 0) return 0

  const now = Date.now()
  const totalAge = sample.reduce((sum, opp) => {
    const createdAt = new Date(opp.createdAt).getTime()
    const ageInDays = (now - createdAt) / (1000 * 60 * 60 * 24)
    return sum + ageInDays
  }, 0)

  return totalAge / sample.length
}

export const useGenericPipelineHealth = (
  accessToken: string,
  selectedPipelineId: string | undefined,
  config: PipelineHealthConfig
) => {
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

        // Build where conditions using helper
        const { activeOppsWhere } = buildPipelineHealthWhereConditions(config, selectedPipelineId)

        // Build opportunity sample fields
        const sampleFields = config.includeWinningChanceInQuery ? `createdAt\nwinningChance` : `createdAt`

        const query = `
          query GetPipelineHealth {
            # Total active opportunities aggregate
            totalOpportunities: ${config.opportunityAggregate}(
              where: { ${activeOppsWhere} }
            ) {
              aggregate {
                count
                ${config.includeWinningChanceInQuery ? 'avg { winningChance }' : ''}
              }
            }

            # Stalled opportunities (no update in 30+ days) aggregate
            stalledOpportunities: ${config.opportunityAggregate}(
              where: {
                ${activeOppsWhere}
                updatedAt: {_lt: "${thirtyDaysAgo}"}
              }
            ) {
              aggregate {
                count
              }
            }

            # Sample opportunities for age calculation (limit to 1000 for performance)
            opportunitySample: ${config.opportunityEntity}(
              where: { ${activeOppsWhere} }
              limit: 1000
              orderBy: {createdAt: DESC}
            ) {
              ${sampleFields}
            }
          }
        `

        const result = await graphqlClient.request<HealthQueryResult>(query)

        // Calculate metrics
        const totalOpps = result.totalOpportunities?.aggregate?.count || 0
        const stalledOpps = result.stalledOpportunities?.aggregate?.count || 0
        const sample = result.opportunitySample || []

        // Calculate average opportunity age using helper
        const avgAge = calculateAvgOpportunityAge(sample)

        // Calculate average winning chance
        let avgWinningChance = 0
        if (config.includeWinningChanceInQuery) {
          // For CRM: use aggregate average or calculate from sample
          avgWinningChance = result.totalOpportunities?.aggregate?.avg?.winningChance || 0
          if (avgWinningChance === 0 && sample.length > 0) {
            const validChances = sample
              .filter(opp => opp.winningChance !== null && opp.winningChance !== undefined)
              .map(opp => opp.winningChance!)
            if (validChances.length > 0) {
              avgWinningChance = validChances.reduce((sum, chance) => sum + chance, 0) / validChances.length
            }
          }
        } else {
          // For IRM: use aggregate average if available
          avgWinningChance = result.totalOpportunities?.aggregate?.avg?.winningChance || 0
        }

        // Calculate health score (0-100)
        // Factors:
        // - Lower stalled percentage = better (40% weight)
        // - Lower average age = better (30% weight)
        // - Higher average winning chance = better (30% weight)
        const stalledPercentage = totalOpps > 0 ? (stalledOpps / totalOpps) * 100 : 0
        const stalledScore = Math.max(0, 100 - stalledPercentage * 2) // Stalled > 50% = 0 score
        const ageScore = Math.max(0, 100 - avgAge) // Age > 100 days = 0 score
        const chanceScore = avgWinningChance // Already 0-100

        const healthScore = Math.round(stalledScore * 0.4 + ageScore * 0.3 + chanceScore * 0.3)

        setPipelineHealth({
          healthScore: Math.min(100, Math.max(0, healthScore)),
          avgOpportunityAge: Math.round(avgAge),
          totalOpportunities: totalOpps,
          avgWinningChance: Math.round(avgWinningChance)
        })
      } catch (err) {
        console.error('Error fetching pipeline health:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch pipeline health')
        setPipelineHealth(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPipelineHealth()
  }, [graphqlClient, accessToken, selectedPipelineId, config])

  return {
    pipelineHealth,
    isLoading,
    error
  }
}
