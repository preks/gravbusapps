// Customer Lead hooks - list and by-id operations for leads
import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Types
import type { BaseCustomerLead, CustomerLead } from '../types'

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
import { toCustomerLead } from '../mappers/customerLeadMappers'

export interface CustomerLeadListQueryResponse {
  Lead: BaseCustomerLead[]
  LeadAggregate: {
    aggregate: { count: number }
  }
}

export interface CustomerLeadListData {
  leads: CustomerLead[]
  total: number
}

export const useCustomerLeads = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchCustomerLeads = useCallback(
    async (variables: CustomerLeadQueryVariables = {}): Promise<CustomerLeadListData> => {
      const query = buildCustomerLeadQuery()

      const whereCondition = buildCustomerLeadWhereCondition(variables)
      const orderBy = buildCustomerLeadOrderBy(variables.orderBy || [])
      if (orderBy.length === 0) {
        orderBy.push({ field: 'createdAt', direction: 'DESC_NULLS_LAST' })
      }

      const graphQLVariables: Record<string, any> = {
        limit: Math.min(variables.limit || 50, 100),
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
      const query = buildCustomerLeadByIdQuery(undefined, id)
      const result = await graphqlClient.request<{
        LeadByPk: BaseCustomerLead | null
        leadStatuses?: Array<{
          id: string
          code: string
          value: string
          alternativeCode?: string
        }>
      }>(query)
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
      const result = await graphqlClient.request<{ Lead: BaseCustomerLead[] }>(query, graphQLVariables)
      return result.Lead.map(toCustomerLead)
    },
    [graphqlClient]
  )

  return { fetchCustomerLeads, fetchCustomerLeadById, searchCustomerLeads }
}
