import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface GetOpportunityByIdResponse {
  Opportunity: OpportunityResponse[];
}

export interface OpportunityResponse {
  id: string;
  version: string;
  name: string;
  estimatedAmount?: number;
  salesPipelineRef?: string;
  salesPipelineStageRef?: string;
  salesPipelineStage?: {
    id: string;
    value: string;
    type: string;
    code: string;
  };
  opportunityStatus?: {
    id: string;
    value: string;
    type: string;
    code: string;
  };
  currency?: {
    id: string;
    value: string;
    type: string;
    code: string;
  };
  ownerEmployee?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  account?: {
    id: string;
    version: string;
    name: string;
    industryRef: string;
    industry: {
      id: string;
      value: string;
      type: string;
      code: string;
    };
    numberOfEmployees: {
      id: string;
      value: string;
      type: string;
      code: string;
    };
    addressLine: string;
    foundationDate: string;
    annualRevenue: {
      id: string;
      value: string;
      type: string;
      code: string;
    };
    website: string;
    ownerEmployee?: {
      firstName: string;
      lastName: string;
    };
  };
  lead?: {
    id: string;
    companyName: string;
    leadStatus: {
      id: string;
      value: string;
      type: string;
      code: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export const GET_OPPORTUNITY_BY_ID = `
  query GetOpportunityById($id: uuid!) {
    Opportunity(where: { id: {_eq: $id}, isDeleted: {_eq: false} }) {
      id
      version
      name
      estimatedAmount
      salesPipelineRef
      salesPipelineStageRef
      salesPipelineStage {
        id
        value
        type
        code
      }
      opportunityStatus {
        id
        value
        type
        code
      }
      currency {
        id
        value
        type
        code
      }
      ownerEmployee {
        id
        firstName
        lastName
      }
      account {
        id
        version
        name
        industryRef
        industry {
          id
          value
          type
          code
        }
        numberOfEmployees {
          id
          value
          type
          code
        }
        addressLine
        foundationDate
        annualRevenue {
          id
          value
          type
          code
        }
        website
        ownerEmployee {
          firstName
          lastName
        }
      }
      lead {
        id
        companyName
        leadStatus {
          id
          value
          type
          code
        }
      }
      createdAt
      updatedAt
    }
  }
`;

export const useGetOpportunityById = (context: BusinessAppContextProps) => {
  const graphQLClient = useGraphQLClient(context.accessToken);

  const fetchOpportunityById = async (id: string) => {
    try {
      const result = await graphQLClient.request<GetOpportunityByIdResponse>(
        GET_OPPORTUNITY_BY_ID,
        { id }
      );
      return result;
    } catch (error) {
      console.error('Error fetching opportunity by ID:', error);
      throw error;
    }
  };

  return { fetchOpportunityById };
}; 