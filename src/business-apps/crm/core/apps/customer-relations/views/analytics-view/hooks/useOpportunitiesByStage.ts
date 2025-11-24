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

        // Build the pipeline filter using string interpolation like IRM version
        const pipelineFilter = pipelineId ? `salesPipeline: {id: {_eq: "${pipelineId}"}}` : ''
        const whereClause = pipelineFilter ? `isDeleted: {_eq: false}, ${pipelineFilter}` : `isDeleted: {_eq: false}`

        const query = `
          query GetOpportunitiesByStage {
            opportunities: Opportunity(
              where: { ${whereClause} }
            ) {
              id
              stage
              estimatedAmount
            }
          }
        `

        const result = await graphqlClient.request<any>(query)
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
