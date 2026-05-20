// Customer Lead hooks - list and by-id operations for leads
import { useCallback, useState, useEffect, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GraphQLClient } from '@/common/network/graphql/GraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Types
import type { CustomerLead } from '../types/customerLeadTypes'

// Queries (New)
import {
  buildCustomerLeadQuery,
  buildCustomerLeadByIdQuery,
  buildCustomerLeadSearchQuery,
  buildCustomerLeadWhereCondition,
  buildCustomerLeadOrderBy,
  type CustomerLeadQueryVariables
} from '../queries/customerLeadQueries'

// Mapper
import { toCustomerLead } from '../types/customerLeadTypes'

export interface CustomerLeadListQueryResponse {
  Lead: CustomerLead[]
  LeadAggregate: {
    aggregate: { count: number }
  }
}

export interface CustomerLeadListData {
  leads: CustomerLead[]
  total: number
}

/**
 * @deprecated This hook is in transition. Use `useCustomerLeadsList` instead.
 * The name `useCustomerLeads` will be restored to the new declarative hook after migration.
 *
 * Legacy function-only hook for customer leads.
 * Returns fetch functions without state management.
 */
export const useCustomerLeads = (context: BusinessAppContextProps) => {
  const graphqlClient: GraphQLClient = useGraphQLClient(context.accessToken)

  const fetchCustomerLeads = useCallback(
    async (variables: CustomerLeadQueryVariables = {}): Promise<CustomerLeadListData> => {
      const query = buildCustomerLeadQuery()

      const whereCondition = buildCustomerLeadWhereCondition(variables)
      let orderBy = buildCustomerLeadOrderBy(variables.orderBy || [])
      if (orderBy.length === 0) {
        orderBy = buildCustomerLeadOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])
      }

      const graphQLVariables: Record<string, any> = {
        limit: variables.limit || 50,
        offset: variables.offset || 0,
        where: whereCondition,
        orderBy: orderBy
      }

      const result = await graphqlClient.request<CustomerLeadListQueryResponse>(query, graphQLVariables)
      const leads = result.Lead.map(toCustomerLead)
      const total = result.LeadAggregate?.aggregate?.count || 0
      return { leads, total }
    },
    [graphqlClient]
  )

  const fetchCustomerLeadById = useCallback(
    async (
      id: string
    ): Promise<
      | (CustomerLead & { leadStatuses?: Array<{ id: string; code: string; value: string; alternativeCode?: string }> })
      | null
    > => {
      const query = buildCustomerLeadByIdQuery()
      const result = await graphqlClient.request<{
        LeadByPk: CustomerLead | null
        leadStatuses?: Array<{
          id: string
          code: string
          value: string
          alternativeCode?: string
        }>
      }>(query, { id })
      const lead = result.LeadByPk ? toCustomerLead(result.LeadByPk) : null
      return lead ? { ...lead, leadStatuses: result.leadStatuses || [] } : null
    },
    [graphqlClient]
  )

  const searchCustomerLeads = useCallback(
    async (variables: CustomerLeadQueryVariables): Promise<CustomerLead[]> => {
      const query = buildCustomerLeadSearchQuery()
      const whereCondition = buildCustomerLeadWhereCondition(variables)
      const graphQLVariables: Record<string, any> = {
        limit: Math.min(variables.limit || 50, 100),
        where: whereCondition
      }
      const result = await graphqlClient.request<{ Lead: CustomerLead[] }>(query, graphQLVariables)
      return result.Lead.map(toCustomerLead)
    },
    [graphqlClient]
  )

  return { fetchCustomerLeads, fetchCustomerLeadById, searchCustomerLeads }
}

/**
 * Declarative List Hook for Customer Leads
 *
 * Automatically fetches and manages state for a list of customer leads.
 * Follows the Hook Refactoring Guide Pattern 2.
 *
 * @example
 * const { leads, loading, error, refetch } = useCustomerLeadsList(context, { limit: 20 })
 *
 * @todo MIGRATION: Replace all usages of deprecated `useCustomerLeads` with this hook
 * @todo RENAME: After migration is complete, rename this hook to `useCustomerLeads` and remove the deprecated hook
 */
