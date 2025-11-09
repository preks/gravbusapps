// Investment Lead hooks - CRM lead entity operations
import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { InvestmentLead } from '../types'
import type { CommonLead } from '@/common/data/relations/types/commonLeadTypes'

// Use the new query builders
import {
  buildInvestmentLeadQuery,
  buildInvestmentLeadByIdQuery,
  buildInvestmentLeadWhereCondition,
  buildInvestmentLeadOrderBy,
  type InvestmentLeadQueryVariables
} from '../queries/investmentLeadQueries.new'

// Import related-entity queries from new file
import {
  GET_INVESTMENT_TASKS_BY_LEAD_ID,
  GET_INVESTMENT_ACTIVITIES_BY_LEAD_ID,
  GET_INVESTMENT_NOTES_BY_LEAD_ID,
  GET_INVESTMENT_DOCUMENTS_BY_LEAD_ID
} from '../queries/investmentLeadQueries.new'

// Import where/orderBy builders for related entities
import { buildInvestmentTaskWhereCondition, buildInvestmentTaskOrderBy } from '../queries/investmentTaskQueries.new'
import {
  buildInvestmentActivityWhereCondition,
  buildInvestmentActivityOrderBy
} from '../queries/investmentActivityQueries.new'
import { buildInvestmentNoteWhereCondition, buildInvestmentNoteOrderBy } from '../queries/investmentNoteQueries.new'
import {
  buildInvestmentDocumentWhereCondition,
  buildInvestmentDocumentOrderBy
} from '../queries/investmentDocumentQueries.new'

// Use the mapper functions
import {
  toInvestmentLead,
  toInvestmentTask,
  toInvestmentActivity,
  toInvestmentNote,
  toInvestmentDocument
} from '../mappers'

// Import base types for related entities
import type { InvestmentTask, InvestmentActivity, InvestmentNote, InvestmentDocument } from '../types'

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
 * Main hook for Investment Leads (matches Customer Leads structure)
 */
export const useInvestmentLeads = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentLeads = useCallback(
    async (variables: InvestmentLeadQueryVariables = {}): Promise<InvestmentLeadListData> => {
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

      const result = await graphqlClient.request<InvestmentLeadQueryResponse>(query, graphQLVariables)
      const leads = result.InvestmentLead.map(toInvestmentLead)
      const total = result.InvestmentLeadAggregate?.aggregate?.count || 0
      return { leads, total }
    },
    [graphqlClient]
  )

  const fetchInvestmentLeadById = useCallback(
    async (id: string): Promise<InvestmentLead | null> => {
      const query = buildInvestmentLeadByIdQuery(undefined, undefined, id)
      const result = await graphqlClient.request<{ InvestmentLeadByPk: CommonLead | null }>(query)
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

      const result = await graphqlClient.request<{ InvestmentLead: CommonLead[] }>(query, graphQLVariables)
      return result.InvestmentLead.map(lead => toInvestmentLead(lead as InvestmentLead))
    },
    [graphqlClient]
  )

  return { fetchInvestmentLeads, fetchInvestmentLeadById, searchInvestmentLeads }
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
      const query = buildInvestmentLeadByIdQuery(undefined, undefined, id)

      try {
        const result = await graphqlClient.request<{ InvestmentLeadByPk: CommonLead | null }>(query)

        return {
          lead: result.InvestmentLeadByPk ? toInvestmentLead(result.InvestmentLeadByPk as InvestmentLead) : undefined
        } as InvestmentLeadByIdData
      } catch (error) {
        console.error('Error fetching investment lead by ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentLeadById }
}

// Hook for searching investment leads
export const useSearchInvestmentLeads = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const searchInvestmentLeads = useCallback(
    async (searchTerm: string, variables: InvestmentLeadQueryVariables = {}) => {
      const query = buildInvestmentLeadQuery()

      const searchVariables = { ...variables, search: searchTerm }
      const whereCondition = buildInvestmentLeadWhereCondition(
        undefined, // Use default LeadFields
        searchVariables
      )

      const orderBy = buildInvestmentLeadOrderBy(
        undefined, // Use default LeadFields
        searchVariables.orderBy || []
      )
      if (orderBy.length === 0) {
        orderBy.push({ createdAt: 'DESC' } as any)
      }

      const graphQLVariables: Record<string, any> = {
        limit: Math.min(searchVariables.limit || 50, 100),
        offset: searchVariables.offset || 0,
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
        console.error('Error searching investment leads:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { searchInvestmentLeads }
}

// =====================================================
// INVESTMENT LEAD RELATED ENTITIES HOOKS
// =====================================================

// Hook for getting investment tasks by lead ID
export const useGetInvestmentTasksByLeadId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentTasksByLeadId = useCallback(
    async (leadId: string) => {
      const query = GET_INVESTMENT_TASKS_BY_LEAD_ID()
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
      const query = GET_INVESTMENT_ACTIVITIES_BY_LEAD_ID()
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
      const query = GET_INVESTMENT_NOTES_BY_LEAD_ID()
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
      const query = GET_INVESTMENT_DOCUMENTS_BY_LEAD_ID()
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
