import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface StageItem {
  stage: string
  count: number
  value: number
}

interface StageQueryResult {
  stages: Array<{
    [key: string]: {
      id: string
      value: string
    } | null
  }>
}

interface AggregateQueryResult {
  [key: string]: {
    aggregate: {
      count: number
      sum: {
        estimatedAmount: number
      } | null
    } | null
  }
}

export interface OpportunitiesByStageConfig {
  opportunityEntity: string // 'Opportunity' or 'InvestmentOpportunity'
  opportunityAggregate: string // 'OpportunityAggregate' or 'InvestmentOpportunityAggregate'
  pipelineStageField: string // 'salesPipelineStage' or 'opportunityPipelineStage'
  pipelineStageRefField: string // 'salesPipelineStageRef' or 'opportunityPipelineStageRef'
  pipelineField: string // 'salesPipeline' or 'opportunityPipeline'
  statusFilterField?: 'code' | 'type'
}

/**
 * Generic Opportunities By Stage Hook using aggregate queries
 * Uses 2-step approach:
 * 1. Get distinct stages
 * 2. Aggregate count and sum per stage
 * Configurable for both CRM and IRM
 */
export const useGenericOpportunitiesByStage = (
  accessToken: string,
  config: OpportunitiesByStageConfig,
  pipelineId?: string,
  activeOnly = false
) => {
  const [data, setData] = useState<StageItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken) {
        setIsLoading(false)
        return
      }
      try {
        setIsLoading(true)
        setError(null)

        // Step 1: Get distinct stages for the selected pipeline
        const pipelineFilter = pipelineId ? `${config.pipelineField}: {id: {_eq: "${pipelineId}"}}` : ''
        const statusField = config.statusFilterField ?? 'code'
        const activeStatusFilter = activeOnly ? `opportunityStatus: {${statusField}: {_nin: ["WON", "LOST"]}}` : ''
        const filters = ['isDeleted: {_eq: false}', pipelineFilter, activeStatusFilter].filter(Boolean)
        const whereClause = filters.join(', ')

        const distinctQuery = `
          query GetDistinctStages {
            stages: ${config.opportunityEntity}(
              where: { ${whereClause} }
              distinctOn: [${config.pipelineStageRefField}]
              limit: 20
            ) {
              ${config.pipelineStageField} {
                id
                value
              }
            }
          }
        `

        const distinctResult = await graphqlClient.request<StageQueryResult>(distinctQuery)
        const stages = distinctResult.stages || []

        if (stages.length === 0) {
          setData([])
          return
        }

        // Step 2: Build dynamic aggregate queries for each stage
        const aggregateQueries = stages
          .map((stageObj, index: number) => {
            const stageData = stageObj[config.pipelineStageField]
            const stageId = stageData?.id

            if (!stageId) return null

            return `
              stage_${index}: ${config.opportunityAggregate}(
                where: {
                  ${whereClause},
                  ${config.pipelineStageRefField}: {_eq: "${stageId}"}
                }
              ) {
                aggregate {
                  count
                  sum {
                    estimatedAmount
                  }
                }
              }
            `
          })
          .filter(Boolean)
          .join('\n')

        const aggregateQuery = `
          query GetOpportunitiesByStageAggregates {
            ${aggregateQueries}
          }
        `

        const aggregateResult = await graphqlClient.request<AggregateQueryResult>(aggregateQuery)

        // Step 3: Map results to StageItem format
        const stageData: StageItem[] = stages.map((stageObj, index: number) => {
          const stageInfo = stageObj[config.pipelineStageField]
          const stageName = stageInfo?.value || 'Unknown'
          const aggregateKey = `stage_${index}`
          const aggregate = aggregateResult[aggregateKey]?.aggregate

          return {
            stage: stageName,
            count: aggregate?.count || 0,
            value: aggregate?.sum?.estimatedAmount || 0
          }
        })

        setData(stageData)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load stage data')
        setData([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [
    accessToken,
    graphqlClient,
    pipelineId,
    activeOnly,
    config.opportunityEntity,
    config.opportunityAggregate,
    config.pipelineStageField,
    config.pipelineStageRefField,
    config.pipelineField,
    config.statusFilterField
  ])

  return { data, isLoading, error }
}
