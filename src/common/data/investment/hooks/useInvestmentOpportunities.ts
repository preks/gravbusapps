// Investment Opportunity hooks - CRM opportunity entity operations
import { useCallback, useState, useEffect, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  type InvestmentOpportunity,
  toInvestmentOpportunity,
  INVESTMENT_OPPORTUNITY_DESCRIPTORS
} from '../types/investmentOpportunityTypes'
import type { InvestmentTask } from '../types/investmentTaskTypes'
import type { InvestmentActivity } from '../types/investmentActivityTypes'
import type { InvestmentNote } from '../types/investmentNoteTypes'
import type { InvestmentDocument } from '../types/investmentDocumentTypes'

// Import new query builders
import {
  buildInvestmentOpportunityQuery,
  buildInvestmentOpportunityByIdQuery,
  buildInvestmentOpportunityWhereCondition,
  buildInvestmentOpportunityOrderBy,
  type InvestmentOpportunityQueryVariables,
  GET_INVESTMENT_OPPORTUNITY_AGGREGATES
} from '../queries/investmentOpportunityQueries'

// Import where/orderBy builders for related entities
import {
  buildInvestmentTaskByOpportunityIdQuery,
  buildInvestmentTaskWhereCondition,
  buildInvestmentTaskOrderBy
} from '../queries/investmentTaskQueries'
import {
  buildInvestmentActivityByOpportunityIdQuery,
  buildInvestmentActivityWhereCondition,
  buildInvestmentActivityOrderBy
} from '../queries/investmentActivityQueries'
import {
  buildInvestmentNoteByOpportunityIdQuery,
  buildInvestmentNoteWhereCondition,
  buildInvestmentNoteOrderBy
} from '../queries/investmentNoteQueries'
import {
  buildInvestmentDocumentByOpportunityIdQuery,
  buildInvestmentDocumentWhereCondition,
  buildInvestmentDocumentOrderBy
} from '../queries/investmentDocumentQueries'
import { buildWhere } from '@/common/network/graphql/queryHelpers'

// Use the mapper function
import { toInvestmentTask } from '../mappers/investmentTaskMappers'
import { toInvestmentActivity, toInvestmentNote, toInvestmentDocument } from '../mappers/investmentRelatedEntityMappers'

// Note: InvestmentOpportunityQueryVariables is imported from queries

