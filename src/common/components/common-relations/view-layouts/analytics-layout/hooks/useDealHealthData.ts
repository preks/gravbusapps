import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export type DealScoringStrategy = 'winningChance' | 'stageAndCloseDate'

export interface DealHealthXMetric {
  /** Field on `DealHealthItem` to use as the X axis value (e.g. 'winningChance' or 'stageProgress'). */
  dataKey: 'winningChance' | 'stageProgress'
  /** Human-readable axis/tooltip name. */
  label: string
  /** Optional unit suffix. */
  unit?: string
}

export interface DealHealthItem {
  id: string
  name: string
  /**
   * Win probability in %. Populated only under the 'winningChance' strategy (CRM).
   * Defaults to 0 for IRM so existing typings stay valid.
   */
  winningChance: number
  /**
   * Stage progress in % (`(stageOrderIndex + 1) / totalStagesInPipeline * 100`).
   * Populated only under the 'stageAndCloseDate' strategy (IRM).
   */
  stageProgress?: number
  /** Whichever metric the active strategy puts on the X axis (mirror of one of the above). */
  xMetricValue: number
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
  /** Describes which metric the matrix's X axis represents. */
  xMetric: DealHealthXMetric
}

export interface DealHealthConfig {
  /** Entity to query. */
  entityName: 'Opportunity' | 'InvestmentOpportunity'
  /** Per-deal scoring/X-axis strategy. Defaults to 'winningChance' to preserve CRM behavior. */
  scoringStrategy?: DealScoringStrategy
  /** Stage relation field name (IRM uses 'opportunityPipelineStage'). */
  stageField?: string
  /** Pipeline relation field name (IRM uses 'opportunityPipeline'). */
  pipelineField?: string
  /** Stages catalog identifier used to look up totals per pipeline (IRM). */
  stagesCatalogIdentifier?: string
  /**
   * Field on `opportunityStatus` used to identify the active (not WON/LOST) bucket.
   * - CRM ('code'): the OpportunityStatus catalog ships with code = "WON"/"LOST"/"OPEN".
   * - IRM ('type'): InvestmentOpportunityStatus codes are tenant-specific; the canonical
   *   bucket lives in `type` ("WON"/"LOST"/"OPEN").
   * Defaults to 'code' to preserve existing CRM behavior.
   */
  statusFilterField?: 'code' | 'type'
}

interface OpportunityForHealthScore {
  estimatedAmount?: number
  closeDate?: string
  winningChance?: number
  updatedAt?: string
  opportunityAccounts?: Array<{ account?: { name: string } }>
  ownerEmployee?: { displayName: string }
}

interface OpportunityRow {
  id: string
  name: string
  createdAt: string
  updatedAt?: string
  estimatedAmount?: number
  closeDate?: string
  winningChance?: number
  opportunityAccounts?: Array<{ account?: { name: string } }>
  ownerEmployee?: { displayName: string }
  currency?: { code: string }
  // Dynamic relation fields for IRM (keyed by config.stageField / config.pipelineField)
  [key: string]: unknown
}

interface OpportunityQueryResult {
  opportunities: OpportunityRow[]
}

interface StageCatalogRow {
  id: string
  parentEntryId: string
  additionalValue1?: string | null
}

interface StageCatalogResult {
  stages: StageCatalogRow[]
}

const computeDaysInPipeline = (createdAtIso: string, currentDate: Date): number => {
  const created = new Date(createdAtIso).getTime()
  return Math.floor((currentDate.getTime() - created) / (1000 * 60 * 60 * 24))
}

const applyAgePenalty = (daysInPipeline: number, score: number, riskFactors: string[]): number => {
  if (daysInPipeline > 365) {
    riskFactors.push('Very old opportunity (>1 year)')
    return score - 30
  }
  if (daysInPipeline > 180) {
    riskFactors.push('Old opportunity (>6 months)')
    return score - 20
  }
  if (daysInPipeline > 90) {
    riskFactors.push('Aging opportunity (>3 months)')
    return score - 10
  }
  return score
}

const applyAmountPenalty = (amount: number, score: number, riskFactors: string[]): number => {
  if (amount < 50000) {
    riskFactors.push('Small deal size (<€50k)')
    return score - 10
  }
  if (amount > 200000) {
    return score + 5
  }
  return score
}

const applyAccountOwnerPenalty = (opp: OpportunityForHealthScore, score: number, riskFactors: string[]): number => {
  let next = score
  if (!opp.opportunityAccounts?.length) {
    next -= 15
    riskFactors.push('No associated account')
  }
  if (!opp.ownerEmployee) {
    next -= 20
    riskFactors.push('No assigned owner')
  }
  return next
}

