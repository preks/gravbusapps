import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface ContactDocumentQueryVariables {
  contactId: string;
}

export interface ContactDocumentData {
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

export interface ContactDocumentResponse {
  CrmDocument: ContactDocumentData[];
}

export const GET_CONTACT_DOCUMENTS = (variables: ContactDocumentQueryVariables): string => {
  return `
    query GetContactDocuments($contactId: uuid!) {
      CrmDocument(where: {contactId: {_eq: $contactId}, isDeleted: {_eq: false}}) {
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

export const useGetContactDocuments = (context: BusinessAppContextProps) => {
  const graphQLClient = useGraphQLClient(context.accessToken);
  
  const fetchContactDocuments = async (variables: ContactDocumentQueryVariables) => {
    const query = GET_CONTACT_DOCUMENTS(variables);
    try {
      const result = await graphQLClient.request<ContactDocumentResponse>(query, variables);
      return result;
    } catch (error) {
      console.error('Error fetching contact documents:', error);
      throw error;
    }
  };

  return { fetchContactDocuments };
}; 