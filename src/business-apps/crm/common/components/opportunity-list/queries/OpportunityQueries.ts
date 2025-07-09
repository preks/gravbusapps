import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCallback } from 'react';

export interface OpportunityQueryVariables {
  id?: string;
  offset?: number;
  limit?: number;
  search?: string;
  sourceApp?: string;
  orderBy?: any[];
  where?: any;
}

export interface OpportunityDataResponse {
  Opportunity: any[];
  OpportunityAggregate: {
    aggregate: {
      count: number;
    };
  };
}

export const GET_OPPORTUNITIES_DATA = (): string => {
  return `
    query GetOpportunities($offset: Int!, $limit: Int!, $orderBy: [OpportunityOrderBy!]!, $where: OpportunityBoolExp!) {
      Opportunity(
        offset: $offset, 
        limit: $limit, 
        orderBy: $orderBy,
        where: $where
      ) {
        id
        name
        description
        estimatedAmount
        winningChance
        closeDate
        stage
        salesPipeline {
          id
          value
          code
        }
        salesPipelineStage {
          id
          value
          code
        }
        salesOpportunityStatus {
          id
          value
          code
        }
        salesLeadSource {
          id
          value
          code
        }
        currency {
          id
          value
          code
        }
        account {
          id
          name
        }
        accountId
        ownerEmployee {
          id
          firstName
          lastName
          displayName
          pictureThumbnail
        }
        sourceApp
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
};

export const GET_OPPORTUNITY_BY_ID = (): string => {
  return `
    query GetOpportunityById($id: uuid!) {
      Opportunity(where: { id: { _eq: $id } }) {
        id
        name
        description
        estimatedAmount
        winningChance
        closeDate
        stage
        salesPipeline {
          id
          value
          code
        }
        salesPipelineStage {
          id
          value
          code
        }
        salesOpportunityStatus {
          id
          value
          code
        }
        salesLeadSource {
          id
          value
          code
        }
        currency {
          id
          value
          code
        }
        account {
          id
          name
        }
        accountId
        ownerEmployee {
          id
          firstName
          lastName
          displayName
          pictureThumbnail
        }
        sourceApp
        createdAt
        updatedAt
      }
    }
  `;
};

export const useGetOpportunitiesData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchOpportunitiesData = useCallback(async (variables: OpportunityQueryVariables = {}) => {
    const query = GET_OPPORTUNITIES_DATA();
    try {
      const result = await graphqlClient.request<OpportunityDataResponse>(query, {
        offset: variables.offset || 0,
        limit: variables.limit || 20,
        orderBy: variables.orderBy || [{ createdAt: 'DESC' }],
        where: variables.where || { isDeleted: { _eq: false } }
      });
      return result;
    } catch (error) {
      console.error('Error fetching opportunities data:', error);
      throw error;
    }
  }, [graphqlClient]);

  const fetchOpportunityById = useCallback(async (id: string) => {
    const query = GET_OPPORTUNITY_BY_ID();
    try {
      const result = await graphqlClient.request<{ Opportunity: any[] }>(query, { id });
      return result.Opportunity[0] || null;
    } catch (error) {
      console.error('Error fetching opportunity by ID:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchOpportunitiesData, fetchOpportunityById };
}; 