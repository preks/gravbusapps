// Investment Lead hooks - CRM lead entity operations
import { useCallback, useState, useEffect, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GraphQLClient } from '@/common/network/graphql/GraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { InvestmentLead } from '../types/investmentLeadTypes'
import type { InvestmentTask } from '../types/investmentTaskTypes'
import type { InvestmentActivity } from '../types/investmentActivityTypes'
import type { InvestmentNote } from '../types/investmentNoteTypes'
import type { InvestmentDocument } from '../types/investmentDocumentTypes'
import type { Lead } from '@/common/data/relations/types/leadTypes'

// Use the new query builders
import {
  buildInvestmentLeadQuery,
  buildInvestmentLeadByIdQuery,
  buildInvestmentLeadWhereCondition,
  buildInvestmentLeadOrderBy,
  type InvestmentLeadQueryVariables
} from '../queries/investmentLeadQueries'

// Import where/orderBy builders for related entities
import {
  buildInvestmentTaskByLeadIdQuery,
  buildInvestmentTaskWhereCondition,
  buildInvestmentTaskOrderBy
} from '../queries/investmentTaskQueries'
import {
  buildInvestmentActivityByLeadIdQuery,
  buildInvestmentActivityWhereCondition,
  buildInvestmentActivityOrderBy
} from '../queries/investmentActivityQueries'
import {
  buildInvestmentNoteByLeadIdQuery,
  buildInvestmentNoteWhereCondition,
  buildInvestmentNoteOrderBy
} from '../queries/investmentNoteQueries'
import {
  buildInvestmentDocumentByLeadIdQuery,
  buildInvestmentDocumentWhereCondition,
  buildInvestmentDocumentOrderBy
} from '../queries/investmentDocumentQueries'

// Use the mapper functions
import { toInvestmentLead } from '../types/investmentLeadTypes'
import { toInvestmentTask } from '../mappers/investmentTaskMappers'
import { toInvestmentActivity, toInvestmentNote, toInvestmentDocument } from '../mappers/investmentRelatedEntityMappers'

