/**
 * Investments hook - list of investments with automatic state management
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildWhere, buildOrderBy } from '@/common/network/graphql/queryHelpers'
import { INVESTMENT_DESCRIPTORS, type Investment } from '../types/investmentTypes.new'
import {
  buildInvestmentFragment,
  INVESTMENT_QUERY_CONFIGS,
  type InvestmentQueryVariables
} from '../queries/investmentQueries.new'

export interface UseInvestmentsResult {
  investments: Investment[]
  total: number
  loading: boolean
  error: string | null
  refetch: (variables?: InvestmentQueryVariables) => Promise<void>
}

/**
 * Declarative hook for fetching a list of investments.
 * Automatically fetches data when component mounts or variables change.
 *
 * @param accessToken - Access token for authentication
 * @param variables - Query variables for filtering, pagination, sorting, etc.
 * @param config - Query config name or custom field array (default: 'list')
 *
 * @example
 * // Basic usage
 * const { investments, total, loading, error } = useInvestments(accessToken, { limit: 20 })
 *
 * if (loading) return <Spinner />
 * if (error) return <Alert>{error}</Alert>
 *
 * return (
 *   <div>
 *     <p>Total: {total}</p>
 *     {investments.map(inv => <div key={inv.id}>{inv.name}</div>)}
 *   </div>
 * )
 *
 * @example
 * // With refetch
 * const { investments, refetch } = useInvestments(accessToken, { search: 'test' })
 *
 * return (
 *   <div>
 *     <Button onClick={() => refetch({ search: 'new search' })}>Search</Button>
 *     {investments.map(inv => <div key={inv.id}>{inv.name}</div>)}
 *   </div>
 * )
 */
export function useInvestments(
  accessToken: string,
  variables: InvestmentQueryVariables = {},
  config: string | string[] = 'list'
): UseInvestmentsResult {
  const graphqlClient = useGraphQLClient(accessToken)

  // ⚠️ CRITICAL: Memoize variables to prevent infinite loops when object is recreated on each render
  // This is necessary because inline objects like { limit: 20 } create new references on every render
  const stableVariables = useMemo(() => variables, [JSON.stringify(variables)])

  const [state, setState] = useState<Omit<UseInvestmentsResult, 'refetch'>>({
    investments: [],
    total: 0,
    loading: true,
    error: null
  })

  const fetchInvestments = useCallback(
    async (fetchVariables?: InvestmentQueryVariables) => {
      // Merge stable default variables with query-specific variables
      const vars = { ...stableVariables, ...fetchVariables }
      // Don't fetch if no access token
      if (!accessToken) {
        setState(prev => ({ ...prev, loading: false }))
        return
      }

      setState(prev => ({ ...prev, loading: true, error: null }))

      try {
        // Resolve fields from config
        const fields: string[] =
          typeof config === 'string' ? INVESTMENT_QUERY_CONFIGS[config] || INVESTMENT_QUERY_CONFIGS.list : config

        // Build fragment
        const fragment = buildInvestmentFragment(fields)

        // Extract investment type filters from variables (these are not processed by descriptors)
        // These filters come from the State-Hooks and need to be passed as customConditions
        const customConditions: Record<string, any>[] = []
        const varsWithFilters = vars as InvestmentQueryVariables & Record<string, any>

        if (varsWithFilters.liquidFundInvestment) {
          customConditions.push({ liquidFundInvestment: varsWithFilters.liquidFundInvestment })
        }
        if (varsWithFilters.realEstateInvestment) {
          customConditions.push({ realEstateInvestment: varsWithFilters.realEstateInvestment })
        }
        if (varsWithFilters.equityInvestment) {
          customConditions.push({ equityInvestment: varsWithFilters.equityInvestment })
        }
        if (varsWithFilters.planedExit !== undefined) {
          customConditions.push({ planedExit: { _eq: varsWithFilters.planedExit } })
        }

        // Remove investment type filters from variables before passing to buildWhere
        // (they will be passed as customConditions instead)
        const filteredVars = { ...varsWithFilters }
        delete filteredVars.liquidFundInvestment
        delete filteredVars.realEstateInvestment
        delete filteredVars.equityInvestment
        delete filteredVars.planedExit

        // Build where condition using descriptors
        const whereObj = buildWhere({
          variables: filteredVars,
          descriptors: INVESTMENT_DESCRIPTORS,
          ids: filteredVars.ids,
          isDeleted: true,
          customConditions
        })

        // Build orderBy using descriptors
        // Use default orderBy if none provided
        const orderByInput =
          vars.orderBy && vars.orderBy.length > 0
            ? vars.orderBy
            : [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' as const }]
        const orderByArray = buildOrderBy(orderByInput, INVESTMENT_DESCRIPTORS)

        // Build GraphQL variables
        const limit = Math.min(vars.limit || 50, 100)
        const offset = vars.offset || 0

        const graphQLVariables: Record<string, any> = {
          limit,
          offset,
          where: whereObj,
          orderBy: orderByArray
        }

        // Build query
        const query = `
          query GetInvestments(
            $limit: Int
            $offset: Int
            $where: InvestmentBoolExp
            $orderBy: [InvestmentOrderBy!]
          ) {
            Investment(
              limit: $limit
              offset: $offset
              orderBy: $orderBy
              where: $where
            ) {
              ${fragment}
            }
            
            InvestmentAggregate(where: $where) {
              aggregate {
                count
              }
            }
          }
        `

        // Execute query
        const result = await graphqlClient.request<{
          Investment: any[]
          InvestmentAggregate: {
            aggregate: {
              count: number
            }
          }
        }>(query, graphQLVariables)

        setState({
          investments: (result.Investment || []) as Investment[],
          total: result.InvestmentAggregate?.aggregate?.count || 0,
          loading: false,
          error: null
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch investments'
        console.error('Error fetching investments:', error)
        setState({
          investments: [],
          total: 0,
          loading: false,
          error: errorMessage
        })
      }
    },
    [accessToken, graphqlClient, config, stableVariables] // Use stableVariables, not variables!
  )

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchInvestments()
  }, [fetchInvestments])

  return {
    ...state,
    refetch: fetchInvestments
  }
}
