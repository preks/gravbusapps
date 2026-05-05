import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface UsageCheckResult {
  isInUse: boolean
  totalCount: number
  verificationFailed?: boolean
}

export const usePipelineUsageCheck = (accessToken: string, sourceApp: 'CRM' | 'IRM' = 'CRM') => {
  const graphqlClient = useGraphQLClient(accessToken)

  const opportunityTable = sourceApp === 'CRM' ? 'Opportunity' : 'InvestmentOpportunity'
  const pipelineRefField = sourceApp === 'CRM' ? 'salesPipelineRef' : 'opportunityPipelineRef'
  const stageRefField = sourceApp === 'CRM' ? 'salesPipelineStageRef' : 'opportunityPipelineStageRef'
  const getVerificationFailedResult = (): UsageCheckResult => ({
    isInUse: true,
    totalCount: 0,
    verificationFailed: true
  })

  const checkPipelineUsage = async (pipelineId: string): Promise<UsageCheckResult> => {
    if (!accessToken) {
      return getVerificationFailedResult()
    }

    try {
      const query = `
        query CheckPipelineUsage($pipelineId: String!) {
          totalCount: ${opportunityTable}Aggregate(
            where: {
              isDeleted: { _eq: false }
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
      return getVerificationFailedResult()
    }
  }

  const checkStageUsage = async (stageId: string): Promise<UsageCheckResult> => {
    if (!accessToken) {
      return getVerificationFailedResult()
    }

    try {
      const query = `
        query CheckStageUsage($stageId: String!) {
          totalCount: ${opportunityTable}Aggregate(
            where: {
              isDeleted: { _eq: false }
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
      return getVerificationFailedResult()
    }
  }

  return { checkPipelineUsage, checkStageUsage }
}
