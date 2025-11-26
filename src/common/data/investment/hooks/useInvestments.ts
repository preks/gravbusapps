// Investment hooks - Core investment entities and their specializations
import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { Investment, InvestmentDocument } from '../types/investmentTypes'
// Interface for investment by ID data
export interface InvestmentByIdData {
  investment?: Investment
}

// Use the new query imports
import { GET_INVESTMENTS, GET_INVESTMENT_BY_ID, type InvestmentQueryVariables } from '../queries/investmentQueries'
import { GET_INVESTMENT_DOCUMENTS_BY_INVESTMENT_ID } from '../queries/investmentDocumentQueries'

// Use the mapper functions
import { toInvestment } from '../mappers/investmentMappers'
import { toInvestmentDocument } from '../mappers/investmentRelatedEntityMappers'

// Note: InvestmentQueryVariables is imported from queries

// Response interfaces
export interface InvestmentQueryResponse {
  Investment: Investment[]
  InvestmentAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface InvestmentByIdData {
  investment?: Investment
}

// Note: Specialized investment hooks will be in separate files when needed

// =============================================================================
// CORE INVESTMENT HOOKS
// =============================================================================

// Hook for getting investments with full details
export const useGetInvestments = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestments = useCallback(
    async (variables: InvestmentQueryVariables = {}) => {
      const query = GET_INVESTMENTS(variables)

      try {
        const result = await graphqlClient.request<InvestmentQueryResponse>(query)

        // Transform base types to enhanced types using mapper
        const enhancedInvestments = result.Investment.map(toInvestment)

        return {
          ...result,
          Investment: enhancedInvestments
        }
      } catch (error) {
        console.error('Error fetching investments:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestments }
}

// Hook for getting investment by ID
export const useGetInvestmentById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentById = useCallback(
    async (id: string) => {
      const query = GET_INVESTMENT_BY_ID(id)
      try {
        // Request raw object to preserve specialization blocks (equity/realEstate/liquidFund)
        const result = await graphqlClient.request<any>(query)
        const rawInvestment = result?.Investment?.[0]
        return {
          // Return raw object so callers can access specialization arrays; cast to keep external type stable
          investment: toInvestment(rawInvestment)
        } as InvestmentByIdData
      } catch (error) {
        console.error('Error fetching investment by ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentById }
}

// Hook for searching investments
export const useSearchInvestments = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const searchInvestments = useCallback(
    async (searchTerm: string, variables: InvestmentQueryVariables = {}) => {
      const searchVariables = { ...variables, search: searchTerm }
      const query = GET_INVESTMENTS(searchVariables)

      try {
        const result = await graphqlClient.request<InvestmentQueryResponse>(query)

        // Transform base types to enhanced types using mapper
        const enhancedInvestments = result.Investment.map(toInvestment)

        return {
          ...result,
          Investment: enhancedInvestments
        }
      } catch (error) {
        console.error('Error searching investments:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { searchInvestments }
}

// =====================================================
// INVESTMENT DOCUMENT HOOKS
// =====================================================

// Hook for getting investment documents by investment ID
export const useGetInvestmentDocumentsByInvestmentId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentDocumentsByInvestmentId = useCallback(
    async (investmentId: string, createdBy?: string) => {
      const query = GET_INVESTMENT_DOCUMENTS_BY_INVESTMENT_ID({
        investmentId,
        createdBy // Pass the createdBy filter for server-side filtering
      })

      try {
        const result = await graphqlClient.request<{ InvestmentDocument: InvestmentDocument[] }>(query)
        // Transform base types to enhanced types using mapper
        return result.InvestmentDocument.map(toInvestmentDocument)
      } catch (error) {
        console.error('Error fetching investment documents by investment ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentDocumentsByInvestmentId }
}

// =====================================================
// INVESTMENT RELATED ENTITIES HOOKS
// =====================================================

// Hook for getting investments by account ID
export const useGetInvestmentsByAccountId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentsByAccountId = useCallback(
    async (accountId: string) => {
      const variables: InvestmentQueryVariables = {
        accountIds: [accountId],
        limit: 100
      }

      const query = GET_INVESTMENTS(variables)

      try {
        const result = await graphqlClient.request<InvestmentQueryResponse>(query)
        const enhancedInvestments = result.Investment.map(toInvestment)

        return {
          ...result,
          Investment: enhancedInvestments
        }
      } catch (error) {
        console.error('Error fetching investments by account ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentsByAccountId }
}

// Hook for getting investments by contact ID (via account relationship)
export const useGetInvestmentsByContactId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentsByContactId = useCallback(
    async (contactId: string, accountIds: string[]) => {
      if (!accountIds || accountIds.length === 0) {
        return { Investment: [], InvestmentAggregate: { aggregate: { count: 0 } } }
      }

      const variables: InvestmentQueryVariables = {
        accountIds: accountIds,
        limit: 100
      }

      const query = GET_INVESTMENTS(variables)

      try {
        const result = await graphqlClient.request<InvestmentQueryResponse>(query)
        const enhancedInvestments = result.Investment.map(toInvestment)

        return {
          ...result,
          Investment: enhancedInvestments
        }
      } catch (error) {
        console.error('Error fetching investments by contact ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentsByContactId }
}
