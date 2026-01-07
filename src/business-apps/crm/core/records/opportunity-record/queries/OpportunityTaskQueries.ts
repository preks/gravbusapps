import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  buildCustomerTaskQuery,
  buildCustomerTaskWhereCondition,
  buildCustomerTaskOrderBy
} from '@/common/data/customer/queries/customerTaskQueries'
import { toCustomerTask } from '@/common/data/customer/mappers/customerTaskMappers'
import type { CustomerTask } from '@/common/data/customer/types/customerTaskTypes'

export interface SalesTaskQueryVariables {
  opportunityId: string
}

export type SalesTaskData = CustomerTask

export interface SalesTaskResponse {
  SalesTask: SalesTaskData[]
}

export const useGetSalesTasks = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchSalesTasks = useCallback(
    async (variables: SalesTaskQueryVariables) => {
      const query = buildCustomerTaskQuery()
      const whereCondition = buildCustomerTaskWhereCondition(
        {},
        [],
        [{ opportunity: { id: { _eq: variables.opportunityId } } }]
      )
      const orderBy = buildCustomerTaskOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      const graphQLVariables = {
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<{ SalesTask: any[]; SalesTaskAggregate?: any }>(
          query,
          graphQLVariables
        )
        return {
          SalesTask: result.SalesTask.map(toCustomerTask)
        }
      } catch (error) {
        console.error('Error fetching sales tasks:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchSalesTasks }
}
