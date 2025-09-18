import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useCallback } from "react";

export interface OpportunityQueryVariables {
  opportunityId: string;
}

export interface OpportunityQueryResult {
  id: string;
  version?: number;
  name?: string;
  businessKey?: string;
  code?: string;
  sourceApp?: string;
  personal?: boolean;

  // Sales Information
  estimatedAmount?: number;
  currency?: {
    id: string;
    code: string;
    value: string;
    objectValue?: any;
  };
  currencyRef?: string;
  winningChance?: number;
  closeDate?: string;

  // Relationships
  account?: {
    id: string;
    name: string;
  };
  accountId?: string;
  lead?: {
    id: string;
    name: string;
    firstName?: string;
    lastName?: string;
  };
  leadId?: string;

  // Owner Information
  ownerEmployee?: {
    id: string;
    firstName: string;
    lastName: string;
    displayName?: string;
    pictureThumbnail?: string;
  };
  ownerEmployeeId?: string;
  ownerOrganization?: {
    id: string;
    name: string;
  };
  ownerOrganizationId?: string;

  // Status and Pipeline Information
  opportunityStatus?: {
    id: string;
    code: string;
    value: string;
    objectValue?: any;
  };
  opportunityStatusRef?: string;
  salesPipeline?: {
    id: string;
    code: string;
    value: string;
    objectValue?: any;
  };
  salesPipelineRef?: string;
  salesPipelineStage?: {
    id: string;
    code: string;
    value: string;
    objectValue?: any;
  };
  salesPipelineStageRef?: string;
  stage?: string;
  status?: string;

  // Campaign Information
  salesCampaign?: {
    id: string;
    name: string;
  };
  salesCampaignId?: string;

  // Additional Information
  notesSummary?: string;
  lastInteraction?: string;

  // Process and system fields
  processInstanceId?: string;
  recordState?: string;

  // Addresses (array relationship)
  addresses?: Array<{
    id?: string;
    addressType: string;
    addressLine: string;
    postalCode: string;
    city: string;
    region: {
      id: string;
      code: string;
      value: string;
    };
    country: {
      id: string;
      code: string;
      value: string;
    };
  }>;

  // Communication Channels (array relationship)
  communicationChannels?: Array<{
    id?: string;
    communicationChannelRef?: string;
    communicationChannel?: {
      id: string;
      value: string;
      code: string;
    };
    createdAt?: string;
  }>;

  // Tags (array relationship) - commented out - field may not exist in schema
  // tags?: Array<{
  //   id?: string;
  //   tagName: string;
  //   tagValue: string;
  // }>;

  // Additional Properties and Express fields
  additionalProperties?: Record<string, any>;
  express1?: Record<string, any>;
  express2?: Record<string, any>;

  // Audit information
  activeFrom?: string;
  activeTo?: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  synchronizedAt?: string;
}

export interface OpportunityDataResponse {
  Opportunity: OpportunityQueryResult[];
}

export const GET_OPPORTUNITY_BY_ID = `
  query GetOpportunityById($opportunityId: uuid!) {
    Opportunity(where: { id: { _eq: $opportunityId }, isDeleted: { _eq: false } }) {
      id
      version
      name
      businessKey
      code
      sourceApp
      personal
      
      # Sales Information
      estimatedAmount
      currency {
        id
        code
        value
        objectValue
      }
      currencyRef
      winningChance
      closeDate
      
      # Relationships
      account {
        id
        name
      }
      accountId
      lead {
        id
        name
        firstName
        lastName
      }
      leadId
      
      # Owner Information
      ownerEmployee {
        id
        firstName
        lastName
        displayName
        pictureThumbnail
      }
      ownerEmployeeId
      ownerOrganization {
        id
        name
      }
      ownerOrganizationId
      
      # Status and Pipeline Information
      opportunityStatus {
        id
        code
        value
        objectValue
      }
      opportunityStatusRef
      salesPipeline {
        id
        code
        value
        objectValue
      }
      salesPipelineRef
      salesPipelineStage {
        id
        code
        value
        objectValue
      }
      salesPipelineStageRef
      stage
      status
      
      # Campaign Information
      salesCampaign {
        id
        name
      }
      salesCampaignId
      
      # Additional Information
      notesSummary
      lastInteraction
      
      # Process and system fields
      processInstanceId
      recordState
      
      # Addresses
      addresses {
        id
        addressType
        addressLine
        postalCode
        city
        region {
          id
          code
          value
        }
        country {
          id
          code
          value
        }
      }
      
      # Communication Channels
      communicationChannels {
        id
        communicationChannelRef
        communicationChannel {
          id
          value
          code
        }
        createdAt
      }
      
      # Tags (commented out - field may not exist in schema)
      # tags {
      #   id
      #   tagName
      #   tagValue
      # }
      
      # Additional Properties and Express fields
      additionalProperties
      express1
      express2
      
      # Audit information
      activeFrom
      activeTo
      createdAt
      createdBy
      updatedAt
      updatedBy
      synchronizedAt
    }
  }
`;

export const useGetOpportunityData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchOpportunityData = async (variables: OpportunityQueryVariables) => {
    const query = GET_OPPORTUNITY_BY_ID;
    try {
      const result = await graphqlClient.request<OpportunityDataResponse>(
        query,
        variables
      );
      return result;
    } catch (error) {
      console.error("Error fetching opportunity data:", error);
      throw error;
    }
  };

  return { fetchOpportunityData };
};

export const useGetOpportunityById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchOpportunityById = useCallback(
    async (opportunityId: string): Promise<OpportunityQueryResult | null> => {
      if (!opportunityId) return null;

      try {
        const result = await graphqlClient.request<{
          Opportunity: OpportunityQueryResult[];
        }>(GET_OPPORTUNITY_BY_ID, { opportunityId: opportunityId });
        return result.Opportunity?.[0] || null;
      } catch (error) {
        console.error("Error fetching opportunity by ID:", error);
        throw error;
      }
    },
    [graphqlClient]
  );

  return { fetchOpportunityById };
};
