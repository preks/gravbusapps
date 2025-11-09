// Customer Account hooks - list and by-id operations for customer accounts
import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Types
import type { CustomerAccount } from '../types'

// Use the new query builder functions
import {
  buildCustomerAccountQuery,
  buildCustomerAccountByIdQuery,
  buildCustomerAccountSearchQuery,
  buildCustomerAccountWhereCondition,
  buildCustomerAccountOrderBy,
  type CustomerAccountQueryVariables
} from '../queries/customerAccountQueries.new'

// Mapper
import { toCustomerAccount } from '../mappers/customerAccountMappers'
import { CustomerAccountFields } from '../types/customerAccountTypes'

export interface CustomerAccountListQueryResponse {
  Account: any[]
  AccountAggregate: {
    aggregate: { count: number }
  }
}

export interface CustomerAccountListData {
  accounts: CustomerAccount[]
  total: number
}

export const useCustomerAccounts = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchCustomerAccounts = useCallback(
    async (variables: CustomerAccountQueryVariables = {}): Promise<CustomerAccountListData> => {
      // Build query using new query builder
      const query = buildCustomerAccountQuery()

      // Build where condition using new query builder
      const whereCondition = buildCustomerAccountWhereCondition(variables)

      // Build orderBy using new query builder
      const orderBy = buildCustomerAccountOrderBy(variables.orderBy || [])

      // Prepare GraphQL variables
      const graphQLVariables: Record<string, any> = {
        limit: Math.min(variables.limit || 50, 100),
        offset: variables.offset || 0,
        where: whereCondition,
        orderBy: orderBy
      }

      const result = await graphqlClient.request<CustomerAccountListQueryResponse>(query, graphQLVariables)
      const accounts = result.Account.map(toCustomerAccount)
      const total = result.AccountAggregate?.aggregate?.count || 0
      return { accounts, total }
    },
    [graphqlClient]
  )

  const fetchCustomerAccountById = useCallback(
    async (id: string): Promise<CustomerAccount | null> => {
      const query = buildCustomerAccountByIdQuery(CustomerAccountFields, undefined, id)
      const result = await graphqlClient.request<{ AccountByPk: any }>(query)
      const raw = result.AccountByPk
      return raw ? toCustomerAccount(raw) : null
    },
    [graphqlClient]
  )

  const searchCustomerAccounts = useCallback(
    async (variables: CustomerAccountQueryVariables): Promise<CustomerAccount[]> => {
      const query = buildCustomerAccountSearchQuery()

      const whereCondition = buildCustomerAccountWhereCondition(variables)

      const graphQLVariables = {
        limit: Math.min(variables.limit || 20, 50),
        where: whereCondition
      }

      const result = await graphqlClient.request<{ Account: any[] }>(query, graphQLVariables)
      return result.Account.map(toCustomerAccount)
    },
    [graphqlClient]
  )

  return { fetchCustomerAccounts, fetchCustomerAccountById, searchCustomerAccounts }
}
