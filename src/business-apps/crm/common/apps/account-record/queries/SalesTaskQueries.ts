import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface SalesTaskQueryVariables {
  accountId: string;
}

export interface SalesTaskData {
  id: string;
  name: string;
  version: number;
  description: string;
  dueDate?: string | null;
  createdAt: string;
  typeRef?: string; // Added this field
  statusRef?: string; // Added status field
  timingType?: string; // Added timing type field
  priorityRef?: string; // Added priority reference field
  assignedEmployeeId?: string; // Added assigned employee ID field
  type: {
    value: string;
  };
  priority: {
    value: string;
  };
  createdBy: string;
  creatorEmployee?: { // Added creator employee details
    id: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    fullName?: string;
  };
  assignedEmployee?: { // Added assigned employee details
    id: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    fullName?: string;
  };
}

export interface SalesTaskResponse {
  SalesTask: SalesTaskData[];
}

export const GET_SALES_TASKS = (variables: SalesTaskQueryVariables): string => {
  return `
    query GetSalesTasks($accountId: uuid!) {
      SalesTask(where: {account: {id: {_eq: $accountId}}, isDeleted: {_eq: false}}) {
        id
        name
        version
        description
        dueDate
        createdAt
        typeRef
        statusRef
        timingType
        priorityRef
        assignedEmployeeId
        type {
          value
        }
        priority {
          value
        }
        createdBy
        creatorEmployee {
          id
          firstName
          lastName
          displayName
          fullName
        }
        assignedEmployee {
          id
          firstName
          lastName
          displayName
          fullName
        }
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