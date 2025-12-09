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

      const whereCondition = buildCustomerOpportunityWhereCondition(variables, [], customConditions)
      const orderBy = buildCustomerOpportunityOrderBy(variables.orderBy || [])

      const graphQLVariables: Record<string, any> = {
        limit: Math.min(variables.limit || 50, 100),
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
  refetch: (variables?: CustomerOpportunityQueryVariables) => Promise<void>
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
    async (queryVariables?: CustomerOpportunityQueryVariables) => {
      if (!context.accessToken) {
        setState(prev => ({ ...prev, loading: false }))
        return
      }

      setState(prev => ({ ...prev, loading: true, error: null }))

      try {
        const vars = { ...stableVariables, ...queryVariables }
        const query = buildCustomerOpportunityQuery()

        const customConditions: Record<string, any>[] = []

        // Custom filter for stageValues (stage OR salesPipelineStage.value)
        if ((vars as any).stageValues?.length) {
          customConditions.push({
            _or: [
              { stage: { _in: (vars as any).stageValues } },
              { salesPipelineStage: { value: { _in: (vars as any).stageValues } } }
            ]
          })
        }

        // Custom ranged filters for estimatedAmount (treat null as 0) and winningChance (multiple OR ranges)
        if ((vars as any).estimatedAmountRanges?.length) {
          const orConditions = ((vars as any).estimatedAmountRanges as any[]).flatMap((range: any) => {
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

        if ((vars as any).winningChanceRanges?.length) {
          const orConditions = ((vars as any).winningChanceRanges as any[]).map((range: any) => {
            const chanceCondition: any = {}
            if (range.min !== undefined) chanceCondition._gte = range.min
            if (range.max !== undefined) chanceCondition._lte = range.max
            return { winningChance: chanceCondition }
          })
          customConditions.push({ _or: orConditions })
        }

        if ((vars as any).forecastedProfitBetween) {
          customConditions.push({
            forecastedProfitAmount: {
              _gte: (vars as any).forecastedProfitBetween[0],
              _lte: (vars as any).forecastedProfitBetween[1]
            }
          })
        }

        const whereCondition = buildCustomerOpportunityWhereCondition(vars, [], customConditions)
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
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch customer opportunities'

        setState(prev => ({
          ...prev,
          opportunities: [],
          total: 0,
          loading: false,
          error: errorMessage
        }))
      }
    },
    [context.accessToken, graphqlClient, stableVariables]
  )

  useEffect(() => {
    fetchOpportunities()
  }, [fetchOpportunities])

  return {
    ...state,
    refetch: fetchOpportunities
  }
}
