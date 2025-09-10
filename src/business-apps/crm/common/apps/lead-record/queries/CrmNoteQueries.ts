import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface CrmNoteQueryVariables {
  leadId: string;
}

export interface CrmNoteData {
  id: string;
  version: number;
  noteText: string;
  noteTitle: string;
  createdAt: string;
  createdBy: string;
}

export interface CrmNoteResponse {
  CrmNote: CrmNoteData[];
}

export const GET_CRM_NOTES = (variables: CrmNoteQueryVariables): string => {
  return `
    query GetCrmNotes($leadId: uuid!) {
      CrmNote(where: {lead: {id: {_eq: $leadId}}, isDeleted: {_eq: false}}) {
        id
        version
        createdAt
        createdBy
        noteText
        noteTitle
      }
    }
  `;
};

export const useGetCrmNotes = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchCrmNotes = async (variables: CrmNoteQueryVariables) => {
    const query = GET_CRM_NOTES(variables);
    try {
      const result = await graphqlClient.request<CrmNoteResponse>(query, variables);
      return result;
    } catch (error) {
      console.error('Error fetching CRM notes:', error);
      throw error;
    }
  };

  return { fetchCrmNotes };
}; 