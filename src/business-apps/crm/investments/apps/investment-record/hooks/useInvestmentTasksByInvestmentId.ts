import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GET_INVESTMENT_TASKS_BY_INVESTMENT_ID } from '@/common/data/investment/queries/investmentQueries'
import type { BaseInvestmentTask, InvestmentTask } from '@/common/data/investment/types'
import { toInvestmentTask } from '@/common/data/investment/mappers'

interface InvestmentTasksByInvestmentIdResponse {
  InvestmentTask: BaseInvestmentTask[]
}

export const useGetInvestmentTasksByInvestmentId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentTasksByInvestmentId = useCallback(
    async (investmentId: string): Promise<InvestmentTask[]> => {
      const query = GET_INVESTMENT_TASKS_BY_INVESTMENT_ID(investmentId)

      try {
        const result = await graphqlClient.request<InvestmentTasksByInvestmentIdResponse>(query)
        // Transform base types to enhanced types using mapper
        return result.InvestmentTask.map(toInvestmentTask)
      } catch (error) {
        console.error('Error fetching investment tasks by investment ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentTasksByInvestmentId }
}
