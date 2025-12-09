import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface StageItem {
  stage: string
  count: number
  value: number
}

interface StageQueryResult {
  stages: Array<{
    salesPipelineStage: {
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
        const pipelineFilter = pipelineId ? `salesPipeline: {id: {_eq: "${pipelineId}"}}` : ''
        const whereClause = pipelineFilter ? `isDeleted: {_eq: false}, ${pipelineFilter}` : `isDeleted: {_eq: false}`

        const distinctQuery = `
          query GetDistinctStages {
            stages: Opportunity(
              where: { ${whereClause} }
              distinctOn: [salesPipelineStageRef]
              limit: 20
            ) {
              salesPipelineStage {
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
            const stageId = stageObj.salesPipelineStage?.id

            if (!stageId) return null

            return `
              stage_${index}: OpportunityAggregate(
                where: {
                  isDeleted: {_eq: false},
                  salesPipelineStageRef: {_eq: "${stageId}"}
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
          query GetOpportunitiesByStageAggregates {
            ${aggregateQueries}
          }
        `

        const aggregateResult = await graphqlClient.request<AggregateQueryResult>(aggregateQuery)

        // Step 3: Map results to StageItem format
        const stageData: StageItem[] = stages.map((stageObj, index: number) => {
          const stageName = stageObj.salesPipelineStage?.value || 'Unknown'
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
