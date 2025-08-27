import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useCallback } from "react";

export interface InvestmentOpportunityQueryVariables {
  opportunityId: string;
}

export interface InvestmentOpportunityQueryResult {
  id: string;
  version?: number;
  businessKey?: string;
  code?: string;

  // Investment-specific fields
  investmentName?: string;
  dealType?: string;

  // Pipeline Information
  opportunityPipelineRef?: string;
  opportunityPipelineStageRef?: string;

  // Notes
  notesSummary?: string;

  // Financial Information
  estimatedAmount?: number;
  forecastedProfitAmount?: number;
  initialInvestmentAmount?: number;
  currency?: {
    id: string;
    code: string;
    value: string;
    objectValue?: any;
  };
  currencyRef?: string;
  closeDate?: string;

  // Investment Classification
  investmentGroup?: {
    id: string;
    code: string;
    value: string;
    objectValue?: any;
  };
  investmentGroupRef?: string;
  investmentRole?: {
    id: string;
    code: string;
    value: string;
    objectValue?: any;
  };
  investmentRoleRef?: string;
  investmentStakeType?: {
    id: string;
    code: string;
    value: string;
    objectValue?: any;
  };
  investmentStakeTypeRef?: string;
  investmentType?: {
    id: string;
    code: string;
    value: string;
    objectValue?: any;
  };
  investmentTypeRef?: string;
  stakePercentage?: number;

  // Loan Information
  loanAmount?: number;
  loanInterestRate?: number;
  marketValue?: number;
  requiredCapitalAmount?: number;

  // Real Estate Specific
  annualNetColdRent?: number;

  // Relationships
  account?: {
    id: string;
    name: string;
  };
  accountId?: string;

  // Owner Information
  ownerEmployee?: {
    id: string;
    firstName: string;
    lastName: string;
    displayName?: string;
    pictureThumbnail?: string;
  };
  ownerOrganization?: {
    id: string;
    name: string;
  };
  ownerOrganizationId?: string;

  // Process and system fields
  processInstanceId?: string;
  recordState?: string;

  // Additional Properties
  additionalProperties?: Record<string, any>;

  // Audit information
  activeFrom?: string;
  activeTo?: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  synchronizedAt?: string;
}

export interface InvestmentOpportunityDataResponse {
  InvestmentOpportunity: InvestmentOpportunityQueryResult[];
}

export const GET_INVESTMENT_OPPORTUNITY_BY_ID = `
  query GetInvestmentOpportunityById($opportunityId: uuid!) {
    InvestmentOpportunity(where: { id: { _eq: $opportunityId }, isDeleted: { _eq: false } }) {
      id
      version
      businessKey
      code
      
      # Investment-specific fields
      investmentName
      dealType
      
      # Pipeline Information
      opportunityPipelineRef
      opportunityPipelineStageRef
      
      # Notes
      notesSummary
      
      # Financial Information
      estimatedAmount
      forecastedProfitAmount
      initialInvestmentAmount
      currency {
        id
        code
        value
        objectValue
      }
      currencyRef
      closeDate
      
      # Investment Classification
      investmentGroup {
        id
        code
        value
        objectValue
      }
      investmentGroupRef
      investmentRole {
        id
        code
        value
        objectValue
      }
      investmentRoleRef
      investmentStakeType {
        id
        code
        value
        objectValue
      }
      investmentStakeTypeRef
      investmentType {
        id
        code
        value
        objectValue
      }
      investmentTypeRef
      stakePercentage
      
      # Loan Information
      loanAmount
      loanInterestRate
      marketValue
      requiredCapitalAmount
      
      # Real Estate Specific
      annualNetColdRent
      
      # Relationships
      account {
        id
        name
      }
      accountId
      
      # Owner Information
      ownerEmployee {
        id
        firstName
        lastName
        displayName
        pictureThumbnail
      }
      # ownerOrganization {
      #   id
      #   name
      # }
      # ownerOrganizationId
      
      # Process and system fields
      processInstanceId
      recordState
      
      # Additional Properties
      additionalProperties
      
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

export const useGetInvestmentOpportunityData = (
  context: BusinessAppContextProps
) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchInvestmentOpportunityData = async (
    variables: InvestmentOpportunityQueryVariables
  ) => {
    const query = GET_INVESTMENT_OPPORTUNITY_BY_ID;
    try {
      const result =
        await graphqlClient.request<InvestmentOpportunityDataResponse>(
          query,
          variables
        );
      return result;
    } catch (error) {
      console.error("Error fetching investment opportunity data:", error);
      throw error;
    }
  };

  return { fetchInvestmentOpportunityData };
};

export const useGetInvestmentOpportunityById = (
  context: BusinessAppContextProps
) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchInvestmentOpportunityById = useCallback(
    async (
      opportunityId: string
    ): Promise<InvestmentOpportunityQueryResult | null> => {
      if (!opportunityId) return null;

      try {
        const result = await graphqlClient.request<{
          InvestmentOpportunity: InvestmentOpportunityQueryResult[];
        }>(GET_INVESTMENT_OPPORTUNITY_BY_ID, { opportunityId: opportunityId });
        return result.InvestmentOpportunity?.[0] || null;
      } catch (error) {
        console.error("Error fetching investment opportunity by ID:", error);
        throw error;
      }
    },
    [graphqlClient]
  );

  return { fetchInvestmentOpportunityById };
};
