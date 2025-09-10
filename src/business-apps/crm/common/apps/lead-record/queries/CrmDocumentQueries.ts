import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface CrmDocumentQueryVariables {
  leadId: string;
}

export interface CrmDocumentData {
  version: number;
  id: string;
  name: string;
  createdAt: string;
  documentType: {
    value: string;
  };
  file?: string;
  mimeType?: string;
  fileSize?: number;
  createdBy: string;
}

export interface CrmDocumentResponse {
  CrmDocument: CrmDocumentData[];
}

export const GET_CRM_DOCUMENTS = (variables: CrmDocumentQueryVariables): string => {
  return `
    query GetCrmDocuments($leadId: uuid!) {
      CrmDocument(where: {lead: {id: {_eq: $leadId}}, isDeleted: {_eq: false}}) {
        version
        id
        name
        createdAt
        documentType {
          value
        }
        file
        mimeType
        fileSize
        createdBy
      }
    }
  `;
};

export const useGetCrmDocuments = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchCrmDocuments = async (variables: CrmDocumentQueryVariables) => {
    const query = GET_CRM_DOCUMENTS(variables);
    try {
      const result = await graphqlClient.request<CrmDocumentResponse>(query, variables);
      return result;
    } catch (error) {
      console.error('Error fetching CRM documents:', error);
      throw error;
    }
  };

  return { fetchCrmDocuments };
}; 