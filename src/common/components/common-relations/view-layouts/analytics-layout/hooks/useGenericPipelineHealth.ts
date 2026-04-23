/**
 * Generic pipeline health hook
 * Calculates health metrics for opportunity pipelines
 * Used by both CRM and IRM with different entity configurations
 */

import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export type PipelineConfidenceMetric = 'winningChance' | 'winRate'

export interface PipelineHealthData {
  healthScore: number
  avgOpportunityAge: number
  totalOpportunities: number
  /**
   * Per-pipeline confidence indicator in [0, 100].
   * - For 'winningChance' (CRM): average winning chance of active opps.
   * - For 'winRate' (IRM): realized all-time win rate (won / (won + lost)) where the
   *   bucket is decided purely by `opportunityStatus.type`.
   */
  confidenceScore: number
  /** Which metric `confidenceScore` represents - widget uses this for the KPI label. */
  confidenceMetric: PipelineConfidenceMetric
  /**
   * True when the confidence component had no data (e.g. IRM pipeline with no closed deals
   * yet). The widget can render "n/a" and the score formula rescales.
   */
  confidenceUnavailable: boolean
}

interface HealthQueryResult {
  totalOpportunities: { aggregate: { count: number; avg?: { winningChance?: number } } }
  stalledOpportunities: { aggregate: { count: number } }
  opportunitySample: Array<{
    createdAt: string
    winningChance?: number | null
  }>
  won?: { aggregate: { count: number } }
  lost?: { aggregate: { count: number } }
}

export interface PipelineHealthConfig {
  opportunityEntity: string // 'Opportunity' or 'InvestmentOpportunity'
  opportunityAggregate: string // 'OpportunityAggregate' or 'InvestmentOpportunityAggregate'
  pipelineField: string // 'salesPipeline' or 'opportunityPipeline'
  /** Confidence metric strategy. Defaults to 'winningChance' to preserve CRM behavior. */
  confidenceMetric?: PipelineConfidenceMetric
  includeStageFilter?: boolean // CRM includes stage filter
  /**
   * Field on `opportunityStatus` to filter buckets by.
   * - CRM ('code'): the OpportunityStatus catalog ships with code = "WON"/"LOST"/"OPEN".
   * - IRM ('type'): InvestmentOpportunityStatus codes are tenant-specific (e.g. "INVESTED",
   *   "DECLINED"); the canonical bucket lives in `type` ("WON"/"LOST"/"OPEN").
   * Defaults to 'code' to preserve existing CRM behavior.
   */
  statusFilterField?: 'code' | 'type'
}

// ============================================================================
// HELPER FUNCTIONS - Reduce cognitive complexity
// ============================================================================

