import { useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface OpportunityQueryVariables {
  offset?: number;
  limit?: number;
  where?: any;
  orderBy?: any;
}

export interface OpportunityData {
  id: string;
  name: string;
  estimatedAmount: number;
  winningChance: number;
  stage: string;
  status: string;
  closeDate: string;
  notesSummary: string; // Changed from description to notesSummary
  salesPipeline: {
    id: string;
    value: string;
    code: string;
  };
  salesPipelineStage: {
    id: string;
    value: string;
    code: string;
  };
  opportunityStatus: {
    id: string;
    value: string;
    code: string;
  };
  account: {
    id: string;
    name: string;
  };
  ownerEmployee: {
    id: string;
    firstName: string;
    lastName: string;
  };
  currency: {
    id: string;
    value: string;
    code: string;
  };
  lastInteraction: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetOpportunitiesResponse {
  Opportunity: OpportunityData[];
  OpportunityAggregate: {
    aggregate: {
      count: number;
    };
  };
}

export const GET_OPPORTUNITIES_DATA = `
  query GetOpportunities(
    $where: OpportunityBoolExp
    $limit: Int 
    $offset: Int
    $orderBy: [OpportunityOrderBy!]
  ) { 
    Opportunity(
      where: $where 
      limit: $limit 
      offset: $offset
      orderBy: $orderBy
    ) {
      id
      name
      estimatedAmount
      winningChance
      stage
      status
      closeDate
      notesSummary
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
      opportunityStatus {
        id
        value
        code
      }
      account {
        id
        name
      }
      ownerEmployee {
        id
        firstName
        lastName
        pictureThumbnail
      }
      currency {
        id
        value
        code
      }
      lastInteraction
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

export const useGetOpportunitiesData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchOpportunitiesData = useCallback(async (variables: OpportunityQueryVariables = {}) => {
    const query = GET_OPPORTUNITIES_DATA;
    try {
      const result = await graphqlClient.request<GetOpportunitiesResponse>(query, variables);
      return result;
    } catch (error) {
      console.error('Error fetching opportunities data:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchOpportunitiesData };
}; 