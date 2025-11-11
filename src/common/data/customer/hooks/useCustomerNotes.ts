// Customer Note hooks - list and search operations for customer notes
import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Use the new query builder functions
import {
  buildCustomerNoteByAccountIdQuery,
  buildCustomerNoteByContactIdQuery,
  buildCustomerNoteByLeadIdQuery,
  buildCustomerNoteByOpportunityIdQuery,
  buildCustomerNoteWhereCondition,
  buildCustomerNoteOrderBy
} from '../queries/customerNoteQueries'

// Mapper
import { toCustomerNote } from '../mappers/customerRelatedEntityMappers'

//Types
export interface CustomerNote {
  id: string
  version?: number
  noteTitle?: string
  noteText?: string
  reminderDate?: string
  authorEmployee?: {
    id: string
    displayName?: string
    firstName?: string
    lastName?: string
  }
  createdAt?: string
  updatedAt?: string
  documents?: Array<{
    id: string
    name?: string
    file?: string
    fileInfo?: any
    mimeType?: string
    fileSize?: number
  }>
}

export interface CustomerNoteByEntityQueryResponse {
  CrmNote: CustomerNote[]
}

export const useCustomerNotes = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchCustomerNotesByAccountId = useCallback(
    async (accountId: string): Promise<CustomerNote[]> => {
      const query = buildCustomerNoteByAccountIdQuery()
      const whereCondition = buildCustomerNoteWhereCondition({}, [], [{ account: { id: { _eq: accountId } } }])
      const orderBy = buildCustomerNoteOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      try {
        const result = await graphqlClient.request<CustomerNoteByEntityQueryResponse>(query, {
          where: whereCondition,
          orderBy: orderBy
        })
        return (result.CrmNote || []).map(toCustomerNote)
      } catch (error) {
        console.error('Error fetching customer notes by account ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  const fetchCustomerNotesByContactId = useCallback(
    async (contactId: string): Promise<CustomerNote[]> => {
      const query = buildCustomerNoteByContactIdQuery()
      const whereCondition = buildCustomerNoteWhereCondition({}, [], [{ contact: { id: { _eq: contactId } } }])
      const orderBy = buildCustomerNoteOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      try {
        const result = await graphqlClient.request<CustomerNoteByEntityQueryResponse>(query, {
          where: whereCondition,
          orderBy: orderBy
        })
        return (result.CrmNote || []).map(toCustomerNote)
      } catch (error) {
        console.error('Error fetching customer notes by contact ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  const fetchCustomerNotesByLeadId = useCallback(
    async (leadId: string): Promise<CustomerNote[]> => {
      const query = buildCustomerNoteByLeadIdQuery()
      const whereCondition = buildCustomerNoteWhereCondition({}, [], [{ lead: { id: { _eq: leadId } } }])
      const orderBy = buildCustomerNoteOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      try {
        const result = await graphqlClient.request<CustomerNoteByEntityQueryResponse>(query, {
          where: whereCondition,
          orderBy: orderBy
        })
        return (result.CrmNote || []).map(toCustomerNote)
      } catch (error) {
        console.error('Error fetching customer notes by lead ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  const fetchCustomerNotesByOpportunityId = useCallback(
    async (opportunityId: string): Promise<CustomerNote[]> => {
      const query = buildCustomerNoteByOpportunityIdQuery()
      const whereCondition = buildCustomerNoteWhereCondition({}, [], [{ opportunity: { id: { _eq: opportunityId } } }])
      const orderBy = buildCustomerNoteOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      try {
        const result = await graphqlClient.request<CustomerNoteByEntityQueryResponse>(query, {
          where: whereCondition,
          orderBy: orderBy
        })
        return (result.CrmNote || []).map(toCustomerNote)
      } catch (error) {
        console.error('Error fetching customer notes by opportunity ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return {
    fetchCustomerNotesByAccountId,
    fetchCustomerNotesByContactId,
    fetchCustomerNotesByLeadId,
    fetchCustomerNotesByOpportunityId
  }
}
