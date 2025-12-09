import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface StageItem {
  stage: string
  count: number
  value: number
}

interface StageQueryResult {
  stages: Array<{
    opportunityPipelineStage: {
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

/**
 * IRM hook for fetching opportunities by stage using aggregates (optimized)
 * Uses 2-step approach like CRM:
 * 1. Get distinct stages
 * 2. Aggregate count and sum per stage
 */
export const useOpportunitiesByStage = (accessToken: string, pipelineId?: string) => {
  const [data, setData] = useState<StageItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken) return
      try {
        setIsLoading(true)
        setError(null)

        // Step 1: Get distinct stages for the selected pipeline
        const pipelineFilter = pipelineId ? `opportunityPipeline: {id: {_eq: "${pipelineId}"}}` : ''
        const whereClause = pipelineFilter ? `isDeleted: {_eq: false}, ${pipelineFilter}` : `isDeleted: {_eq: false}`

        const distinctQuery = `
          query GetDistinctInvestmentOpportunityStages {
            stages: InvestmentOpportunity(
              where: { ${whereClause} }
              distinctOn: [opportunityPipelineStageRef]
              limit: 20
            ) {
              opportunityPipelineStage {
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
            const stageId = stageObj.opportunityPipelineStage?.id

            if (!stageId) return null

            return `
              stage_${index}: InvestmentOpportunityAggregate(
                where: {
                  isDeleted: {_eq: false},
                  opportunityPipelineStageRef: {_eq: "${stageId}"}
                  ${pipelineFilter ? ', ' + pipelineFilter : ''}
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
          query GetInvestmentOpportunitiesByStageAggregates {
            ${aggregateQueries}
          }
        `

        const aggregateResult = await graphqlClient.request<AggregateQueryResult>(aggregateQuery)

        // Step 3: Map results to StageItem format
        const stageData: StageItem[] = stages.map((stageObj, index: number) => {
          const stageName = stageObj.opportunityPipelineStage?.value || 'Unknown'
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
  }, [accessToken, graphqlClient, pipelineId])

  return { data, isLoading, error }
}
