// Customer Account hooks - list and by-id operations for customer accounts
import { useCallback, useState, useEffect, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Types
import type { CustomerAccount } from '../types/customerAccountTypes'

// Use the new query builder functions
import {
  buildCustomerAccountQuery,
  buildCustomerAccountWhereCondition,
  buildCustomerAccountOrderBy,
  type CustomerAccountQueryVariables
} from '../queries/customerAccountQueries'

// Mapper
import { toCustomerAccount } from '../types/customerAccountTypes'

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

/**
 * @deprecated This hook is in transition. Use `useCustomerAccountsList` instead.
 * The name `useCustomerAccounts` will be restored to the new declarative hook after migration.
 *
 * Legacy function-only hook for customer accounts.
 * Returns fetch functions without state management.
 */
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
  return { fetchCustomerAccounts }
}

/**
 * Declarative List Hook for Customer Accounts
 *
 * Automatically fetches and manages state for a list of customer accounts.
 * Follows the Hook Refactoring Guide Pattern 2.
 *
 * @example
 * const { accounts, loading, error, refetch } = useCustomerAccountsList(context, { limit: 20 })
 *
 * @todo MIGRATION: Replace all usages of deprecated `useCustomerAccounts` with this hook
 * @todo RENAME: After migration is complete, rename this hook to `useCustomerAccounts` and remove the deprecated hook
 */
export interface UseCustomerAccountsListResult {
  accounts: CustomerAccount[]
  total: number
  loading: boolean
  error: string | null
  refetch: (variables?: CustomerAccountQueryVariables) => Promise<void>
}

export function useCustomerAccountsList(
  context: BusinessAppContextProps,
  variables?: CustomerAccountQueryVariables
): UseCustomerAccountsListResult {
  const graphqlClient = useGraphQLClient(context.accessToken)

  // Memoize variables to prevent infinite loops when object is recreated on each render
  const stableVariables = useMemo(() => variables, [JSON.stringify(variables)])

  const [state, setState] = useState({
    accounts: [] as CustomerAccount[],
    total: 0,
    loading: true,
    error: null as string | null
  })

  const fetchAccounts = useCallback(
    async (queryVariables?: CustomerAccountQueryVariables) => {
      if (!context.accessToken) {
        setState(prev => ({ ...prev, loading: false }))
        return
      }

      setState(prev => ({ ...prev, loading: true, error: null }))

      try {
        const vars = { ...stableVariables, ...queryVariables }
        const query = buildCustomerAccountQuery()
        const whereCondition = buildCustomerAccountWhereCondition(vars)
        const orderBy = buildCustomerAccountOrderBy(vars.orderBy || [])

        const graphQLVariables: Record<string, any> = {
          limit: Math.min(vars.limit || 50, 100),
          offset: vars.offset || 0,
          where: whereCondition,
          orderBy: orderBy
        }

        const result = await graphqlClient.request<CustomerAccountListQueryResponse>(query, graphQLVariables)
        const accounts = result.Account.map(toCustomerAccount)
        const total = result.AccountAggregate?.aggregate?.count || 0

        setState({ accounts, total, loading: false, error: null })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch customer accounts'

        setState(prev => ({
          ...prev,
          accounts: [],
          total: 0,
          loading: false,
          error: errorMessage
        }))
      }
    },
    [context.accessToken, graphqlClient, stableVariables]
  )

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  return {
    ...state,
    refetch: fetchAccounts
  }
}
