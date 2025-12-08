/**
 * Equity Investment hooks
 * Hooks for fetching EquityInvestment entities
 */

import { useCallback, useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  buildEquityInvestmentQuery,
  buildEquityInvestmentByIdQuery,
  buildEquityInvestmentWhereCondition,
  buildEquityInvestmentOrderBy,
  type EquityInvestmentQueryVariables
} from '../queries/equityInvestmentQueries'

// Response interfaces
export interface EquityInvestment {
  id: string
  investment?: {
    id: string
    name: string
    code?: string
  }
  createdAt?: string
  updatedAt?: string
}

export interface EquityInvestmentQueryResponse {
  EquityInvestment: EquityInvestment[]
  EquityInvestmentAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface EquityInvestmentByIdResponse {
  EquityInvestmentByPk: EquityInvestment | null
}

// SelectOption interface for UI components
export interface EquityInvestmentSelectOption {
  id: string
  value: string
  label: string
  name: string
  investmentName?: string
}

// Options for enhanced hook functionality
export interface UseGetEquityInvestmentsOptions {
  withState?: boolean
  autoFetch?: boolean
  pageSize?: number
  mapToSelectOptions?: boolean
}

// Return type for function-only mode
interface FunctionOnlyReturn {
  fetchEquityInvestments: (variables?: EquityInvestmentQueryVariables) => Promise<EquityInvestmentQueryResponse>
}

// Return type for stateful mode
interface StatefulReturn {
  fetchEquityInvestments: (variables?: EquityInvestmentQueryVariables) => Promise<EquityInvestmentQueryResponse>
  options: EquityInvestmentSelectOption[] | EquityInvestment[]
  loading: boolean
  error: string | null
  hasMore: boolean
  search: (searchTerm: string) => void
  loadMore: () => void
  reset: () => void
  initialize: () => void
}

/**
 * Hook for fetching equity investments
 * Supports both function-only mode and stateful mode with pagination/search
 */
export function useGetEquityInvestments(
  context: BusinessAppContextProps,
  options: UseGetEquityInvestmentsOptions & { withState: true }
): StatefulReturn

export function useGetEquityInvestments(
  context: BusinessAppContextProps,
  options?: UseGetEquityInvestmentsOptions
): FunctionOnlyReturn

export function useGetEquityInvestments(
  context: BusinessAppContextProps,
  options?: UseGetEquityInvestmentsOptions
): FunctionOnlyReturn | StatefulReturn {
  const { withState = false, autoFetch = false, pageSize = 50, mapToSelectOptions = false } = options || {}

  const graphqlClient = useGraphQLClient(context.accessToken)

  // State management (only used when withState=true)
  const [state, setState] = useState({
    options: [] as EquityInvestmentSelectOption[] | EquityInvestment[],
    loading: false,
    error: null as string | null,
    hasMore: false,
    currentSearch: '',
    offset: 0
  })

  // Core fetch function (always available)
  const fetchEquityInvestments = useCallback(
    async (variables: EquityInvestmentQueryVariables = {}) => {
      const query = buildEquityInvestmentQuery()

      // Build where condition and orderBy using helper functions
      const whereCondition = buildEquityInvestmentWhereCondition(variables)
      const orderBy = buildEquityInvestmentOrderBy(variables.orderBy || [])

      // Prepare GraphQL variables object
      const graphQLVariables: Record<string, any> = {
        limit: Math.min(variables.limit || pageSize, 100),
        offset: variables.offset || 0,
        where: whereCondition,
        orderBy: orderBy.length > 0 ? orderBy : [{ investment: { name: 'ASC_NULLS_LAST' } }]
      }

      try {
        const result = await graphqlClient.request<EquityInvestmentQueryResponse>(query, graphQLVariables)
        return result
      } catch (error) {
        console.error('Error fetching equity investments:', error)
        throw error
      }
    },
    [graphqlClient, pageSize]
  )

  // Stateful fetch function (only used when withState=true)
  const fetchEquityInvestmentsWithState = useCallback(
    async (search: string = '', offset: number = 0, append: boolean = false) => {
      if (!context.accessToken) return

      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        ...(append ? {} : { options: [] })
      }))

      try {
        const variables: EquityInvestmentQueryVariables = {
          limit: pageSize,
          offset
        }

        if (search.trim()) {
          variables.search = search.trim()
        }

        const result = await fetchEquityInvestments(variables)

        // Map to SelectOption or keep as EquityInvestment
        const mappedData = mapToSelectOptions
          ? result.EquityInvestment.filter(eq => eq.investment).map(eq => ({
              id: eq.id,
              value: eq.id,
              label: eq.investment?.name || 'Unknown',
              name: eq.investment?.name || 'Unknown',
              investmentName: eq.investment?.name
            }))
          : result.EquityInvestment

        const hasMoreRecords = result.EquityInvestment.length === pageSize

        setState(prev => ({
          ...prev,
          options: append ? ([...prev.options, ...mappedData] as typeof mappedData) : mappedData,
          loading: false,
          hasMore: hasMoreRecords,
          currentSearch: search,
          offset: append ? prev.offset + mappedData.length : mappedData.length
        }))
      } catch (error) {
        console.error('Error fetching equity investments with state:', error)
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch equity investments'
        }))
      }
    },
    [context.accessToken, fetchEquityInvestments, pageSize, mapToSelectOptions]
  )

  // Search function (only used when withState=true)
  const search = useCallback(
    (searchTerm: string) => {
      fetchEquityInvestmentsWithState(searchTerm, 0, false)
    },
    [fetchEquityInvestmentsWithState]
  )

  // Load more function (only used when withState=true)
  const loadMore = useCallback(() => {
    if (state.hasMore && !state.loading) {
      fetchEquityInvestmentsWithState(state.currentSearch, state.offset, true)
    }
  }, [fetchEquityInvestmentsWithState, state.hasMore, state.loading, state.currentSearch, state.offset])

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
    fetchEquityInvestmentsWithState('', 0, false)
  }, [fetchEquityInvestmentsWithState])

  // Auto-fetch on mount (only when withState=true and autoFetch=true)
  useEffect(() => {
    if (withState && autoFetch && context.accessToken) {
      initialize()
    }
  }, [withState, autoFetch, context.accessToken, initialize])

  // Return appropriate interface based on withState flag
  if (withState) {
    return {
      fetchEquityInvestments,
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
  return { fetchEquityInvestments }
}

/**
 * Hook for fetching equity investment by ID
 */
export const useGetEquityInvestmentById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchEquityInvestmentById = useCallback(
    async (id: string) => {
      const query = buildEquityInvestmentByIdQuery()

      try {
        const result = await graphqlClient.request<EquityInvestmentByIdResponse>(query, { id })
        return {
          equityInvestment: result.EquityInvestmentByPk || undefined
        }
      } catch (error) {
        console.error('Error fetching equity investment by ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchEquityInvestmentById }
}
