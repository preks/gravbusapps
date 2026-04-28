/**
 * Investments hook - list of investments with automatic state management
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildWhere, buildOrderBy, type SortInput } from '@/common/network/graphql/queryHelpers'
import { INVESTMENT_DESCRIPTORS, type Investment } from '../types/investmentTypes.new'
import {
  buildInvestmentFragment,
  INVESTMENT_QUERY_CONFIGS,
  type InvestmentQueryVariables
} from '../queries/investmentQueries.new'

/** Server-side list totals for the same filter as the investment rows (all pages). */
export interface InvestmentListAggregates {
  count: number
  totalInvestmentAmount: number | null
  investmentMarketValue: number | null
  /** Populated when the query config is `equity` (EquityInvestmentAggregate). */
  ebitdaAmount: number | null
  /** Server `avg` over filtered investments (same `where` as the list). */
  avgTotalInvestmentAmount: number | null
  avgInvestmentMarketValue: number | null
  /** Populated when the query config is `equity`. */
  avgEbitdaAmount: number | null
}

const EMPTY_LIST_AGGREGATES: InvestmentListAggregates = {
  count: 0,
  totalInvestmentAmount: null,
  investmentMarketValue: null,
  ebitdaAmount: null,
  avgTotalInvestmentAmount: null,
  avgInvestmentMarketValue: null,
  avgEbitdaAmount: null
}

function parseAggregateNumeric(value: unknown): number | null {
  if (value == null) return null
  if (typeof value === 'number' && !Number.isNaN(value)) return value
  if (typeof value === 'string') {
    const n = Number.parseFloat(value)
    return Number.isNaN(n) ? null : n
  }
  return null
}

function resolveQueryFields(config: string | string[]): string[] {
  return typeof config === 'string' ? INVESTMENT_QUERY_CONFIGS[config] || INVESTMENT_QUERY_CONFIGS.list : config
}

function resolveOrderBy(vars: { orderBy?: SortInput[] }): SortInput[] {
  if (vars.orderBy && vars.orderBy.length > 0) return vars.orderBy
  return [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }]
}

function buildEquityEbitdaBlock(include: boolean): string {
  if (!include) return ''
  return `
    equityEbitdaAggregate: EquityInvestmentAggregate(
      where: { investment: $where, isDeleted: { _eq: false } }
    ) {
      aggregate {
        sum { ebitdaAmount }
        avg { ebitdaAmount }
      }
    }
  `
}

type AggregateResult = {
  InvestmentAggregate: {
    aggregate: {
      count: number
      sum?: { totalInvestmentAmount?: unknown; investmentMarketValue?: unknown } | null
      avg?: { totalInvestmentAmount?: unknown; investmentMarketValue?: unknown } | null
    } | null
  }
  equityEbitdaAggregate?: {
    aggregate: { sum?: { ebitdaAmount?: unknown } | null; avg?: { ebitdaAmount?: unknown } | null } | null
  }
}

function parseInvestmentListAggregates(result: AggregateResult, includeEquity: boolean): InvestmentListAggregates {
  const agg = result.InvestmentAggregate?.aggregate
  const sum = agg?.sum
  const avg = agg?.avg
  const ebitdaAgg = includeEquity ? result.equityEbitdaAggregate?.aggregate : null
  return {
    count: agg?.count ?? 0,
    totalInvestmentAmount: parseAggregateNumeric(sum?.totalInvestmentAmount),
    investmentMarketValue: parseAggregateNumeric(sum?.investmentMarketValue),
    ebitdaAmount: includeEquity ? parseAggregateNumeric(ebitdaAgg?.sum?.ebitdaAmount) : null,
    avgTotalInvestmentAmount: parseAggregateNumeric(avg?.totalInvestmentAmount),
    avgInvestmentMarketValue: parseAggregateNumeric(avg?.investmentMarketValue),
    avgEbitdaAmount: includeEquity ? parseAggregateNumeric(ebitdaAgg?.avg?.ebitdaAmount) : null
  }
}

function buildInvestmentCustomConditions(
  varsWithFilters: InvestmentQueryVariables & Record<string, any>
): Record<string, any>[] {
  const customConditions: Record<string, any>[] = Array.isArray(varsWithFilters.customConditions)
    ? [...varsWithFilters.customConditions]
    : []

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

  return customConditions
}

export interface UseInvestmentsResult {
  investments: Investment[]
  total: number
  listAggregates: InvestmentListAggregates
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
    listAggregates: EMPTY_LIST_AGGREGATES,
    loading: true,
    error: null
  })

  const fetchInvestments = useCallback(
    async (fetchVariables?: InvestmentQueryVariables) => {
      // Merge stable default variables with query-specific variables
      const vars = { ...stableVariables, ...fetchVariables }
      // Don't fetch if no access token
      if (!accessToken) {
        setState(prev => ({ ...prev, loading: false, listAggregates: EMPTY_LIST_AGGREGATES }))
        return
      }

      setState(prev => ({ ...prev, loading: true, error: null }))

      try {
        const fields = resolveQueryFields(config)
        const fragment = buildInvestmentFragment(fields)

        const varsWithFilters = vars as InvestmentQueryVariables & Record<string, any>
        const customConditions = buildInvestmentCustomConditions(varsWithFilters)

        const filteredVars = { ...varsWithFilters }
        delete filteredVars.customConditions
        delete filteredVars.liquidFundInvestment
        delete filteredVars.realEstateInvestment
        delete filteredVars.equityInvestment
        delete filteredVars.planedExit

        const whereObj = buildWhere({
          variables: filteredVars,
          descriptors: INVESTMENT_DESCRIPTORS,
          ids: filteredVars.ids,
          isDeleted: true,
          customConditions
        })

        const orderByArray = buildOrderBy(resolveOrderBy(vars), INVESTMENT_DESCRIPTORS)
        const includeEquity = config === 'equity' || (Array.isArray(config) && config.includes('equityInvestment'))

        const query = `
          query GetInvestments(
            $limit: Int
            $offset: Int
            $where: InvestmentBoolExp
            $orderBy: [InvestmentOrderBy!]
          ) {
            Investment(limit: $limit offset: $offset orderBy: $orderBy where: $where) {
              ${fragment}
            }
            InvestmentAggregate(where: $where) {
              aggregate {
                count
                sum { totalInvestmentAmount investmentMarketValue }
                avg { totalInvestmentAmount investmentMarketValue }
              }
            }
            ${buildEquityEbitdaBlock(includeEquity)}
          }
        `

        const result = await graphqlClient.request<AggregateResult & { Investment: any[] }>(query, {
          limit: Math.min(vars.limit || 20, 100),
          offset: vars.offset || 0,
          where: whereObj,
          orderBy: orderByArray
        })

        const listAggregates = parseInvestmentListAggregates(result, includeEquity)

        setState({
          investments: (result.Investment || []) as Investment[],
          total: listAggregates.count,
          listAggregates,
          loading: false,
          error: null
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch investments'
        console.error('Error fetching investments:', error)
        setState({
          investments: [],
          total: 0,
          listAggregates: EMPTY_LIST_AGGREGATES,
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