const applyActivityPenalty = (
  opp: OpportunityForHealthScore,
  currentDate: Date,
  score: number,
  riskFactors: string[]
): number => {
  if (!opp.updatedAt) {
    riskFactors.push('No recent activity')
    return score - 15
  }
  const updatedDate = new Date(opp.updatedAt)
  const daysSinceUpdate = Math.floor((currentDate.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24))
  if (daysSinceUpdate > 30) {
    riskFactors.push('No recent activity (>30 days)')
    return score - 15
  }
  return score
}

const applyWinningChanceScoring = (winChance: number, score: number, riskFactors: string[]): number => {
  if (winChance < 30) {
    riskFactors.push('Low win probability (<30%)')
    return score - 25
  }
  if (winChance < 50) {
    riskFactors.push('Moderate win probability (30-50%)')
    return score - 15
  }
  if (winChance > 90) {
    return score + 10
  }
  return score
}

const applyStageProgressScoring = (stageProgress: number, score: number, riskFactors: string[]): number => {
  if (stageProgress < 30) {
    riskFactors.push('Early stage opportunity')
    return score - 25
  }
  if (stageProgress < 50) {
    riskFactors.push('Mid-early stage opportunity')
    return score - 15
  }
  if (stageProgress > 90) {
    return score + 10
  }
  return score
}

