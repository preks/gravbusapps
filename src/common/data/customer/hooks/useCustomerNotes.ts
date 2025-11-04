// Customer Note hooks - list and search operations for customer notes
import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

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
      const query = `
        query GetCustomerNotesByAccountId {
          CrmNote(
            where: { 
              account: { id: { _eq: "${accountId}" } }, 
              isDeleted: { _eq: false } 
            }
            orderBy: [{ createdAt: DESC }]
          ) {
            id
            version
            noteTitle
            noteText
            reminderDate
            createdAt
            updatedAt
            authorEmployee {
              id
              displayName
              firstName
              lastName
            }
          }
        }
      `

      try {
        const result = await graphqlClient.request<CustomerNoteByEntityQueryResponse>(query)
        return result.CrmNote || []
      } catch (error) {
        console.error('Error fetching customer notes by account ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  const fetchCustomerNotesByContactId = useCallback(
    async (contactId: string): Promise<CustomerNote[]> => {
      const query = `
        query GetCustomerNotesByContactId {
          CrmNote(
            where: { 
              contact: { id: { _eq: "${contactId}" } }, 
              isDeleted: { _eq: false } 
            }
            orderBy: [{ createdAt: DESC }]
          ) {
            id
            version
            noteTitle
            noteText
            reminderDate
            createdAt
            updatedAt
            authorEmployee {
              id
              displayName
              firstName
              lastName
            }
          }
        }
      `

      try {
        const result = await graphqlClient.request<CustomerNoteByEntityQueryResponse>(query)
        return result.CrmNote || []
      } catch (error) {
        console.error('Error fetching customer notes by contact ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  const fetchCustomerNotesByLeadId = useCallback(
    async (leadId: string): Promise<CustomerNote[]> => {
      const query = `
        query GetCustomerNotesByLeadId {
          CrmNote(
            where: { 
              lead: { id: { _eq: "${leadId}" } }, 
              isDeleted: { _eq: false } 
            }
            orderBy: [{ createdAt: DESC }]
          ) {
            id
            version
            noteTitle
            noteText
            reminderDate
            createdAt
            updatedAt
            authorEmployee {
              id
              displayName
              firstName
              lastName
            }
          }
        }
      `

      try {
        const result = await graphqlClient.request<CustomerNoteByEntityQueryResponse>(query)
        return result.CrmNote || []
      } catch (error) {
        console.error('Error fetching customer notes by lead ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  const fetchCustomerNotesByOpportunityId = useCallback(
    async (opportunityId: string): Promise<CustomerNote[]> => {
      const query = `
        query GetCustomerNotesByOpportunityId {
          CrmNote(
            where: { 
              opportunity: { id: { _eq: "${opportunityId}" } }, 
              isDeleted: { _eq: false } 
            }
            orderBy: [{ createdAt: DESC }]
          ) {
            id
            version
            noteTitle
            noteText
            reminderDate
            createdAt
            updatedAt
            authorEmployee {
              id
              displayName
              firstName
              lastName
            }
          }
        }
      `

      try {
        const result = await graphqlClient.request<CustomerNoteByEntityQueryResponse>(query)
        return result.CrmNote || []
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
