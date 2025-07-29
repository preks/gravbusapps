import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface SalesTaskQueryVariables {
  leadId: string;
}

export interface SalesTaskData {
  id: string;
  name: string;
  version: number;
  description: string;
  dueDate?: string | null;
  createdAt: string;
  type: {
    value: string;
  };
  priority: {
    value: string;
  };
  createdBy: string;
}

export interface SalesTaskResponse {
  SalesTask: SalesTaskData[];
}

export const GET_SALES_TASKS = (variables: SalesTaskQueryVariables): string => {
  return `
    query GetSalesTasks($leadId: uuid!) {
      SalesTask(where: {leadId: {_eq: $leadId}, isDeleted: {_eq: false}}) {
        id
        name
        version
        description
        dueDate
        createdAt
        type {
          value
        }
        priority {
          value
        }
        createdBy
      }
    }
  `;
};

export const useGetSalesTasks = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchSalesTasks = async (variables: SalesTaskQueryVariables) => {
    const query = GET_SALES_TASKS(variables);
    try {
      const result = await graphqlClient.request<SalesTaskResponse>(query, variables);
      return result;
    } catch (error) {
      console.error('Error fetching sales tasks:', error);
      throw error;
    }
  };

  return { fetchSalesTasks };
}; 