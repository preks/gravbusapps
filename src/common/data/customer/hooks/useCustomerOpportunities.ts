// Customer Opportunity hooks - list and by-id operations for opportunities
import { useCallback, useState, useEffect, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Types
import type { CustomerOpportunity } from '../types/customerOpportunityTypes'

// Queries (New)
import {
  buildCustomerOpportunityQuery,
  buildCustomerOpportunityWhereCondition,
  buildCustomerOpportunityOrderBy,
  type CustomerOpportunityQueryVariables
} from '../queries/customerOpportunityQueries'

// Mapper
import { toCustomerOpportunity } from '../types/customerOpportunityTypes'

export interface CustomerOpportunityListQueryResponse {
  Opportunity: CustomerOpportunity[]
  OpportunityAggregate: {
    aggregate: { count: number }
  }
}

export interface CustomerOpportunityListData {
  opportunities: CustomerOpportunity[]
  total: number
}

/**
 * Shared builder for custom GraphQL conditions used by both the deprecated hook
 * and the new declarative hook. Keeps drill-down filter semantics consistent.
 */
function buildCustomerOpportunityCustomConditions(variables: CustomerOpportunityQueryVariables): Record<string, any>[] {
  const customConditions: Record<string, any>[] = []

  if (variables.activeOnly) {
    customConditions.push({ opportunityStatus: { code: { _nin: ['WON', 'LOST'] } } })
  }

  if (variables.opportunityStatusTypesIn?.length) {
    customConditions.push({ opportunityStatus: { code: { _in: variables.opportunityStatusTypesIn } } })
  }

  if (variables.currencyCode) {
    customConditions.push({ currency: { code: { _eq: variables.currencyCode } } })
  }

  const stageValues = (variables as any).stageValues as string[] | undefined
  if (stageValues?.length) {
    customConditions.push({
      _or: [{ stage: { _in: stageValues } }, { salesPipelineStage: { value: { _in: stageValues } } }]
    })
  }

  const estimatedAmountRanges = (variables as any).estimatedAmountRanges as
    | Array<{ min?: number; max?: number }>
    | undefined
  if (estimatedAmountRanges?.length) {
    const orConditions = estimatedAmountRanges.flatMap(range => {
      const conditions: any[] = []
      const amountCondition: any = {}

      if (range.min !== undefined) amountCondition._gte = range.min
      if (range.max !== undefined) amountCondition._lte = range.max

      if (Object.keys(amountCondition).length > 0) {
        conditions.push({ estimatedAmount: amountCondition })
      }

      const includesZero = (range.min === undefined || range.min === 0) && (range.max === undefined || range.max >= 0)
      if (includesZero) {
        conditions.push({ estimatedAmount: { _isNull: true } })
      }

      return conditions
    })
    customConditions.push({ _or: orConditions })
  }

  const winningChanceRanges = (variables as any).winningChanceRanges as
    | Array<{ min?: number; max?: number }>
    | undefined
  if (winningChanceRanges?.length) {
    const orConditions = winningChanceRanges.map(range => {
      const chanceCondition: any = {}
      if (range.min !== undefined) chanceCondition._gte = range.min
      if (range.max !== undefined) chanceCondition._lte = range.max
      return { winningChance: chanceCondition }
    })
    customConditions.push({ _or: orConditions })
  }

  const forecastedProfitBetween = (variables as any).forecastedProfitBetween as [number, number] | undefined
  if (forecastedProfitBetween) {
    customConditions.push({
      forecastedProfitAmount: {
        _gte: forecastedProfitBetween[0],
        _lte: forecastedProfitBetween[1]
      }
    })
  }

  return customConditions
}

/**
 * @deprecated This hook is in transition. Use `useCustomerOpportunitiesList` instead.
 * The name `useCustomerOpportunities` will be restored to the new declarative hook after migration.
 *
 * Legacy function-only hook for customer opportunities.
 * Returns fetch functions without state management.
 */
export const useCustomerOpportunities = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchCustomerOpportunities = useCallback(
    async (variables: CustomerOpportunityQueryVariables = {}): Promise<CustomerOpportunityListData> => {
      const query = buildCustomerOpportunityQuery()

      const customConditions: Record<string, any>[] = []

      // Exclude WON and LOST (open pipeline drill-down)
      if (variables.activeOnly) {
        customConditions.push({ opportunityStatus: { code: { _nin: ['WON', 'LOST'] } } })
      }

      // Filter by specific status codes (Won or Lost bucket drill-down)
      if (variables.opportunityStatusTypesIn?.length) {
        customConditions.push({ opportunityStatus: { code: { _in: variables.opportunityStatusTypesIn } } })
      }

      // Custom filter for currencyCode
      if (variables.currencyCode) {
        customConditions.push({
          currency: { code: { _eq: variables.currencyCode } }
        })
      }

      // Custom filter for stageValues (stage OR salesPipelineStage.value)
      if ((variables as any).stageValues?.length) {
        customConditions.push({
          _or: [
            { stage: { _in: (variables as any).stageValues } },
            { salesPipelineStage: { value: { _in: (variables as any).stageValues } } }
          ]
        })
      }

      // Custom ranged filters for estimatedAmount (treat null as 0) and winningChance (multiple OR ranges)
      if ((variables as any).estimatedAmountRanges?.length) {
        const orConditions = ((variables as any).estimatedAmountRanges as any[]).flatMap((range: any) => {
          const conditions: any[] = []
          const amountCondition: any = {}

          if (range.min !== undefined) amountCondition._gte = range.min
          if (range.max !== undefined) amountCondition._lte = range.max

          if (Object.keys(amountCondition).length > 0) {
            conditions.push({ estimatedAmount: amountCondition })
          }

          // If range includes 0, also include null values (null treated as 0)
          const includesZero =
            (range.min === undefined || range.min === 0) && (range.max === undefined || range.max >= 0)
          if (includesZero) {
            conditions.push({ estimatedAmount: { _isNull: true } })
          }

          return conditions
        })
        customConditions.push({ _or: orConditions })
      }

      if ((variables as any).winningChanceRanges?.length) {
        const orConditions = ((variables as any).winningChanceRanges as any[]).map((range: any) => {
          const chanceCondition: any = {}
          if (range.min !== undefined) chanceCondition._gte = range.min
          if (range.max !== undefined) chanceCondition._lte = range.max
          return { winningChance: chanceCondition }
        })
        customConditions.push({ _or: orConditions })
      }

      if ((variables as any).forecastedProfitBetween) {
        customConditions.push({
          forecastedProfitAmount: {
            _gte: (variables as any).forecastedProfitBetween[0],
            _lte: (variables as any).forecastedProfitBetween[1]
          }
        })
      }

      const statusOverrideActive = variables.activeOnly || (variables.opportunityStatusTypesIn?.length ?? 0) > 0
      const whereVariables = statusOverrideActive ? { ...variables, opportunityStatusIds: undefined } : variables
      const whereCondition = buildCustomerOpportunityWhereCondition(whereVariables, [], customConditions)
      const orderBy = buildCustomerOpportunityOrderBy(variables.orderBy || [])

      const graphQLVariables: Record<string, any> = {
        limit: variables.limit || 50,
        offset: variables.offset || 0,
        where: whereCondition,
        orderBy: orderBy
      }

      const result = await graphqlClient.request<CustomerOpportunityListQueryResponse>(query, graphQLVariables)
      const opportunities = result.Opportunity.map(toCustomerOpportunity)
      const total = result.OpportunityAggregate?.aggregate?.count || 0
      return { opportunities, total }
    },
    [graphqlClient]
  )

  return { fetchCustomerOpportunities }
}

