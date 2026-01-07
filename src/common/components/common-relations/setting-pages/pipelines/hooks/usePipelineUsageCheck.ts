import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface UsageCheckResult {
  isInUse: boolean
  totalCount: number
}

export const usePipelineUsageCheck = (accessToken: string, sourceApp: 'CRM' | 'IRM' = 'CRM') => {
  const graphqlClient = useGraphQLClient(accessToken)

  const opportunityTable = sourceApp === 'CRM' ? 'Opportunity' : 'InvestmentOpportunity'
  const pipelineRefField = sourceApp === 'CRM' ? 'salesPipelineRef' : 'opportunityPipelineRef'
  const stageRefField = sourceApp === 'CRM' ? 'salesPipelineStageRef' : 'opportunityPipelineStageRef'

  const checkPipelineUsage = async (pipelineId: string): Promise<UsageCheckResult> => {
    try {
      const query = `
        query CheckPipelineUsage($pipelineId: String!) {
          totalCount: ${opportunityTable}Aggregate(
            where: {
              ${pipelineRefField}: { _eq: $pipelineId }
            }
          ) {
            aggregate {
              count
            }
          }
        }
      `

      const result = await graphqlClient.request<{
        totalCount: { aggregate: { count: number } }
      }>(query, { pipelineId })

      const totalCount = result.totalCount.aggregate.count

      return {
        isInUse: totalCount > 0,
        totalCount
      }
    } catch (error) {
      console.error('Error checking pipeline usage:', error)
      // If query fails, assume it's NOT in use to allow deletion attempts
      return { isInUse: false, totalCount: 0 }
    }
  }

  const checkStageUsage = async (stageId: string): Promise<UsageCheckResult> => {
    try {
      const query = `
        query CheckStageUsage($stageId: String!) {
          totalCount: ${opportunityTable}Aggregate(
            where: {
              ${stageRefField}: { _eq: $stageId }
            }
          ) {
            aggregate {
              count
            }
          }
        }
      `

      const result = await graphqlClient.request<{
        totalCount: { aggregate: { count: number } }
      }>(query, { stageId })

      const totalCount = result.totalCount.aggregate.count

      return {
        isInUse: totalCount > 0,
        totalCount
      }
    } catch (error) {
      console.error('Error checking stage usage:', error)
      // If query fails, assume it's NOT in use to allow deletion attempts
      return { isInUse: false, totalCount: 0 }
    }
  }

  return { checkPipelineUsage, checkStageUsage }
}
