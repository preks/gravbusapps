// Investment Account hooks - CRM account entity operations
import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GraphQLClient } from '@/common/network/graphql/GraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
// buildWhere and buildOrderBy are now used internally by the new query builders
// Descriptors are now used internally by the new query builders
import type { InvestmentAccount } from '../types/investmentAccountTypes'
import type { InvestmentTask } from '../types/investmentTaskTypes'
import type { InvestmentActivity } from '../types/investmentActivityTypes'
import type { InvestmentNote } from '../types/investmentNoteTypes'
import type { InvestmentDocument } from '../types/investmentDocumentTypes'

// Use the new query builder functions
import {
  buildInvestmentAccountQuery,
  buildInvestmentAccountByIdQuery,
  buildInvestmentAccountWhereCondition,
  buildInvestmentAccountOrderBy,
  type InvestmentAccountQueryVariables
} from '../queries/investmentAccountQueries'

// Use new query builder functions for related entities
import {
  buildInvestmentTaskQuery,
  buildInvestmentTaskWhereCondition,
  buildInvestmentTaskOrderBy,
  type InvestmentTaskQueryVariables
} from '../queries/investmentTaskQueries'

import {
  buildInvestmentActivityByAccountIdQuery,
  buildInvestmentActivityWhereCondition,
  buildInvestmentActivityOrderBy,
  type InvestmentActivityQueryVariables
} from '../queries/investmentActivityQueries'

import {
  buildInvestmentNoteByAccountIdQuery,
  buildInvestmentNoteWhereCondition,
  buildInvestmentNoteOrderBy,
  type InvestmentNoteQueryVariables
} from '../queries/investmentNoteQueries'

import {
  buildInvestmentDocumentQuery,
  buildInvestmentDocumentWhereCondition,
  buildInvestmentDocumentOrderBy,
  type InvestmentDocumentQueryVariables
} from '../queries/investmentDocumentQueries'

// Use the mapper functions
import { toInvestmentAccount } from '../types/investmentAccountTypes'
import { toInvestmentTask } from '../mappers/investmentTaskMappers'
import { toInvestmentActivity, toInvestmentNote, toInvestmentDocument } from '../mappers/investmentRelatedEntityMappers'
// INVESTMENT_ACCOUNT_DESCRIPTORS is now used internally by buildInvestmentAccountWhereCondition/buildInvestmentAccountOrderBy

// Note: InvestmentAccountQueryVariables is imported from queries

