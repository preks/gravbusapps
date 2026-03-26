// Customer Account hooks - list and by-id operations for customer accounts
import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GraphQLClient } from '@/common/network/graphql/GraphQLClient'
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
  const graphqlClient: GraphQLClient = useGraphQLClient(context.accessToken)

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
        limit: variables.limit || 50,
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
  hasMore: boolean
  search: (searchTerm: string) => void
  loadMore: () => void
  refetch: () => Promise<void>
}

export function useCustomerAccountsList(
  context: BusinessAppContextProps,
  variables?: CustomerAccountQueryVariables
): UseCustomerAccountsListResult {
  const graphqlClient = useGraphQLClient(context.accessToken)

  // Memoize variables to prevent infinite loops when object is recreated on each render
  const stableVariables = useMemo(() => variables, [JSON.stringify(variables)])
  const pageSize = stableVariables?.limit || 20

  const [state, setState] = useState({
    accounts: [] as CustomerAccount[],
    total: 0,
    loading: true,
    error: null as string | null,
    hasMore: false
  })

  // Refs for synchronous tracking — React setState is async so we cannot rely on
  // state values inside loadMore guard; refs update immediately.
  const isFetchingRef = useRef(false)
  const currentSearchRef = useRef('')
  const currentOffsetRef = useRef(0)

  const fetchPage = useCallback(
    async (searchTerm: string, offset: number, append: boolean) => {
      // Synchronous guard — prevents the Combobox intersection observer from
      // triggering concurrent fetches with the same offset before React re-renders.
      if (isFetchingRef.current) return
      if (!context.accessToken) {
        setState(prev => ({ ...prev, loading: false }))
        return
      }

      isFetchingRef.current = true
      setState(prev => ({ ...prev, loading: true, error: null }))

      try {
        const vars: CustomerAccountQueryVariables = { ...stableVariables, limit: pageSize, offset }
        if (searchTerm.trim()) {
          vars.search = searchTerm.trim()
        } else {
          delete vars.search
        }

        const query = buildCustomerAccountQuery()
        const whereCondition = buildCustomerAccountWhereCondition(vars)
        const orderBy = buildCustomerAccountOrderBy(vars.orderBy || [])

        const graphQLVariables: Record<string, any> = {
          limit: pageSize,
          offset,
          where: whereCondition,
          orderBy
        }

        const result = await graphqlClient.request<CustomerAccountListQueryResponse>(query, graphQLVariables)
        const newAccounts = result.Account.map(toCustomerAccount)
        const total = result.AccountAggregate?.aggregate?.count || 0
        const newOffset = offset + newAccounts.length
        // If we received a full page, there may be more; less than a full page means we're done.
        const hasMore = newAccounts.length === pageSize

        currentOffsetRef.current = newOffset

        setState(prev => ({
          accounts: append ? [...prev.accounts, ...newAccounts] : newAccounts,
          total,
          loading: false,
          error: null,
          hasMore
        }))
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch customer accounts'
        setState(prev => ({ ...prev, loading: false, error: errorMessage }))
      } finally {
        isFetchingRef.current = false
      }
    },
    [context.accessToken, graphqlClient, stableVariables, pageSize]
  )

  useEffect(() => {
    currentSearchRef.current = ''
    currentOffsetRef.current = 0
    fetchPage('', 0, false)
  }, [fetchPage])

  const search = useCallback(
    (searchTerm: string) => {
      currentSearchRef.current = searchTerm
      currentOffsetRef.current = 0
      fetchPage(searchTerm, 0, false)
    },
    [fetchPage]
  )

  const loadMore = useCallback(() => {
    if (state.hasMore && !isFetchingRef.current) {
      fetchPage(currentSearchRef.current, currentOffsetRef.current, true)
    }
  }, [fetchPage, state.hasMore])

  const refetch = useCallback(async () => {
    currentOffsetRef.current = 0
    await fetchPage(currentSearchRef.current, 0, false)
  }, [fetchPage])

  return {
    ...state,
    search,
    loadMore,
    refetch
  }
}
