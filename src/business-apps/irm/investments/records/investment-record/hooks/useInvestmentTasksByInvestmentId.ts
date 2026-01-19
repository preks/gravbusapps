import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  buildInvestmentTaskByInvestmentIdQuery,
  buildInvestmentTaskWhereCondition,
  buildInvestmentTaskOrderBy
} from '@/common/data/investment/queries/investmentTaskQueries'
import type { InvestmentTask } from '@/common/data/investment/types/investmentTaskTypes'
import { toInvestmentTask } from '@/common/data/investment/mappers/investmentTaskMappers'

interface InvestmentTasksByInvestmentIdResponse {
  InvestmentTask: InvestmentTask[]
}

export const useGetInvestmentTasksByInvestmentId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentTasksByInvestmentId = useCallback(
    async (investmentId: string): Promise<InvestmentTask[]> => {
      const query = buildInvestmentTaskByInvestmentIdQuery()
      const customConditions: Record<string, any>[] = [
        { investment: { id: { _eq: investmentId } } },
        { isDeleted: { _eq: false } }
      ]
      const whereCondition = buildInvestmentTaskWhereCondition({}, [], customConditions)
      const orderBy = buildInvestmentTaskOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      const graphQLVariables = {
        limit: 1000,
        offset: 0,
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<InvestmentTasksByInvestmentIdResponse>(query, graphQLVariables)
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