// Response interfaces
export interface InvestmentAccountQueryResponse {
  InvestmentAccount: any[]
  InvestmentAccountAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface InvestmentAccountByIdData {
  account?: InvestmentAccount
}

// SelectOption interface for UI components (accounts)
export interface AccountSelectOption {
  id: string
  value: string
  label: string
  name: string
  extraInfo?: {
    businessKey?: string
    code?: string
    website?: string
    email?: string
    phone?: string
    ownerEmployee?: {
      firstName?: string
      lastName?: string
    }
  }
}

// Options for enhanced hook functionality
export interface UseGetInvestmentAccountsOptions {
  withState?: boolean // Enable state management (default: false)
  autoFetch?: boolean // Auto-fetch on mount (default: false)
  pageSize?: number // Items per page (default: 20)
  mapToSelectOptions?: boolean // Transform to AccountSelectOption[] (default: false)
}

// Return type for function-only mode (backward compatible)
interface FunctionOnlyReturn {
  fetchInvestmentAccounts: (variables?: InvestmentAccountQueryVariables) => Promise<InvestmentAccountQueryResponse>
}

// Return type for stateful mode
interface StatefulReturn {
  fetchInvestmentAccounts: (variables?: InvestmentAccountQueryVariables) => Promise<InvestmentAccountQueryResponse>
  options: AccountSelectOption[] | InvestmentAccount[]
  loading: boolean
  error: string | null
  hasMore: boolean
  search: (searchTerm: string) => void
  loadMore: () => void
  reset: () => void
  initialize: () => void
}

/**
 * @deprecated This hook is in transition. Use `useInvestmentAccountsList` instead.
 * The name `useInvestmentAccounts` will be restored to the new declarative hook after migration.
 *
 * Legacy dual-mode hook for investment accounts (function-only or stateful).
 * Prefer the new declarative `useInvestmentAccountsList` hook.
 */
// Function overloads for type safety
export function useGetInvestmentAccounts(
  context: BusinessAppContextProps,
  options: UseGetInvestmentAccountsOptions & { withState: true }
): StatefulReturn

export function useGetInvestmentAccounts(
  context: BusinessAppContextProps,
  options?: UseGetInvestmentAccountsOptions
): FunctionOnlyReturn

// Implementation
export function useGetInvestmentAccounts(
  context: BusinessAppContextProps,
  options?: UseGetInvestmentAccountsOptions
): FunctionOnlyReturn | StatefulReturn {
  const { withState = false, autoFetch = false, pageSize = 20, mapToSelectOptions = false } = options || {}

  const graphqlClient: GraphQLClient = useGraphQLClient(context.accessToken)

  // State management (only used when withState=true)
  const [state, setState] = useState({
    options: [] as AccountSelectOption[] | InvestmentAccount[],
    loading: false,
    error: null as string | null,
    hasMore: false,
    currentSearch: '',
    offset: 0
  })

  // Core fetch function (always available)
  const fetchInvestmentAccounts = useCallback(
    async (variables: InvestmentAccountQueryVariables = {}) => {
      // Use new query builder with fields mapping
      const query = buildInvestmentAccountQuery()

      // Use new WHERE/ORDER BY builders with fields mapping
      const whereCondition = buildInvestmentAccountWhereCondition(variables)

      const orderBy = buildInvestmentAccountOrderBy(variables.orderBy || [])

      const graphQLVariables: Record<string, any> = {
        limit: variables.limit || 50,
        offset: variables.offset || 0,
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<InvestmentAccountQueryResponse>(query, graphQLVariables)

        // Transform base types to enhanced types using mapper
        const enhancedAccounts = result.InvestmentAccount.map(toInvestmentAccount)

        return {
          ...result,
          InvestmentAccount: enhancedAccounts
        }
      } catch (error) {
        console.error('Error fetching investment accounts:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  // Stateful fetch function (only used when withState=true)
  const fetchAccountsWithState = useCallback(
    async (search: string = '', offset: number = 0, append: boolean = false) => {
      if (!context.accessToken) return

      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        ...(append ? {} : { options: [] })
      }))

      try {
        const variables: InvestmentAccountQueryVariables = {
          limit: pageSize,
          offset
        }

        if (search.trim()) {
          variables.search = search.trim()
        }

        const result = await fetchInvestmentAccounts(variables)

        // Map to AccountSelectOption or keep as InvestmentAccount
        const mappedData = mapToSelectOptions
          ? result.InvestmentAccount.map((account: InvestmentAccount) => ({
              id: String(account.id),
              value: String(account.id),
              label: account.name || 'Unknown',
              name: account.name || 'Unknown',
              extraInfo: {
                code: account.code,
                ownerEmployee: account.ownerEmployee
                  ? {
                      firstName: account.ownerEmployee.firstName,
                      lastName: account.ownerEmployee.lastName
                    }
                  : undefined
              }
            }))
          : result.InvestmentAccount

        const hasMoreRecords = result.InvestmentAccount.length === pageSize

        setState(prev => ({
          ...prev,
          options: append ? ([...prev.options, ...mappedData] as typeof mappedData) : mappedData,
          loading: false,
          hasMore: hasMoreRecords,
          currentSearch: search,
          offset: append ? prev.offset + mappedData.length : mappedData.length
        }))
      } catch (error) {
        console.error('Error fetching investment accounts with state:', error)
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch investment accounts'
        }))
      }
    },
    [context.accessToken, fetchInvestmentAccounts, pageSize, mapToSelectOptions]
  )

  // Search function (only used when withState=true)
  const search = useCallback(
    (searchTerm: string) => {
      fetchAccountsWithState(searchTerm, 0, false)
    },
    [fetchAccountsWithState]
  )

  // Load more function (only used when withState=true)
  const loadMore = useCallback(() => {
    if (state.hasMore && !state.loading) {
      fetchAccountsWithState(state.currentSearch, state.offset, true)
    }
  }, [fetchAccountsWithState, state.hasMore, state.loading, state.currentSearch, state.offset])

  // Reset function (only used when withState=true)
  const reset = useCallback(() => {
    setState({
      options: [],
      loading: false,
      error: null,
      hasMore: false,
      currentSearch: '',
      offset: 0
    })
  }, [])

  // Initialize function (only used when withState=true)
  const initialize = useCallback(() => {
    fetchAccountsWithState('', 0, false)
  }, [fetchAccountsWithState])

  // Auto-fetch on mount (only when withState=true and autoFetch=true)
  useEffect(() => {
    if (withState && autoFetch && context.accessToken) {
      initialize()
    }
  }, [withState, autoFetch, context.accessToken, initialize])

  // Return appropriate interface based on withState flag
  if (withState) {
    return {
      fetchInvestmentAccounts,
      options: state.options,
      loading: state.loading,
      error: state.error,
      hasMore: state.hasMore,
      search,
      loadMore,
      reset,
      initialize
    }
  }

  // Backward compatible: return only the fetch function
  return { fetchInvestmentAccounts }
}

