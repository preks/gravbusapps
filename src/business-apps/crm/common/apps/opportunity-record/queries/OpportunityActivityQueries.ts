import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface SalesActivityQueryVariables {
  opportunityId: string;
}

export interface SalesActivityData {
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

export interface SalesActivityResponse {
  SalesActivity: SalesActivityData[];
}

export const GET_SALES_ACTIVITIES = (variables: SalesActivityQueryVariables): string => {
  return `
    query GetSalesActivities($opportunityId: uuid!) {
      SalesActivity(where: {opportunityId: {_eq: $opportunityId}, isDeleted: {_eq: false}}) {
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

export const useGetSalesActivities = (context: BusinessAppContextProps) => {
  const graphQLClient = useGraphQLClient(context.accessToken);
  
  const fetchSalesActivities = async (variables: SalesActivityQueryVariables) => {
    const query = GET_SALES_ACTIVITIES(variables);
    try {
      const result = await graphQLClient.request<SalesActivityResponse>(query, variables);
      return result;
    } catch (error) {
      console.error('Error fetching sales activities:', error);
      throw error;
    }
  };

  return { fetchSalesActivities };
}; 