// Response interfaces
export interface InvestmentOpportunityQueryResponse {
  InvestmentOpportunity: InvestmentOpportunity[]
  InvestmentOpportunityAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface InvestmentOpportunityByIdData {
  opportunity?: InvestmentOpportunity
}

export interface InvestmentOpportunityListData {
  opportunities: InvestmentOpportunity[]
  total: number
}

export interface InvestmentOpportunityAggregateResponse {
  InvestmentOpportunityAggregate: {
    aggregate: {
      count: number
      sum: {
        estimatedAmount: number
      }
      avg: {
        estimatedAmount: number
      }
    }
  }
  InvestmentOpportunityWonAggregate: {
    aggregate: {
      count: number
      sum: {
        estimatedAmount: number
      }
    }
  }
}

/** Shared where-condition builder for the investment opportunity list and aggregate queries. */
function buildInvestmentOpportunityCustomConditions(
  variables: InvestmentOpportunityQueryVariables
): Record<string, any>[] {
  const conditions: Record<string, any>[] = []

  // Exclude WON and LOST (open pipeline drill-down)
  if (variables.activeOnly) {
    conditions.push({ opportunityStatus: { type: { _nin: ['WON', 'LOST'] } } })
  }

  // Filter by specific status types (Won or Lost bucket drill-down)
  if (variables.opportunityStatusTypesIn?.length) {
    conditions.push({ opportunityStatus: { type: { _in: variables.opportunityStatusTypesIn } } })
  }

  if (variables.dealType) {
    conditions.push({ dealType: { _eq: variables.dealType } })
  }
  if (variables.accountSearch?.trim()) {
    conditions.push({ account: { name: { _ilike: `%${variables.accountSearch.trim()}%` } } })
  }
  if (variables.currencyCode?.trim()) {
    conditions.push({ currency: { code: { _eq: variables.currencyCode.trim() } } })
  }

  if (variables.estimatedAmountRanges?.length) {
    const orConditions = variables.estimatedAmountRanges.flatMap(range => {
      const rangeConditions: any[] = []
      const amountCondition: any = {}

      if (range.min !== undefined) amountCondition._gte = range.min
      if (range.max !== undefined) amountCondition._lte = range.max

      if (Object.keys(amountCondition).length > 0) {
        rangeConditions.push({ estimatedAmount: amountCondition })
      }

      const includesZero = (range.min === undefined || range.min === 0) && (range.max === undefined || range.max >= 0)
      if (includesZero) {
        rangeConditions.push({ estimatedAmount: { _isNull: true } })
      }

      return rangeConditions
    })
    conditions.push({ _or: orConditions })
  }

  if (variables.forecastedProfitBetween) {
    conditions.push({
      forecastedProfitAmount: {
        _gte: variables.forecastedProfitBetween[0],
        _lte: variables.forecastedProfitBetween[1]
      }
    })
  }

  return conditions
}

const INVESTMENT_OPPORTUNITY_AGGREGATES_QUERY = `
  query GetInvestmentOpportunityAggregates($where: InvestmentOpportunityBoolExp) {
    InvestmentOpportunityAggregate(where: $where) {
      aggregate {
        count
        sum { estimatedAmount initialInvestmentAmount }
        avg { estimatedAmount initialInvestmentAmount }
      }
    }
  }
`

export interface InvestmentOpportunityAggregatesResult {
  count: number
  totalEstimatedAmount: number | null
  avgEstimatedAmount: number | null
  totalInvestmentAmount: number | null
  avgInvestmentAmount: number | null
}

function parseAggregateValue(value: unknown): number | null {
  if (value == null) return null
  if (typeof value === 'number' && !Number.isNaN(value)) return value
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

/**
 * @deprecated This hook is in transition. Use `useInvestmentOpportunitiesList` instead.
 *
 * Legacy function-only hook for investment opportunities.
 * Returns fetch functions without state management.
 */
export const useGetInvestmentOpportunities = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentOpportunities = useCallback(
    async (variables: InvestmentOpportunityQueryVariables = {}) => {
      const query = buildInvestmentOpportunityQuery()
      const customConditions = buildInvestmentOpportunityCustomConditions(variables)
      const statusOverrideActive = variables.activeOnly || (variables.opportunityStatusTypesIn?.length ?? 0) > 0
      const whereVariables = statusOverrideActive ? { ...variables, opportunityStatusIds: undefined } : variables
      const whereCondition = buildInvestmentOpportunityWhereCondition(whereVariables, [], customConditions)
      const orderBy = buildInvestmentOpportunityOrderBy(variables.orderBy || [])

      const graphQLVariables: Record<string, any> = {
        limit: variables.limit || 50,
        offset: variables.offset || 0,
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<{
          InvestmentOpportunity: InvestmentOpportunity[]
          InvestmentOpportunityAggregate: {
            aggregate: { count: number }
          }
        }>(query, graphQLVariables)

        const enhancedOpportunities = result.InvestmentOpportunity.map(toInvestmentOpportunity)

        return {
          InvestmentOpportunity: enhancedOpportunities,
          InvestmentOpportunityAggregate: result.InvestmentOpportunityAggregate
        }
      } catch (error) {
        console.error('Error fetching investment opportunities:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  const fetchInvestmentOpportunityAggregates = useCallback(
    async (variables: InvestmentOpportunityQueryVariables = {}): Promise<InvestmentOpportunityAggregatesResult> => {
      const customConditions = buildInvestmentOpportunityCustomConditions(variables)
      const statusOverrideActive = variables.activeOnly || (variables.opportunityStatusTypesIn?.length ?? 0) > 0
      const whereVariables = statusOverrideActive ? { ...variables, opportunityStatusIds: undefined } : variables
      const whereCondition = buildInvestmentOpportunityWhereCondition(whereVariables, [], customConditions)

      try {
        const result = await graphqlClient.request<{
          InvestmentOpportunityAggregate: {
            aggregate: {
              count: number
              sum: { estimatedAmount: number | null; initialInvestmentAmount: number | null }
              avg: { estimatedAmount: number | null; initialInvestmentAmount: number | null }
            }
          }
        }>(INVESTMENT_OPPORTUNITY_AGGREGATES_QUERY, { where: whereCondition })

        const agg = result.InvestmentOpportunityAggregate.aggregate
        return {
          count: agg.count,
          totalEstimatedAmount: parseAggregateValue(agg.sum.estimatedAmount),
          avgEstimatedAmount: parseAggregateValue(agg.avg.estimatedAmount),
          totalInvestmentAmount: parseAggregateValue(agg.sum.initialInvestmentAmount),
          avgInvestmentAmount: parseAggregateValue(agg.avg.initialInvestmentAmount)
        }
      } catch (error) {
        console.error('Error fetching investment opportunity aggregates:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentOpportunities, fetchInvestmentOpportunityAggregates }
}

// Hook for getting investment opportunity by ID
export const useGetInvestmentOpportunityById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentOpportunityById = useCallback(
    async (id: string) => {
      const query = buildInvestmentOpportunityByIdQuery()

      try {
        const result = await graphqlClient.request<{ InvestmentOpportunityByPk: InvestmentOpportunity | null }>(query, {
          id
        })

        return {
          opportunity: result.InvestmentOpportunityByPk
            ? toInvestmentOpportunity(result.InvestmentOpportunityByPk)
            : undefined
        } as InvestmentOpportunityByIdData
      } catch (error) {
        console.error('Error fetching investment opportunity by ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentOpportunityById }
}

/**
 * Declarative List Hook for Investment Opportunities
 *
 * Automatically fetches and manages state for a list of investment opportunities.
 * Follows the Hook Refactoring Guide Pattern 2.
 *
 * @example
 * const { opportunities, loading, error, refetch } = useInvestmentOpportunitiesList(context, { limit: 20 })
 *
 * @todo MIGRATION: Replace all usages of deprecated `useGetInvestmentOpportunities` with this hook
 * @todo RENAME: After migration is complete, rename this hook to `useInvestmentOpportunities` and remove the deprecated hook
 */
export interface UseInvestmentOpportunitiesListResult {
  opportunities: InvestmentOpportunity[]
  total: number
  loading: boolean
  error: string | null
  refetch: (variables?: InvestmentOpportunityQueryVariables) => Promise<InvestmentOpportunityListData>
  /**
   * Imperative fetch that does NOT touch the hook's internal state.
   * Use this when you need to fetch with arbitrary variables (e.g. drill-down panels)
   * without triggering parent re-renders from the hook's state updates.
   */
  fetchInvestmentOpportunities: (
    variables?: InvestmentOpportunityQueryVariables
  ) => Promise<InvestmentOpportunityListData>
}

export function useInvestmentOpportunitiesList(
  context: BusinessAppContextProps,
  variables?: InvestmentOpportunityQueryVariables
): UseInvestmentOpportunitiesListResult {
  const graphqlClient = useGraphQLClient(context.accessToken)

  // Memoize variables to prevent infinite loops when object is recreated on each render
  const stableVariables = useMemo(() => variables, [JSON.stringify(variables)])

  const [state, setState] = useState({
    opportunities: [] as InvestmentOpportunity[],
    total: 0,
    loading: true,
    error: null as string | null
  })

  const fetchOpportunities = useCallback(
    async (queryVariables?: InvestmentOpportunityQueryVariables): Promise<InvestmentOpportunityListData> => {
      if (!context.accessToken) {
        setState(prev => ({ ...prev, loading: false }))
        return { opportunities: [], total: 0 }
      }

      setState(prev => ({ ...prev, loading: true, error: null }))

      try {
        const vars = { ...stableVariables, ...queryVariables }
        const query = buildInvestmentOpportunityQuery()

        const customConditions = buildInvestmentOpportunityCustomConditions(vars)
        const statusOverrideActive = vars.activeOnly || (vars.opportunityStatusTypesIn?.length ?? 0) > 0
        const whereVariables = statusOverrideActive ? { ...vars, opportunityStatusIds: undefined } : vars

        const whereCondition = buildInvestmentOpportunityWhereCondition(whereVariables, [], customConditions)
        const orderBy = buildInvestmentOpportunityOrderBy(vars.orderBy || [])

        const graphQLVariables: Record<string, any> = {
          limit: Math.min(vars.limit || 50, 100),
          offset: vars.offset || 0,
          where: whereCondition,
          orderBy: orderBy
        }

        const result = await graphqlClient.request<InvestmentOpportunityQueryResponse>(query, graphQLVariables)
        const opportunities = result.InvestmentOpportunity.map(toInvestmentOpportunity)
        const total = result.InvestmentOpportunityAggregate?.aggregate?.count || 0

        setState({ opportunities, total, loading: false, error: null })
        return { opportunities, total }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch investment opportunities'

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

  const fetchInvestmentOpportunities = useCallback(
    async (queryVariables?: InvestmentOpportunityQueryVariables): Promise<InvestmentOpportunityListData> => {
      if (!context.accessToken) {
        return { opportunities: [], total: 0 }
      }

      const vars = { ...stableVariables, ...queryVariables }
      const query = buildInvestmentOpportunityQuery()
      const customConditions = buildInvestmentOpportunityCustomConditions(vars)

      const statusOverrideActive = vars.activeOnly || (vars.opportunityStatusTypesIn?.length ?? 0) > 0
      const whereVariables = statusOverrideActive ? { ...vars, opportunityStatusIds: undefined } : vars

      const whereCondition = buildInvestmentOpportunityWhereCondition(whereVariables, [], customConditions)
      const orderBy = buildInvestmentOpportunityOrderBy(vars.orderBy || [])

      const graphQLVariables: Record<string, any> = {
        limit: Math.min(vars.limit ?? 50, 100),
        offset: vars.offset ?? 0,
        where: whereCondition,
        orderBy
      }

      try {
        const result = await graphqlClient.request<InvestmentOpportunityQueryResponse>(query, graphQLVariables)
        const opportunities = result.InvestmentOpportunity.map(toInvestmentOpportunity)
        const total = result.InvestmentOpportunityAggregate?.aggregate?.count || 0
        return { opportunities, total }
      } catch (error) {
        console.error('Error fetching investment opportunities:', error instanceof Error ? error.message : error)
        return { opportunities: [], total: 0 }
      }
    },
    [context.accessToken, graphqlClient, stableVariables]
  )

  return {
    ...state,
    refetch: fetchOpportunities,
    fetchInvestmentOpportunities
  }
}

// Hook for getting investment opportunity aggregates for metrics
export const useGetInvestmentOpportunityAggregates = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentOpportunityAggregates = useCallback(
    async (variables: InvestmentOpportunityQueryVariables = {}) => {
      const query = GET_INVESTMENT_OPPORTUNITY_AGGREGATES()

      const customConditions: Record<string, any>[] = []

      if (variables.dealType) {
        customConditions.push({ dealType: { _eq: variables.dealType } })
      }
      if (variables.accountSearch?.trim()) {
        customConditions.push({ investmentAccount: { name: { _ilike: `%${variables.accountSearch.trim()}%` } } })
      }
      if (variables.currencyCode?.trim()) {
        customConditions.push({ currency: { code: { _eq: variables.currencyCode.trim() } } })
      }

      if (variables.estimatedAmountRanges?.length) {
        const orConditions = variables.estimatedAmountRanges.flatMap(range => {
          const conditions: any[] = []
          const amountCondition: any = {}
          if (range.min !== undefined) amountCondition._gte = range.min
          if (range.max !== undefined) amountCondition._lte = range.max
          if (Object.keys(amountCondition).length > 0) {
            conditions.push({ estimatedAmount: amountCondition })
          }
          const includesZero =
            (range.min === undefined || range.min === 0) && (range.max === undefined || range.max >= 0)
          if (includesZero) {
            conditions.push({ estimatedAmount: { _isNull: true } })
          }
          return conditions
        })
        customConditions.push({ _or: orConditions })
      }

      if (variables.forecastedProfitBetween) {
        customConditions.push({
          forecastedProfit: {
            _gte: variables.forecastedProfitBetween[0],
            _lte: variables.forecastedProfitBetween[1]
          }
        })
      }

      const whereCondition = buildWhere({
        variables,
        descriptors: INVESTMENT_OPPORTUNITY_DESCRIPTORS,
        ids: variables.ids,
        customConditions
      })

      // Build won condition (same as where but with won status filter)
      const wonCustomConditions: Record<string, any>[] = [
        ...customConditions,
        {
          _or: [
            { opportunityStatus: { code: { _ilike: '%won%' } } },
            { opportunityStatus: { value: { _ilike: '%won%' } } },
            { opportunityStatus: { alternativeCode: { _ilike: '%won%' } } }
          ]
        }
      ]

      const wonWhereCondition = buildWhere({
        variables,
        descriptors: INVESTMENT_OPPORTUNITY_DESCRIPTORS,
        ids: variables.ids,
        customConditions: wonCustomConditions
      })

      const graphQLVariables: Record<string, any> = {
        where: whereCondition,
        wonWhere: wonWhereCondition
      }

      try {
        const result = await graphqlClient.request<InvestmentOpportunityAggregateResponse>(query, graphQLVariables)
        return result
      } catch (error) {
        console.error('Error fetching investment opportunity aggregates:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentOpportunityAggregates }
}

// =====================================================
// INVESTMENT OPPORTUNITY RELATED ENTITIES HOOKS
// =====================================================

// Hook for getting investment tasks by opportunity ID
export const useGetInvestmentTasksByOpportunityId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentTasksByOpportunityId = useCallback(
    async (opportunityId: string) => {
      const query = buildInvestmentTaskByOpportunityIdQuery()
      const whereCondition = buildInvestmentTaskWhereCondition(
        {},
        [],
        [{ opportunity: { id: { _eq: opportunityId } }, isDeleted: { _eq: false } }]
      )
      const orderBy = buildInvestmentTaskOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      const graphQLVariables = {
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<{ InvestmentTask: InvestmentTask[] }>(query, graphQLVariables)
        return result.InvestmentTask.map(toInvestmentTask)
      } catch (error) {
        console.error('Error fetching investment tasks by opportunity ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentTasksByOpportunityId }
}

// Hook for getting investment activities by opportunity ID
export const useGetInvestmentActivitiesByOpportunityId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentActivitiesByOpportunityId = useCallback(
    async (opportunityId: string) => {
      const query = buildInvestmentActivityByOpportunityIdQuery()
      const whereCondition = buildInvestmentActivityWhereCondition(
        {},
        [],
        [{ opportunity: { id: { _eq: opportunityId } }, isDeleted: { _eq: false } }]
      )
      const orderBy = buildInvestmentActivityOrderBy([{ field: 'occurredAt', direction: 'DESC_NULLS_LAST' }])

      const graphQLVariables = {
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<{ InvestmentActivity: InvestmentActivity[] }>(
          query,
          graphQLVariables
        )
        return result.InvestmentActivity.map(toInvestmentActivity)
      } catch (error) {
        console.error('Error fetching investment activities by opportunity ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentActivitiesByOpportunityId }
}

// Hook for getting investment notes by opportunity ID
export const useGetInvestmentNotesByOpportunityId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentNotesByOpportunityId = useCallback(
    async (opportunityId: string) => {
      const query = buildInvestmentNoteByOpportunityIdQuery()
      const whereCondition = buildInvestmentNoteWhereCondition(
        {},
        [],
        [{ opportunity: { id: { _eq: opportunityId } }, isDeleted: { _eq: false } }]
      )
      const orderBy = buildInvestmentNoteOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      const graphQLVariables = {
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<{ InvestmentNote: InvestmentNote[] }>(query, graphQLVariables)
        return result.InvestmentNote.map(toInvestmentNote)
      } catch (error) {
        console.error('Error fetching investment notes by opportunity ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentNotesByOpportunityId }
}

// Hook for getting investment documents by opportunity ID
export const useGetInvestmentDocumentsByOpportunityId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentDocumentsByOpportunityId = useCallback(
    async (opportunityId: string) => {
      const query = buildInvestmentDocumentByOpportunityIdQuery()
      const whereCondition = buildInvestmentDocumentWhereCondition(
        {},
        [],
        [{ opportunity: { id: { _eq: opportunityId } }, isDeleted: { _eq: false } }]
      )
      const orderBy = buildInvestmentDocumentOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      const graphQLVariables = {
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<{ InvestmentDocument: InvestmentDocument[] }>(
          query,
          graphQLVariables
        )
        return result.InvestmentDocument.map(toInvestmentDocument)
      } catch (error) {
        console.error('Error fetching investment documents by opportunity ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentDocumentsByOpportunityId }
}
