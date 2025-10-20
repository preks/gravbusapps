import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface StageItem {
  stage: string
  count: number
  value: number
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

        const query = pipelineId
          ? `
          query GetOpportunitiesByStage($pipelineId: uuid!) {
            opportunities: Opportunity(
              where: { isDeleted: { _eq: false }, salesPipeline: { id: { _eq: $pipelineId } } }
            ) { id stage estimatedAmount }
          }
        `
          : `
          query GetOpportunitiesByStageAll {
            opportunities: Opportunity(
              where: { isDeleted: { _eq: false } }
            ) { id stage estimatedAmount }
          }
        `
        const variables: any = pipelineId ? { pipelineId } : {}
        const result = await graphqlClient.request<any>(query, variables)
        const stageGroups = (result.opportunities || []).reduce((acc: Record<string, StageItem>, opp: any) => {
          const stage = opp.stage || 'Unknown'
          if (!acc[stage]) acc[stage] = { stage, count: 0, value: 0 }
          acc[stage].count += 1
          acc[stage].value += opp.estimatedAmount || 0
          return acc
        }, {})
        setData(Object.values(stageGroups))
      } catch (e: any) {
        setError(e?.message || 'Failed to load stage data')
        setData([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [accessToken, graphqlClient, pipelineId])

  return { data, isLoading, error }
}