/**
 * Declarative List Hook for Investment Accounts
 *
 * Automatically fetches and manages state for a list of investment accounts.
 * Follows the Hook Refactoring Guide Pattern 2.
 *
 * @example
 * const { accounts, loading, error, refetch } = useInvestmentAccountsList(context, { limit: 20 })
 *
 * @todo MIGRATION: Replace all usages of deprecated `useGetInvestmentAccounts` with this hook
 * @todo RENAME: After migration is complete, rename this hook to `useInvestmentAccounts` and remove the deprecated hook
 */
export interface UseInvestmentAccountsListResult {
  accounts: InvestmentAccount[]
  total: number
  loading: boolean
  error: string | null
  hasMore: boolean
  refetch: (variables?: InvestmentAccountQueryVariables) => Promise<void>
  search: (searchTerm: string) => void
  loadMore: () => void
}

export function useInvestmentAccountsList(
  context: BusinessAppContextProps,
  variables?: InvestmentAccountQueryVariables
): UseInvestmentAccountsListResult {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const pageSize = variables?.limit || 20

  // Memoize variables to prevent infinite loops when object is recreated on each render
  const stableVariables = useMemo(() => variables, [JSON.stringify(variables)])

  const [state, setState] = useState({
    accounts: [] as InvestmentAccount[],
    total: 0,
    loading: true,
    error: null as string | null,
    hasMore: false
  })

  const currentSearchRef = useRef('')
  const currentOffsetRef = useRef(0)

  const fetchPage = useCallback(
    async (searchTerm: string, offset: number, append: boolean) => {
      if (!context.accessToken) {
        setState(prev => ({ ...prev, loading: false }))
        return
      }

      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        ...(append ? {} : { accounts: [] })
      }))

      try {
        const vars: InvestmentAccountQueryVariables = {
          ...stableVariables,
          limit: pageSize,
          offset,
          ...(searchTerm.trim() ? { search: searchTerm.trim() } : {})
        }

        const query = buildInvestmentAccountQuery()
        const whereCondition = buildInvestmentAccountWhereCondition(vars)
        const orderBy = buildInvestmentAccountOrderBy(vars.orderBy || [])

        const graphQLVariables: Record<string, any> = {
          limit: pageSize,
          offset,
          where: whereCondition,
          orderBy
        }

        const result = await graphqlClient.request<InvestmentAccountQueryResponse>(query, graphQLVariables)
        const fetched = result.InvestmentAccount.map(toInvestmentAccount)
        const total = result.InvestmentAccountAggregate?.aggregate?.count || 0
        const hasMore = fetched.length === pageSize

        currentOffsetRef.current = (append ? currentOffsetRef.current : 0) + fetched.length

        setState(prev => ({
          accounts: append ? [...prev.accounts, ...fetched] : fetched,
          total,
          loading: false,
          error: null,
          hasMore
        }))
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch investment accounts'

        setState(prev => ({
          ...prev,
          ...(append ? {} : { accounts: [], total: 0 }),
          loading: false,
          error: errorMessage,
          hasMore: false
        }))
      }
    },
    [context.accessToken, graphqlClient, stableVariables, pageSize]
  )

  useEffect(() => {
    currentSearchRef.current = ''
    currentOffsetRef.current = 0
    fetchPage('', 0, false)
  }, [fetchPage])

  const refetch = useCallback(
    async (queryVariables?: InvestmentAccountQueryVariables) => {
      const searchTerm = (queryVariables?.search as string) || ''
      currentSearchRef.current = searchTerm
      currentOffsetRef.current = 0
      await fetchPage(searchTerm, 0, false)
    },
    [fetchPage]
  )

  const search = useCallback(
    (searchTerm: string) => {
      currentSearchRef.current = searchTerm
      currentOffsetRef.current = 0
      fetchPage(searchTerm, 0, false)
    },
    [fetchPage]
  )

  const loadMore = useCallback(() => {
    if (state.hasMore && !state.loading) {
      fetchPage(currentSearchRef.current, currentOffsetRef.current, true)
    }
  }, [fetchPage, state.hasMore, state.loading])

  return {
    ...state,
    refetch,
    search,
    loadMore
  }
}

