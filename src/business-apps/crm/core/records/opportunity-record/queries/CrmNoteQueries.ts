import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface CrmNoteQueryVariables {
  opportunityId: string
}

export interface CrmNoteData {
  id: string
  version: number
  noteText: string
  noteTitle: string
  noteType: 'UNKNOWN_NOTE_TYPE' | 'GENERAL_NOTE' | 'NEXT_STEP_NOTE'
  createdAt: string
  createdBy: string
  authorEmployee?: {
    id: string
    firstName?: string
    lastName?: string
    displayName?: string
  }
}

export interface CrmNoteResponse {
  CrmNote: CrmNoteData[]
}

export const GET_CRM_NOTES = (): string => {
  return `
    query GetCrmNotes($opportunityId: uuid!) {
      CrmNote(where: {opportunity: {id: {_eq: $opportunityId}}, isDeleted: {_eq: false}}) {
        id
        version
        createdAt
        createdBy
        noteText
        noteTitle
        noteType
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
  const graphQLClient = useGraphQLClient(context.accessToken)

  const fetchCrmNotes = async (variables: CrmNoteQueryVariables) => {
    const query = GET_CRM_NOTES()
    try {
      const result = await graphQLClient.request<CrmNoteResponse>(query, variables)
      return result
    } catch (error) {
      console.error('Error fetching CRM notes:', error)
      throw error
    }
  }

  return { fetchCrmNotes }
}
