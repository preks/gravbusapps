// Investment Account hooks - CRM account entity operations
import { useCallback, useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type {
  BaseInvestmentAccount,
  InvestmentAccount,
  BaseInvestmentTask,
  BaseInvestmentActivity,
  BaseInvestmentNote,
  BaseInvestmentDocument
} from '../types'

// Use the new query imports
import {
  GET_INVESTMENT_ACCOUNTS,
  GET_INVESTMENT_ACCOUNT_BY_ID,
  GET_INVESTMENT_TASKS_BY_ACCOUNT_ID,
  GET_INVESTMENT_ACTIVITIES_BY_ACCOUNT_ID,
  GET_INVESTMENT_NOTES_BY_ACCOUNT_ID,
  GET_INVESTMENT_DOCUMENTS_BY_ACCOUNT_ID,
  type InvestmentAccountQueryVariables
} from '../queries'

// Use the mapper functions
import {
  toInvestmentAccount,
  toInvestmentTask,
  toInvestmentActivity,
  toInvestmentNote,
  toInvestmentDocument
} from '../mappers'

// Note: InvestmentAccountQueryVariables is imported from queries

// Response interfaces
export interface InvestmentAccountQueryResponse {
  InvestmentAccount: BaseInvestmentAccount[]
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

  const graphqlClient = useGraphQLClient(context.accessToken)

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
      const query = GET_INVESTMENT_ACCOUNTS(variables)

      try {
        const result = await graphqlClient.request<InvestmentAccountQueryResponse>(query)

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
                businessKey: account.businessKey,
                code: account.code,
                website: account.website,
                email: account.email,
                phone: account.phone,
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

// Hook for getting investment account by ID
export const useGetInvestmentAccountById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentAccountById = useCallback(
    async (id: string) => {
      const query = GET_INVESTMENT_ACCOUNT_BY_ID(id)

      try {
        // Use a more specific type that includes the contact relationship
        const result = await graphqlClient.request<{
          InvestmentAccount: (BaseInvestmentAccount & {
            investmentAccountContact?: Array<{
              id: string
              contactType?: string
              contact?: any
            }>
          })[]
        }>(query)
        const baseAccount = result.InvestmentAccount[0]

        return {
          account: baseAccount ? toInvestmentAccount(baseAccount) : undefined
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

// Hook for searching investment accounts
export const useSearchInvestmentAccounts = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const searchInvestmentAccounts = useCallback(
    async (searchTerm: string, variables: InvestmentAccountQueryVariables = {}) => {
      const searchVariables = { ...variables, search: searchTerm }
      const query = GET_INVESTMENT_ACCOUNTS(searchVariables)

      try {
        const result = await graphqlClient.request<InvestmentAccountQueryResponse>(query)

        // Transform base types to enhanced types using mapper
        const enhancedAccounts = result.InvestmentAccount.map(toInvestmentAccount)

        return {
          ...result,
          InvestmentAccount: enhancedAccounts
        }
      } catch (error) {
        console.error('Error searching investment accounts:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { searchInvestmentAccounts }
}

// =====================================================
// INVESTMENT ACCOUNT RELATED ENTITIES HOOKS
// =====================================================

// Hook for getting investment tasks by account ID
export const useGetInvestmentTasksByAccountId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentTasksByAccountId = useCallback(
    async (accountId: string) => {
      const query = GET_INVESTMENT_TASKS_BY_ACCOUNT_ID(accountId)

      try {
        const result = await graphqlClient.request<{ InvestmentTask: BaseInvestmentTask[] }>(query)
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
      const query = GET_INVESTMENT_ACTIVITIES_BY_ACCOUNT_ID(accountId)

      try {
        const result = await graphqlClient.request<{ InvestmentActivity: BaseInvestmentActivity[] }>(query)
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
      const query = GET_INVESTMENT_NOTES_BY_ACCOUNT_ID(accountId)

      try {
        const result = await graphqlClient.request<{ InvestmentNote: BaseInvestmentNote[] }>(query)
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
      const query = GET_INVESTMENT_DOCUMENTS_BY_ACCOUNT_ID(accountId)

      try {
        const result = await graphqlClient.request<{ InvestmentDocument: BaseInvestmentDocument[] }>(query)
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