/** Build WHERE conditions for pipeline health queries */
function buildPipelineHealthWhereConditions(
  config: PipelineHealthConfig,
  selectedPipelineId: string | undefined
): { baseWhere: string; activeOppsWhere: string; pipelineFilter: string } {
  const pipelineFilter = selectedPipelineId ? `${config.pipelineField}: {id: {_eq: "${selectedPipelineId}"}}` : ''
  const baseWhere = `isDeleted: {_eq: false} ${pipelineFilter ? ', ' + pipelineFilter : ''}`

  const statusField = config.statusFilterField ?? 'code'
  const activeStatusFilter = `opportunityStatus: {${statusField}: {_nin: ["WON", "LOST"]}}`

  let activeOppsWhere = `${baseWhere}, ${activeStatusFilter}`

  if (config.includeStageFilter) {
    activeOppsWhere = `${baseWhere}, stage: {_nin: ["CLOSED", "LOST"]}, ${activeStatusFilter}, winningChance: {_lte: "100"}`
  }

  return { baseWhere, activeOppsWhere, pipelineFilter }
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

/**
 * Pick the average winning chance from query result (CRM strategy).
 * Falls back to averaging the sample when the aggregate is missing/zero.
 */
function pickAvgWinningChance(result: HealthQueryResult, sample: Array<{ winningChance?: number | null }>): number {
  let avg = result.totalOpportunities?.aggregate?.avg?.winningChance || 0
  if (avg === 0 && sample.length > 0) {
    const validChances = sample
      .filter(opp => opp.winningChance !== null && opp.winningChance !== undefined)
      .map(opp => opp.winningChance!)
    if (validChances.length > 0) {
      avg = validChances.reduce((sum, chance) => sum + chance, 0) / validChances.length
    }
  }
  return avg
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

      const confidenceMetric: PipelineConfidenceMetric = config.confidenceMetric || 'winningChance'
      const usesWinningChance = confidenceMetric === 'winningChance'
      const usesWinRate = confidenceMetric === 'winRate'
      const statusField = config.statusFilterField ?? 'code'

      try {
        setIsLoading(true)
        setError(null)

        const currentDate = new Date()
        const thirtyDaysAgo = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

        // Build where conditions using helper
        const { baseWhere, activeOppsWhere, pipelineFilter } = buildPipelineHealthWhereConditions(
          config,
          selectedPipelineId
        )

        // Build opportunity sample fields
        const sampleFields = usesWinningChance ? `createdAt\nwinningChance` : `createdAt`

        // All-time win/lost slices for realized win-rate strategy.
        // Bucket is decided purely by `opportunityStatus.<statusField>` (status-only filter,
        // no closeDate/updatedAt windowing) so closeDate-null records are still counted.
        const winRateSlices = usesWinRate
          ? `
            won: ${config.opportunityAggregate}(
              where: {
                ${baseWhere},
                opportunityStatus: {${statusField}: {_eq: "WON"}}
              }
            ) {
              aggregate { count }
            }

            lost: ${config.opportunityAggregate}(
              where: {
                ${baseWhere},
                opportunityStatus: {${statusField}: {_eq: "LOST"}}
              }
            ) {
              aggregate { count }
            }
          `
          : ''

        const query = `
          query GetPipelineHealth {
            # Total active opportunities aggregate
            totalOpportunities: ${config.opportunityAggregate}(
              where: { ${activeOppsWhere} }
            ) {
              aggregate {
                count
                ${usesWinningChance ? 'avg { winningChance }' : ''}
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

            ${winRateSlices}
          }
        `

        // Note: pipelineFilter is captured implicitly via baseWhere - reference here
        // keeps the lint rule happy when the variable would otherwise be unused.
        void pipelineFilter

        const result = await graphqlClient.request<HealthQueryResult>(query)

        // Calculate metrics
        const totalOpps = result.totalOpportunities?.aggregate?.count || 0
        const stalledOpps = result.stalledOpportunities?.aggregate?.count || 0
        const sample = result.opportunitySample || []

        // Calculate average opportunity age using helper
        const avgAge = calculateAvgOpportunityAge(sample)

        // Calculate confidence score per strategy
        let confidenceScore = 0
        let confidenceUnavailable = false

        if (usesWinningChance) {
          confidenceScore = pickAvgWinningChance(result, sample)
        } else {
          const won = result.won?.aggregate?.count || 0
          const lost = result.lost?.aggregate?.count || 0
          const closed = won + lost
          if (closed > 0) {
            confidenceScore = (won / closed) * 100
          } else {
            confidenceUnavailable = true
          }
        }

        // Calculate health score (0-100)
        // Factors:
        // - Lower stalled percentage = better (40% weight)
        // - Lower average age = better (30% weight)
        // - Higher confidence (winning chance OR win rate) = better (30% weight)
        // When confidence is unavailable, drop that component and rescale the remaining
        // weights so the score is not artificially capped at 70.
        const stalledPercentage = totalOpps > 0 ? (stalledOpps / totalOpps) * 100 : 0
        const stalledScore = Math.max(0, 100 - stalledPercentage * 2) // Stalled > 50% = 0 score
        const ageScore = Math.max(0, 100 - avgAge) // Age > 100 days = 0 score

        const rawScore = confidenceUnavailable
          ? (stalledScore * 0.4 + ageScore * 0.3) / 0.7
          : stalledScore * 0.4 + ageScore * 0.3 + confidenceScore * 0.3
        const healthScore = Math.round(rawScore)

        setPipelineHealth({
          healthScore: Math.min(100, Math.max(0, healthScore)),
          avgOpportunityAge: Math.round(avgAge),
          totalOpportunities: totalOpps,
          confidenceScore: Math.round(confidenceScore),
          confidenceMetric,
          confidenceUnavailable
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