/**
 * Declarative List Hook for Customer Opportunities
 *
 * Automatically fetches and manages state for a list of customer opportunities.
 * Follows the Hook Refactoring Guide Pattern 2.
 *
 * @example
 * const { opportunities, loading, error, refetch } = useCustomerOpportunitiesList(context, { limit: 20 })
 *
 * @todo MIGRATION: Replace all usages of deprecated `useCustomerOpportunities` with this hook
 * @todo RENAME: After migration is complete, rename this hook to `useCustomerOpportunities` and remove the deprecated hook
 */
export interface UseCustomerOpportunitiesListResult {
  opportunities: CustomerOpportunity[]
  total: number
  loading: boolean
  error: string | null
  refetch: (variables?: CustomerOpportunityQueryVariables) => Promise<CustomerOpportunityListData>
  /**
   * Imperative fetch that does NOT touch the hook's internal state.
   * Use this when you need to fetch with arbitrary variables (e.g. drill-down panels)
   * without triggering parent re-renders from the hook's state updates.
   */
  fetchCustomerOpportunities: (variables?: CustomerOpportunityQueryVariables) => Promise<CustomerOpportunityListData>
}

export function useCustomerOpportunitiesList(
  context: BusinessAppContextProps,
  variables?: CustomerOpportunityQueryVariables
): UseCustomerOpportunitiesListResult {
  const graphqlClient = useGraphQLClient(context.accessToken)

  // Memoize variables to prevent infinite loops when object is recreated on each render
  const stableVariables = useMemo(() => variables, [JSON.stringify(variables)])

  const [state, setState] = useState({
    opportunities: [] as CustomerOpportunity[],
    total: 0,
    loading: true,
    error: null as string | null
  })

  const fetchOpportunities = useCallback(
    async (queryVariables?: CustomerOpportunityQueryVariables): Promise<CustomerOpportunityListData> => {
      if (!context.accessToken) {
        setState(prev => ({ ...prev, loading: false }))
        return { opportunities: [], total: 0 }
      }

      setState(prev => ({ ...prev, loading: true, error: null }))

      try {
        const vars = { ...stableVariables, ...queryVariables }
        const query = buildCustomerOpportunityQuery()
        const customConditions = buildCustomerOpportunityCustomConditions(vars)

        const statusOverrideActive = vars.activeOnly || (vars.opportunityStatusTypesIn?.length ?? 0) > 0
        const whereVariables = statusOverrideActive ? { ...vars, opportunityStatusIds: undefined } : vars

        const whereCondition = buildCustomerOpportunityWhereCondition(whereVariables, [], customConditions)
        const orderBy = buildCustomerOpportunityOrderBy(vars.orderBy || [])

        const graphQLVariables: Record<string, any> = {
          limit: Math.min(vars.limit || 50, 100),
          offset: vars.offset || 0,
          where: whereCondition,
          orderBy: orderBy
        }

        const result = await graphqlClient.request<CustomerOpportunityListQueryResponse>(query, graphQLVariables)
        const opportunities = result.Opportunity.map(toCustomerOpportunity)
        const total = result.OpportunityAggregate?.aggregate?.count || 0

        setState({ opportunities, total, loading: false, error: null })
        return { opportunities, total }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch customer opportunities'

        setState(prev => ({
          ...prev,
          opportunities: [],
          total: 0,
          loading: false,
          error: errorMessage
        }))
        return { opportunities: [], total: 0 }
      }
    },
    [context.accessToken, graphqlClient, stableVariables]
  )

  useEffect(() => {
    fetchOpportunities()
  }, [fetchOpportunities])

  const fetchCustomerOpportunities = useCallback(
    async (queryVariables?: CustomerOpportunityQueryVariables): Promise<CustomerOpportunityListData> => {
      if (!context.accessToken) {
        return { opportunities: [], total: 0 }
      }

      const vars = { ...stableVariables, ...queryVariables }
      const query = buildCustomerOpportunityQuery()
      const customConditions = buildCustomerOpportunityCustomConditions(vars)

      const statusOverrideActive = vars.activeOnly || (vars.opportunityStatusTypesIn?.length ?? 0) > 0
      const whereVariables = statusOverrideActive ? { ...vars, opportunityStatusIds: undefined } : vars

      const whereCondition = buildCustomerOpportunityWhereCondition(whereVariables, [], customConditions)
      const orderBy = buildCustomerOpportunityOrderBy(vars.orderBy || [])

      const graphQLVariables: Record<string, any> = {
        limit: Math.min(vars.limit ?? 50, 100),
        offset: vars.offset ?? 0,
        where: whereCondition,
        orderBy
      }

      try {
        const result = await graphqlClient.request<CustomerOpportunityListQueryResponse>(query, graphQLVariables)
        const opportunities = result.Opportunity.map(toCustomerOpportunity)
        const total = result.OpportunityAggregate?.aggregate?.count || 0
        return { opportunities, total }
      } catch (error) {
        console.error('Error fetching customer opportunities:', error instanceof Error ? error.message : error)
        return { opportunities: [], total: 0 }
      }
    },
    [context.accessToken, graphqlClient, stableVariables]
  )

  return {
    ...state,
    refetch: fetchOpportunities,
    fetchCustomerOpportunities
  }
}
