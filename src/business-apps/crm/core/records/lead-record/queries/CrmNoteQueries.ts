import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface CrmNoteQueryVariables {
  leadId: string
}

export interface CrmNoteData {
  id: string
  version: number
  noteText: string
  noteTitle: string
  noteType: 'UNKNOWN_NOTE_TYPE' | 'GENERAL_NOTE' | 'NEXT_STEP_NOTE'
  createdAt: string
  createdBy: string
}

export interface CrmNoteResponse {
  CrmNote: CrmNoteData[]
}

export const GET_CRM_NOTES = (): string => {
  return `
    query GetCrmNotes($leadId: uuid!) {
      CrmNote(where: {lead: {id: {_eq: $leadId}}, isDeleted: {_eq: false}}) {
        id
        version
        createdAt
        createdBy
        noteText
        noteTitle
        noteType
        title: noteTitle
        displayName: noteTitle
        text: noteText
        reminderDate
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

export const useGetCrmNotes = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchCrmNotes = useCallback(
    async (variables: CrmNoteQueryVariables) => {
      const query = GET_CRM_NOTES()
      try {
        const result = await graphqlClient.request<CrmNoteResponse>(query, variables)
        return result
      } catch (error) {
        console.error('Error fetching CRM notes:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchCrmNotes }
}
