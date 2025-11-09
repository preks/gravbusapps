import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  buildCustomerTaskQuery,
  buildCustomerTaskWhereCondition,
  buildCustomerTaskOrderBy
} from '@/common/data/customer/queries/customerTaskQueries.new'
import { toCustomerTask } from '@/common/data/customer/mappers/customerTaskMappers'
import type { CustomerTask } from '@/common/data/customer/types'

export interface ContactTaskQueryVariables {
  contactId: string
}

export type ContactTaskData = CustomerTask

export interface ContactTaskResponse {
  SalesTask: ContactTaskData[]
}

export const useGetContactTasks = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchContactTasks = useCallback(
    async (variables: ContactTaskQueryVariables) => {
      const query = buildCustomerTaskQuery()
      const whereCondition = buildCustomerTaskWhereCondition(
        {},
        [],
        [{ contact: { id: { _eq: variables.contactId } } }]
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
        console.error('Error fetching contact tasks:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchContactTasks }
}