// Response interfaces
export interface InvestmentLeadQueryResponse {
  InvestmentLead: InvestmentLead[]
  InvestmentLeadAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface InvestmentLeadListData {
  leads: InvestmentLead[]
  total: number
}

export interface InvestmentLeadByIdData {
  lead?: InvestmentLead
}

// Response interfaces for related entities
export interface InvestmentTaskQueryResponse {
  InvestmentTask: InvestmentTask[]
}

export interface InvestmentActivityQueryResponse {
  InvestmentActivity: InvestmentActivity[]
}

export interface InvestmentNoteQueryResponse {
  InvestmentNote: InvestmentNote[]
}

export interface InvestmentDocumentQueryResponse {
  InvestmentDocument: InvestmentDocument[]
}

/**
 * @deprecated This hook is in transition. Use `useInvestmentLeadsList` instead.
 *
 * Legacy function-only hook for investment leads.
 * Returns fetch functions without state management.
 */
export const useInvestmentLeads = (context: BusinessAppContextProps) => {
  const graphqlClient: GraphQLClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentLeads = useCallback(
    async (variables: InvestmentLeadQueryVariables = {}): Promise<InvestmentLeadListData> => {
      const query = buildInvestmentLeadQuery()

      const whereCondition = buildInvestmentLeadWhereCondition(variables)

      const orderBy = buildInvestmentLeadOrderBy(variables.orderBy || [])
      if (orderBy.length === 0) {
        orderBy.push({ createdAt: 'DESC' } as any)
      }

      const graphQLVariables: Record<string, any> = {
        limit: variables.limit || 50,
        offset: variables.offset || 0,
        where: whereCondition,
        orderBy: orderBy
      }

      const result = await graphqlClient.request<InvestmentLeadQueryResponse>(query, graphQLVariables)
      const leads = result.InvestmentLead.map(toInvestmentLead)
      const total = result.InvestmentLeadAggregate?.aggregate?.count || 0
      return { leads, total }
    },
    [graphqlClient]
  )

  const fetchInvestmentLeadById = useCallback(
    async (id: string): Promise<InvestmentLead | null> => {
      const query = buildInvestmentLeadByIdQuery()
      const result = await graphqlClient.request<{ InvestmentLeadByPk: InvestmentLead | null }>(query, { id })
      return result.InvestmentLeadByPk ? toInvestmentLead(result.InvestmentLeadByPk as InvestmentLead) : null
    },
    [graphqlClient]
  )

  const searchInvestmentLeads = useCallback(
    async (variables: InvestmentLeadQueryVariables): Promise<InvestmentLead[]> => {
      const query = buildInvestmentLeadQuery()

      const whereCondition = buildInvestmentLeadWhereCondition(variables)

      const orderBy = buildInvestmentLeadOrderBy(variables.orderBy || [])
      if (orderBy.length === 0) {
        orderBy.push({ createdAt: 'DESC' } as any)
      }

      const graphQLVariables: Record<string, any> = {
        limit: Math.min(variables.limit || 50, 100),
        offset: variables.offset || 0,
        where: whereCondition,
        orderBy: orderBy
      }

      const result = await graphqlClient.request<{ InvestmentLead: Lead[] }>(query, graphQLVariables)
      return result.InvestmentLead.map(lead => toInvestmentLead(lead as InvestmentLead))
    },
    [graphqlClient]
  )

  return { fetchInvestmentLeads, fetchInvestmentLeadById, searchInvestmentLeads }
}

/**
 * Declarative List Hook for Investment Leads
 *
 * Automatically fetches and manages state for a list of investment leads.
 * Follows the Hook Refactoring Guide Pattern 2.
 *
 * @example
 * const { leads, loading, error, refetch } = useInvestmentLeadsList(context, { limit: 20 })
 *
 * @todo MIGRATION: Replace all usages of deprecated `useInvestmentLeads` with this hook
 * @todo RENAME: After migration is complete, rename this hook to `useInvestmentLeads` and remove the deprecated hook
 */
export interface UseInvestmentLeadsListResult {
  leads: InvestmentLead[]
  total: number
  loading: boolean
  error: string | null
  refetch: (variables?: InvestmentLeadQueryVariables) => Promise<InvestmentLeadListData>
  /**
   * Imperative fetch that does NOT touch the hook's internal state.
   * Use this when you need to fetch with arbitrary variables (e.g. drill-down panels)
   * without triggering parent re-renders from the hook's state updates.
   */
  fetchInvestmentLeads: (variables?: InvestmentLeadQueryVariables) => Promise<InvestmentLeadListData>
}

export function useInvestmentLeadsList(
  context: BusinessAppContextProps,
  variables?: InvestmentLeadQueryVariables
): UseInvestmentLeadsListResult {
  const graphqlClient = useGraphQLClient(context.accessToken)

  // Memoize variables to prevent infinite loops when object is recreated on each render
  const stableVariables = useMemo(() => variables, [JSON.stringify(variables)])

  const [state, setState] = useState({
    leads: [] as InvestmentLead[],
    total: 0,
    loading: true,
    error: null as string | null
  })

  const fetchLeads = useCallback(
    async (queryVariables?: InvestmentLeadQueryVariables): Promise<InvestmentLeadListData> => {
      if (!context.accessToken) {
        setState(prev => ({ ...prev, loading: false }))
        return { leads: [], total: 0 }
      }

      setState(prev => ({ ...prev, loading: true, error: null }))

      try {
        const vars = { ...stableVariables, ...queryVariables }
        const query = buildInvestmentLeadQuery()

        const whereCondition = buildInvestmentLeadWhereCondition(vars)
        const orderBy = buildInvestmentLeadOrderBy(vars.orderBy || [])
        if (orderBy.length === 0) {
          orderBy.push({ createdAt: 'DESC' } as any)
        }

        const graphQLVariables: Record<string, any> = {
          limit: Math.min(vars.limit || 50, 100),
          offset: vars.offset || 0,
          where: whereCondition,
          orderBy: orderBy
        }

        const result = await graphqlClient.request<InvestmentLeadQueryResponse>(query, graphQLVariables)
        const leads = result.InvestmentLead.map(toInvestmentLead)
        const total = result.InvestmentLeadAggregate?.aggregate?.count || 0

        setState({ leads, total, loading: false, error: null })
        return { leads, total }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch investment leads'

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

  const fetchInvestmentLeads = useCallback(
    async (queryVariables?: InvestmentLeadQueryVariables): Promise<InvestmentLeadListData> => {
      if (!context.accessToken) {
        return { leads: [], total: 0 }
      }

      const vars = { ...stableVariables, ...queryVariables }
      const query = buildInvestmentLeadQuery()
      const whereCondition = buildInvestmentLeadWhereCondition(vars)
      const orderBy = buildInvestmentLeadOrderBy(vars.orderBy || [])
      if (orderBy.length === 0) {
        orderBy.push({ createdAt: 'DESC' } as any)
      }

      const graphQLVariables: Record<string, any> = {
        limit: Math.min(vars.limit ?? 50, 100),
        offset: vars.offset ?? 0,
        where: whereCondition,
        orderBy
      }

      try {
        const result = await graphqlClient.request<InvestmentLeadQueryResponse>(query, graphQLVariables)
        const leads = result.InvestmentLead.map(toInvestmentLead)
        const total = result.InvestmentLeadAggregate?.aggregate?.count || 0
        return { leads, total }
      } catch (error) {
        console.error('Error fetching investment leads:', error instanceof Error ? error.message : error)
        return { leads: [], total: 0 }
      }
    },
    [context.accessToken, graphqlClient, stableVariables]
  )

  return {
    ...state,
    refetch: fetchLeads,
    fetchInvestmentLeads
  }
}

// =====================================================
// LEGACY HOOKS (for backwards compatibility)
// =====================================================

// Hook for getting investment leads with full details
export const useGetInvestmentLeads = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentLeads = useCallback(
    async (variables: InvestmentLeadQueryVariables = {}) => {
      const query = buildInvestmentLeadQuery()

      const whereCondition = buildInvestmentLeadWhereCondition(variables)

      const orderBy = buildInvestmentLeadOrderBy(variables.orderBy || [])
      if (orderBy.length === 0) {
        orderBy.push({ createdAt: 'DESC' } as any)
      }

      const graphQLVariables: Record<string, any> = {
        limit: Math.min(variables.limit || 50, 100),
        offset: variables.offset || 0,
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<InvestmentLeadQueryResponse>(query, graphQLVariables)

        // Transform base types to enhanced types using mapper
        const enhancedLeads = result.InvestmentLead.map(toInvestmentLead)

        return {
          ...result,
          InvestmentLead: enhancedLeads
        }
      } catch (error) {
        console.error('Error fetching investment leads:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentLeads }
}

// Hook for getting investment lead by ID
export const useGetInvestmentLeadById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentLeadById = useCallback(
    async (id: string) => {
      const query = buildInvestmentLeadByIdQuery()

      try {
        const result = await graphqlClient.request<{
          InvestmentLeadByPk: InvestmentLead | null
          leadStatuses?: Array<{
            id: string
            code: string
            value: string
            alternativeCode?: string
          }>
        }>(query, { id })

        const lead = result.InvestmentLeadByPk ? toInvestmentLead(result.InvestmentLeadByPk) : undefined
        return {
          lead: lead ? { ...lead, leadStatuses: result.leadStatuses || [] } : undefined
        } as InvestmentLeadByIdData & {
          lead?: InvestmentLead & {
            leadStatuses?: Array<{ id: string; code: string; value: string; alternativeCode?: string }>
          }
        }
      } catch (error) {
        console.error('Error fetching investment lead by ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentLeadById }
}

// =====================================================
// INVESTMENT LEAD RELATED ENTITIES HOOKS
// =====================================================

// Hook for getting investment tasks by lead ID
export const useGetInvestmentTasksByLeadId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentTasksByLeadId = useCallback(
    async (leadId: string) => {
      const query = buildInvestmentTaskByLeadIdQuery()
      const whereCondition = buildInvestmentTaskWhereCondition(
        {},
        [],
        [{ lead: { id: { _eq: leadId } }, isDeleted: { _eq: false } }]
      )
      const orderBy = buildInvestmentTaskOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      const graphQLVariables = {
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<InvestmentTaskQueryResponse>(query, graphQLVariables)
        // Transform base types to enhanced types using mapper
        return result.InvestmentTask.map(toInvestmentTask)
      } catch (error) {
        console.error('Error fetching investment tasks by lead ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentTasksByLeadId }
}

// Hook for getting investment activities by lead ID
export const useGetInvestmentActivitiesByLeadId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentActivitiesByLeadId = useCallback(
    async (leadId: string) => {
      const query = buildInvestmentActivityByLeadIdQuery()
      const whereCondition = buildInvestmentActivityWhereCondition(
        {},
        [],
        [{ lead: { id: { _eq: leadId } }, isDeleted: { _eq: false } }]
      )
      const orderBy = buildInvestmentActivityOrderBy([{ field: 'occurredAt', direction: 'DESC_NULLS_LAST' }])

      const graphQLVariables = {
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<InvestmentActivityQueryResponse>(query, graphQLVariables)
        // Transform base types to enhanced types using mapper
        return result.InvestmentActivity.map(toInvestmentActivity)
      } catch (error) {
        console.error('Error fetching investment activities by lead ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentActivitiesByLeadId }
}

// Hook for getting investment notes by lead ID
export const useGetInvestmentNotesByLeadId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentNotesByLeadId = useCallback(
    async (leadId: string) => {
      const query = buildInvestmentNoteByLeadIdQuery()
      const whereCondition = buildInvestmentNoteWhereCondition(
        {},
        [],
        [{ lead: { id: { _eq: leadId } }, isDeleted: { _eq: false } }]
      )
      const orderBy = buildInvestmentNoteOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      const graphQLVariables = {
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<InvestmentNoteQueryResponse>(query, graphQLVariables)
        // Transform base types to enhanced types using mapper
        return result.InvestmentNote.map(toInvestmentNote)
      } catch (error) {
        console.error('Error fetching investment notes by lead ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentNotesByLeadId }
}

// Hook for getting investment documents by lead ID
export const useGetInvestmentDocumentsByLeadId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentDocumentsByLeadId = useCallback(
    async (leadId: string) => {
      const query = buildInvestmentDocumentByLeadIdQuery()
      const whereCondition = buildInvestmentDocumentWhereCondition(
        {},
        [],
        [{ lead: { id: { _eq: leadId } }, isDeleted: { _eq: false } }]
      )
      const orderBy = buildInvestmentDocumentOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      const graphQLVariables = {
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<InvestmentDocumentQueryResponse>(query, graphQLVariables)
        // Transform base types to enhanced types using mapper
        return result.InvestmentDocument.map(toInvestmentDocument)
      } catch (error) {
        console.error('Error fetching investment documents by lead ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentDocumentsByLeadId }
}