// Hook for getting investment account by ID
export const useGetInvestmentAccountById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentAccountById = useCallback(
    async (id: string) => {
      // Use new query builder with fields mapping
      const query = buildInvestmentAccountByIdQuery()

      try {
        // Use a more specific type that includes the contact relationship
        const result = await graphqlClient.request<{
          InvestmentAccountByPk:
            | (InvestmentAccount & {
                investmentAccountContact?: Array<{
                  id: string
                  contactType?: string
                  contact?: any
                }>
              })
            | null
        }>(query, { id })
        const raw = result.InvestmentAccountByPk

        return {
          account: raw ? toInvestmentAccount(raw) : undefined
        } as InvestmentAccountByIdData
      } catch (error) {
        console.error('Error fetching investment account by ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentAccountById }
}

// =====================================================
// INVESTMENT ACCOUNT RELATED ENTITIES HOOKS
// =====================================================

// Hook for getting investment tasks by account ID
export const useGetInvestmentTasksByAccountId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentTasksByAccountId = useCallback(
    async (accountId: string) => {
      // Use new query builder with fields mapping
      const query = buildInvestmentTaskQuery()

      const variables: InvestmentTaskQueryVariables = {
        accountIds: [accountId]
      }

      // Use new WHERE/ORDER BY builders with fields mapping
      const whereCondition = buildInvestmentTaskWhereCondition(variables)
      const orderBy = buildInvestmentTaskOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      const graphQLVariables: Record<string, any> = {
        limit: 1000,
        offset: 0,
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<{ InvestmentTask: InvestmentTask[] }>(query, graphQLVariables)
        // Transform base types to enhanced types using mapper
        return result.InvestmentTask.map(toInvestmentTask)
      } catch (error) {
        console.error('Error fetching investment tasks by account ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentTasksByAccountId }
}

// Hook for getting investment activities by account ID
export const useGetInvestmentActivitiesByAccountId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentActivitiesByAccountId = useCallback(
    async (accountId: string) => {
      // Use account-specific query builder that includes documents
      const query = buildInvestmentActivityByAccountIdQuery()

      const variables: InvestmentActivityQueryVariables = {
        accountIds: [accountId]
      }

      // Use new WHERE/ORDER BY builders with fields mapping
      const whereCondition = buildInvestmentActivityWhereCondition(variables)
      const orderBy = buildInvestmentActivityOrderBy([{ field: 'occurredAt', direction: 'DESC_NULLS_LAST' }])

      const graphQLVariables: Record<string, any> = {
        limit: 1000,
        offset: 0,
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<{ InvestmentActivity: InvestmentActivity[] }>(
          query,
          graphQLVariables
        )
        // Transform base types to enhanced types using mapper
        return result.InvestmentActivity.map(toInvestmentActivity)
      } catch (error) {
        console.error('Error fetching investment activities by account ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentActivitiesByAccountId }
}

// Hook for getting investment notes by account ID
export const useGetInvestmentNotesByAccountId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentNotesByAccountId = useCallback(
    async (accountId: string) => {
      // Use account-specific query builder that includes documents
      const query = buildInvestmentNoteByAccountIdQuery()

      const variables: InvestmentNoteQueryVariables = {
        accountIds: [accountId]
      }

      // Use new WHERE/ORDER BY builders with fields mapping
      const whereCondition = buildInvestmentNoteWhereCondition(variables)
      const orderBy = buildInvestmentNoteOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      const graphQLVariables: Record<string, any> = {
        limit: 1000,
        offset: 0,
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<{ InvestmentNote: InvestmentNote[] }>(query, graphQLVariables)
        // Transform base types to enhanced types using mapper
        return result.InvestmentNote.map(toInvestmentNote)
      } catch (error) {
        console.error('Error fetching investment notes by account ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentNotesByAccountId }
}

// Hook for getting investment documents by account ID
export const useGetInvestmentDocumentsByAccountId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentDocumentsByAccountId = useCallback(
    async (accountId: string) => {
      // Use new query builder with fields mapping
      const query = buildInvestmentDocumentQuery()

      const variables: InvestmentDocumentQueryVariables = {
        accountIds: [accountId]
      }

      // Use new WHERE/ORDER BY builders with fields mapping
      const whereCondition = buildInvestmentDocumentWhereCondition(variables)
      const orderBy = buildInvestmentDocumentOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      const graphQLVariables: Record<string, any> = {
        limit: 1000,
        offset: 0,
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<{ InvestmentDocument: InvestmentDocument[] }>(
          query,
          graphQLVariables
        )
        // Transform base types to enhanced types using mapper
        return result.InvestmentDocument.map(toInvestmentDocument)
      } catch (error) {
        console.error('Error fetching investment documents by account ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentDocumentsByAccountId }
}
