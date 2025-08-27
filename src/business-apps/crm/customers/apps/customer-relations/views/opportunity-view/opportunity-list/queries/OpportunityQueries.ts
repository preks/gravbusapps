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
  closeDate: string;
  accountId: string;
  salesPipeline: {
    id: string;
    value: string;
    code: string;
    objectValue?: any;
  } | null;
  salesPipelineStage: {
    id: string;
    value: string;
    code: string;
    objectValue?: any;
  } | null;
  account: {
    id: string;
    name: string;
  } | null;
  ownerEmployee: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string;
    pictureThumbnail: string;
  } | null;
  currency: {
    id: string;
    value: string;
    code: string;
    objectValue?: any;
  } | null;
  opportunityStatus: {
    id: string;
    value: string;
    code: string;
    objectValue?: any;
  } | null;
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
      opportunityStatus {
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