export interface UseCustomerLeadsListResult {
  leads: CustomerLead[]
  total: number
  loading: boolean
  error: string | null
  refetch: (variables?: CustomerLeadQueryVariables) => Promise<CustomerLeadListData>
  /**
   * Imperative fetch that does NOT touch the hook's internal state.
   * Use this when you need to fetch with arbitrary variables (e.g. drill-down panels)
   * without triggering parent re-renders from the hook's state updates.
   */
  fetchCustomerLeads: (variables?: CustomerLeadQueryVariables) => Promise<CustomerLeadListData>
}

export function useCustomerLeadsList(
  context: BusinessAppContextProps,
  variables?: CustomerLeadQueryVariables
): UseCustomerLeadsListResult {
  const graphqlClient = useGraphQLClient(context.accessToken)

  // Memoize variables to prevent infinite loops when object is recreated on each render
  const stableVariables = useMemo(() => variables, [JSON.stringify(variables)])

  const [state, setState] = useState({
    leads: [] as CustomerLead[],
    total: 0,
    loading: true,
    error: null as string | null
  })

  const fetchLeads = useCallback(
    async (queryVariables?: CustomerLeadQueryVariables): Promise<CustomerLeadListData> => {
      if (!context.accessToken) {
        setState(prev => ({ ...prev, loading: false }))
        return { leads: [], total: 0 }
      }

      setState(prev => ({ ...prev, loading: true, error: null }))

      try {
        const vars = { ...stableVariables, ...queryVariables }
        const query = buildCustomerLeadQuery()

        const whereCondition = buildCustomerLeadWhereCondition(vars)
        let orderBy = buildCustomerLeadOrderBy(vars.orderBy || [])
        if (orderBy.length === 0) {
          orderBy = buildCustomerLeadOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])
        }

        const graphQLVariables: Record<string, any> = {
          limit: Math.min(vars.limit || 50, 100),
          offset: vars.offset || 0,
          where: whereCondition,
          orderBy: orderBy
        }

        const result = await graphqlClient.request<CustomerLeadListQueryResponse>(query, graphQLVariables)
        const leads = result.Lead.map(toCustomerLead)
        const total = result.LeadAggregate?.aggregate?.count || 0

        setState({ leads, total, loading: false, error: null })
        return { leads, total }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch customer leads'

        setState(prev => ({
          ...prev,
          leads: [],
          total: 0,
          loading: false,
          error: errorMessage
        }))
        return { leads: [], total: 0 }
      }
    },
    [context.accessToken, graphqlClient, stableVariables]
  )

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const fetchCustomerLeads = useCallback(
    async (queryVariables?: CustomerLeadQueryVariables): Promise<CustomerLeadListData> => {
      if (!context.accessToken) {
        return { leads: [], total: 0 }
      }

      const vars = { ...stableVariables, ...queryVariables }
      const query = buildCustomerLeadQuery()
      const whereCondition = buildCustomerLeadWhereCondition(vars)
      let orderBy = buildCustomerLeadOrderBy(vars.orderBy || [])
      if (orderBy.length === 0) {
        orderBy = buildCustomerLeadOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])
      }

      const graphQLVariables: Record<string, any> = {
        limit: Math.min(vars.limit ?? 50, 100),
        offset: vars.offset ?? 0,
        where: whereCondition,
        orderBy
      }

      try {
        const result = await graphqlClient.request<CustomerLeadListQueryResponse>(query, graphQLVariables)
        const leads = result.Lead.map(toCustomerLead)
        const total = result.LeadAggregate?.aggregate?.count || 0
        return { leads, total }
      } catch (error) {
        console.error('Error fetching customer leads:', error instanceof Error ? error.message : error)
        return { leads: [], total: 0 }
      }
    },
    [context.accessToken, graphqlClient, stableVariables]
  )

  return {
    ...state,
    refetch: fetchLeads,
    fetchCustomerLeads
  }
}
