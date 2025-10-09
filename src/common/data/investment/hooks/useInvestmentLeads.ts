// Investment Lead hooks - CRM lead entity operations
import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { BaseInvestmentLead, InvestmentLead } from '../types'

// Use the new query imports
import {
  GET_INVESTMENT_LEADS,
  GET_INVESTMENT_LEAD_BY_ID,
  GET_INVESTMENT_TASKS_BY_LEAD_ID,
  GET_INVESTMENT_ACTIVITIES_BY_LEAD_ID,
  GET_INVESTMENT_NOTES_BY_LEAD_ID,
  GET_INVESTMENT_DOCUMENTS_BY_LEAD_ID,
  type InvestmentLeadQueryVariables
} from '../queries'

// Use the mapper functions
import {
  toInvestmentLead,
  toInvestmentTask,
  toInvestmentActivity,
  toInvestmentNote,
  toInvestmentDocument
} from '../mappers'

// Import base types for related entities
import type { BaseInvestmentTask, BaseInvestmentActivity, BaseInvestmentNote, BaseInvestmentDocument } from '../types'

// Note: InvestmentLeadQueryVariables is imported from queries

// Response interfaces
export interface InvestmentLeadQueryResponse {
  InvestmentLead: BaseInvestmentLead[]
  InvestmentLeadAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface InvestmentLeadByIdData {
  lead?: InvestmentLead
}

// Response interfaces for related entities
export interface InvestmentTaskQueryResponse {
  InvestmentTask: BaseInvestmentTask[]
}

export interface InvestmentActivityQueryResponse {
  InvestmentActivity: BaseInvestmentActivity[]
}

export interface InvestmentNoteQueryResponse {
  InvestmentNote: BaseInvestmentNote[]
}

export interface InvestmentDocumentQueryResponse {
  InvestmentDocument: BaseInvestmentDocument[]
}

// Hook for getting investment leads with full details
export const useGetInvestmentLeads = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentLeads = useCallback(
    async (variables: InvestmentLeadQueryVariables = {}) => {
      const query = GET_INVESTMENT_LEADS(variables)

      try {
        const result = await graphqlClient.request<InvestmentLeadQueryResponse>(query)

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
      const query = GET_INVESTMENT_LEAD_BY_ID(id)

      try {
        const result = await graphqlClient.request<{ InvestmentLead: BaseInvestmentLead[] }>(query)
        const baseLead = result.InvestmentLead[0]

        return {
          lead: baseLead ? toInvestmentLead(baseLead) : undefined
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
      const searchVariables = { ...variables, search: searchTerm }
      const query = GET_INVESTMENT_LEADS(searchVariables)

      try {
        const result = await graphqlClient.request<InvestmentLeadQueryResponse>(query)

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
      const query = GET_INVESTMENT_TASKS_BY_LEAD_ID(leadId)

      try {
        const result = await graphqlClient.request<InvestmentTaskQueryResponse>(query)
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
      const query = GET_INVESTMENT_ACTIVITIES_BY_LEAD_ID(leadId)

      try {
        const result = await graphqlClient.request<InvestmentActivityQueryResponse>(query)
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
      const query = GET_INVESTMENT_NOTES_BY_LEAD_ID(leadId)

      try {
        const result = await graphqlClient.request<InvestmentNoteQueryResponse>(query)
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
      const query = GET_INVESTMENT_DOCUMENTS_BY_LEAD_ID(leadId)

      try {
        const result = await graphqlClient.request<InvestmentDocumentQueryResponse>(query)
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
