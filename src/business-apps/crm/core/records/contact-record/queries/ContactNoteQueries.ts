import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface ContactNoteQueryVariables {
  contactId: string
}

export interface ContactNoteData {
  id: string
  version: number
  noteText: string
  noteTitle: string
  createdAt: string
  createdBy: string
  authorEmployee?: {
    id: string
    firstName?: string
    lastName?: string
    displayName?: string
  }
  documents?: Array<{
    id: string
    name?: string
    file?: string
    fileInfo?: any
    mimeType?: string
    fileSize?: number
  }>
}

export interface ContactNoteResponse {
  CrmNote: ContactNoteData[]
}

export const GET_CONTACT_NOTES = (): string => {
  return `
    query GetContactNotes($contactId: uuid!) {
      CrmNote(where: {contact: {id: {_eq: $contactId}}, isDeleted: {_eq: false}}) {
        id
        version
        createdAt
        createdBy
        noteText
        noteTitle
        authorEmployee {
          id
          firstName
          lastName
          displayName
        }
      }
    }
  `
}

export const useGetContactNotes = (context: BusinessAppContextProps) => {
  const graphQLClient = useGraphQLClient(context.accessToken)

  const fetchContactNotes = useCallback(
    async (variables: ContactNoteQueryVariables) => {
      const query = GET_CONTACT_NOTES()
      try {
        const result = await graphQLClient.request<ContactNoteResponse>(query, variables)
        return result
      } catch (error) {
        console.error('Error fetching contact notes:', error)
        throw error
      }
    },
    [graphQLClient]
  )

  return { fetchContactNotes }
}
