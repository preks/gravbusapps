import { useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { Opportunity } from '../../../../../components/opportunity-list/types';

export interface EmployeeOpportunitiesQueryVariables {
  employeeId: string;
  offset?: number;
  limit?: number;
  orderBy?: Array<any>;
  where?: any;
}

export interface EmployeeOpportunitiesResponse {
  Opportunity: Opportunity[];
  OpportunityAggregate: {
    aggregate: {
      count: number;
    };
  };
}

// Query to get opportunities owned by a specific employee
export const GET_EMPLOYEE_OPPORTUNITIES_QUERY = `
  query GetEmployeeOpportunities($offset: Int, $limit: Int, $orderBy: [OpportunityOrderBy!], $where: OpportunityBoolExp) {
    Opportunity(
      offset: $offset, 
      limit: $limit, 
      orderBy: $orderBy, 
      where: $where
    ) {
      id
      name
      estimatedAmount
      winningChance
      stage
      closeDate
      accountId
      salesPipeline {
        id
        value
        code
        objectValue
      }
      salesPipelineStage {
        id
        value
        code
        objectValue
      }
      account {
        id
        name
      }
      ownerEmployee {
        id
        firstName
        lastName
        displayName
        pictureThumbnail
      }
      currency {
        id
        value
        code
        objectValue
      }
      createdAt
      updatedAt
    }
    OpportunityAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

export const useEmployeeOpportunitiesQueries = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchEmployeeOpportunities = useCallback(async (variables: EmployeeOpportunitiesQueryVariables): Promise<EmployeeOpportunitiesResponse> => {
    // Build where clause with employee filter and additional conditions
    const baseWhere = {
      isDeleted: { _eq: false },
      ownerEmployeeId: { _eq: variables.employeeId }
    };

    // Merge with any additional where conditions
    const where = variables.where ? {
      _and: [baseWhere, variables.where]
    } : baseWhere;

    const requestVariables = {
      offset: variables.offset || 0,
      limit: variables.limit || 20,
      orderBy: variables.orderBy || [{ createdAt: "DESC" }],
      where
    };

    try {
      const result = await graphqlClient.request<EmployeeOpportunitiesResponse>(
        GET_EMPLOYEE_OPPORTUNITIES_QUERY, 
        requestVariables
      );
      return result;
    } catch (error) {
      console.error('Error fetching employee opportunities data:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchEmployeeOpportunities };
}; 