const applyCloseDateScoring = (
  closeDateIso: string | undefined,
  currentDate: Date,
  score: number,
  riskFactors: string[]
): number => {
  if (!closeDateIso) return score
  const closeDate = new Date(closeDateIso)
  if (Number.isNaN(closeDate.getTime())) return score

  if (closeDate.getTime() < currentDate.getTime()) {
    riskFactors.push('Past expected close date')
    return score - 20
  }
  const daysToClose = Math.floor((closeDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
  if (daysToClose <= 14) {
    return score + 5
  }
  return score
}

const getHealthCategory = (score: number): DealHealthItem['healthCategory'] => {
  if (score >= 85) return 'excellent'
  if (score >= 70) return 'healthy'
  if (score >= 50) return 'warning'
  return 'critical'
}

const buildOpportunityFieldList = (config: DealHealthConfig): string => {
  const baseFields = `
    id
    name
    estimatedAmount
    createdAt
    updatedAt
    opportunityAccounts(where: { isDeleted: { _eq: false } }, limit: 1) {
      account { name }
    }
    ownerEmployee { displayName }
    currency { code value }
  `

  if (config.scoringStrategy === 'stageAndCloseDate') {
    const stageField = config.stageField || 'opportunityPipelineStage'
    const pipelineField = config.pipelineField || 'opportunityPipeline'
    return `
      ${baseFields}
      closeDate
      ${pipelineField} { id }
      ${stageField} { id value additionalValue1 }
    `
  }

  return `${baseFields}\nwinningChance\ncloseDate`
}

const fetchStageTotalsByPipeline = async (
  graphqlClient: ReturnType<typeof useGraphQLClient>,
  catalogIdentifier: string
): Promise<Map<string, StageCatalogRow[]>> => {
  const query = `
    query GetAllPipelineStages($identifier: String!) {
      stages: CatalogEntry(
        where: {
          catalog: { identifier: { _eq: $identifier } }
          isDeleted: { _eq: false }
        }
        orderBy: { additionalValue1: ASC }
      ) {
        id
        parentEntryId
        additionalValue1
      }
    }
  `
  const result = await graphqlClient.request<StageCatalogResult>(query, { identifier: catalogIdentifier })
  const byPipeline = new Map<string, StageCatalogRow[]>()
  for (const stage of result.stages || []) {
    if (!stage.parentEntryId) continue
    const list = byPipeline.get(stage.parentEntryId) || []
    list.push(stage)
    byPipeline.set(stage.parentEntryId, list)
  }
  return byPipeline
}

const computeStageProgress = (
  opp: OpportunityRow,
  config: DealHealthConfig,
  stagesByPipeline: Map<string, StageCatalogRow[]>
): number => {
  const pipelineField = config.pipelineField || 'opportunityPipeline'
  const stageField = config.stageField || 'opportunityPipelineStage'
  const pipeline = opp[pipelineField] as { id?: string } | undefined
  const stage = opp[stageField] as { id?: string; additionalValue1?: string | null } | undefined
  if (!pipeline?.id || !stage?.id) return 0

  const stagesForPipeline = stagesByPipeline.get(pipeline.id) || []
  if (stagesForPipeline.length === 0) return 0

  // Order index from the catalog (additionalValue1). Fallback to lookup by id.
  let orderIndex: number
  const ownOrder = parseInt(stage.additionalValue1 || '', 10)
  if (!Number.isNaN(ownOrder)) {
    orderIndex = ownOrder
  } else {
    const idx = stagesForPipeline.findIndex(s => s.id === stage.id)
    orderIndex = idx >= 0 ? idx : 0
  }

  const totalStages = stagesForPipeline.length
  const progress = ((orderIndex + 1) / totalStages) * 100
  return Math.max(0, Math.min(100, progress))
}

const buildXMetric = (strategy: DealScoringStrategy): DealHealthXMetric => {
  if (strategy === 'stageAndCloseDate') {
    return { dataKey: 'stageProgress', label: 'Stage Progress', unit: '%' }
  }
  return { dataKey: 'winningChance', label: 'Win Chance', unit: '%' }
}

/**
 * Shared hook for fetching deal health data.
 * Used by both CRM and IRM analytics modules with per-module strategies.
 */
export const useDealHealthData = (accessToken: string, config: DealHealthConfig) => {
  const [data, setData] = useState<DealHealthData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const graphqlClient = useGraphQLClient(accessToken)

  // Stable JSON snapshot for the effect dependency array (avoids resetting state on every render
  // when callers re-create the config object inline).
  const configKey = JSON.stringify(config)

  useEffect(() => {
    const fetchHealthData = async () => {
      if (!accessToken) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const currentDate = new Date()
        const strategy: DealScoringStrategy = config.scoringStrategy || 'winningChance'
        const xMetric = buildXMetric(strategy)

        const fields = buildOpportunityFieldList(config)
        const query = `
          query GetDealHealthData($where: ${config.entityName}BoolExp, $orderBy: [${config.entityName}OrderBy!], $limit: Int) {
            opportunities: ${config.entityName}(where: $where, orderBy: $orderBy, limit: $limit) {
              ${fields}
            }
          }
        `
        // Active opps filter is status-based (matches useGenericPipelineHealth). The previous
        // `closeDate: { _eq: null }` proxy excluded all IRM deals because IRM users set the
        // expected close date up front, even on OPEN opportunities.
        const statusField = config.statusFilterField ?? 'code'
        const variables = {
          where: {
            isDeleted: { _eq: false },
            opportunityStatus: { [statusField]: { _nin: ['WON', 'LOST'] } }
          },
          orderBy: [{ createdAt: 'DESC' as const }],
          limit: 100
        }

        let result: OpportunityQueryResult
        let stagesByPipeline: Map<string, StageCatalogRow[]>
        try {
          ;[result, stagesByPipeline] = await Promise.all([
            graphqlClient.request<OpportunityQueryResult>(query, variables),
            strategy === 'stageAndCloseDate' && config.stagesCatalogIdentifier
              ? fetchStageTotalsByPipeline(graphqlClient, config.stagesCatalogIdentifier)
              : Promise.resolve(new Map<string, StageCatalogRow[]>())
          ])
        } catch (err) {
          console.error('Error fetching deal health data:', err)
          setData({
            healthDistribution: { excellent: 0, healthy: 0, warning: 0, critical: 0 },
            matrixData: [],
            xMetric
          })
          return
        }

        const processed: DealHealthItem[] = (result.opportunities || []).map(opp => {
          const daysInPipeline = computeDaysInPipeline(opp.createdAt, currentDate)
          const riskFactors: string[] = []
          let score = 100
          score = applyAgePenalty(daysInPipeline, score, riskFactors)

          let stageProgress: number | undefined
          let xMetricValue = 0
          if (strategy === 'stageAndCloseDate') {
            stageProgress = computeStageProgress(opp, config, stagesByPipeline)
            score = applyStageProgressScoring(stageProgress, score, riskFactors)
            xMetricValue = stageProgress
          } else {
            const winChance = opp.winningChance || 0
            score = applyWinningChanceScoring(winChance, score, riskFactors)
            xMetricValue = winChance
          }

          score = applyCloseDateScoring(opp.closeDate, currentDate, score, riskFactors)
          score = applyAmountPenalty(opp.estimatedAmount || 0, score, riskFactors)
          score = applyAccountOwnerPenalty(opp, score, riskFactors)
          score = applyActivityPenalty(opp, currentDate, score, riskFactors)

          const clamped = Math.max(0, Math.min(100, score))
          return {
            id: opp.id,
            name: opp.name,
            winningChance: opp.winningChance || 0,
            stageProgress,
            xMetricValue: Math.round(xMetricValue),
            estimatedAmount: opp.estimatedAmount || 0,
            daysInPipeline,
            healthScore: clamped,
            healthCategory: getHealthCategory(clamped),
            riskFactors,
            account: opp.opportunityAccounts?.[0]?.account?.name,
            owner: opp.ownerEmployee?.displayName,
            currencyCode: opp.currency?.code || 'EUR'
          }
        })

        const distribution = processed.reduce(
          (acc, opp) => {
            acc[opp.healthCategory] = (acc[opp.healthCategory] || 0) + 1
            return acc
          },
          { excellent: 0, healthy: 0, warning: 0, critical: 0 }
        )

        setData({ healthDistribution: distribution, matrixData: processed, xMetric })
      } finally {
        setIsLoading(false)
      }
    }
    fetchHealthData()
  }, [accessToken, graphqlClient, configKey])

  return { data, isLoading }
}
