import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface ContactActivityQueryVariables {
  contactId: string;
}

export interface ContactActivityData {
  id: string;
  title: string;
  version: number;
  description: string;
  createdAt: string;
  completedAt?: string | null;
  createdBy: string;
  activityType?: {
    code: string;
    id: string;
    type: string;
    value: string;
  };
}

export interface ContactActivityResponse {
  SalesActivity: ContactActivityData[];
}

export const GET_CONTACT_ACTIVITIES = (variables: ContactActivityQueryVariables): string => {
  return `
    query GetContactActivities($contactId: uuid!) {
      SalesActivity(where: {contactId: {_eq: $contactId}, isDeleted: {_eq: false}}) {
        id
        title
        version
        description
        createdAt
        completedAt
        createdBy
        activityType {
          code
          id
          type
          value
        }
      }
    }
  `;
};

export const useGetContactActivities = (context: BusinessAppContextProps) => {
  const graphQLClient = useGraphQLClient(context.accessToken);
  
  const fetchContactActivities = async (variables: ContactActivityQueryVariables) => {
    const query = GET_CONTACT_ACTIVITIES(variables);
    try {
      const result = await graphQLClient.request<ContactActivityResponse>(query, variables);
      return result;
    } catch (error) {
      console.error('Error fetching contact activities:', error);
      throw error;
    }
  };

  return { fetchContactActivities };
}; 