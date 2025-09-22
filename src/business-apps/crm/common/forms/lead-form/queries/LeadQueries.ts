import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useCallback } from "react";

export interface LeadQueryVariables {
  id: string;
}

export interface LeadQueryResult {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyWebsite?: string;
  createdAt?: string;
  leadSource?: {
    id: string;
    code: string;
    value: string;
  };
  leadSourceRef?: string;
  leadStatus?: {
    id: string;
    code: string;
    value: string;
  };
  leadStatusRef?: string;
  leadRating?: {
    id: string;
    code: string;
    value: string;
  };
  leadRatingRef?: string;
  ownerEmployeeId?: string;
  ownerEmployee?: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string;
  };
  account?: {
    id: string;
    name: string;
  };
  addresses?: Array<{
    addressLine?: any;
    city?: string;
    country?: {
      id: string;
      value: string;
      code: string;
    };
    region?: {
      id: string;
      value: string;
      code: string;
    };
    postalCode?: string;
  }>;
  position?: string;
  industryRef?: string;
  industry?: {
    id: string;
    code: string;
    value: string;
  };
  legalFormRef?: string;
  legalForm?: {
    id: string;
    code: string;
    value: string;
  };
  annualRevenueRef?: string;
  numberOfEmployeesRef?: string;
  salesCampaign?: {
    id: string;
    name: string;
  };
  salesCampaignId?: string;
  version?: number;
  sensitive?: boolean;
}

export const GET_LEAD_BY_ID = `
  query GetLeadById($leadId: uuid!) {
    Lead(where: {id: {_eq: $leadId}}) {
      id
      name
      firstName
      lastName
      email
      phoneNumber
      companyName
      companyEmail
      companyPhone
      companyWebsite
      createdAt
      leadSource {
        id
        code
        value
      }
      leadSourceRef
      leadStatus {
        id
        code
        value
      }
      leadStatusRef
      leadRating {
        id
        code
        value
      }
      leadRatingRef
      ownerEmployeeId
      ownerEmployee {
        id
        firstName
        lastName
        displayName
      }
      account {
        id
        name
      }
      addresses {
        addressLine
        city
        country {
          value
        }
        postalCode
        region {
          id
          value
        }
      }
      position
      industryRef
      industry {
        id
        code
        value
      }
      legalFormRef
      legalForm {
        id
        code
        value
      }
      annualRevenueRef
      numberOfEmployeesRef
      salesCampaign {
        id
        name
      }
      salesCampaignId
      version
      sensitive
    }
  }
`;

export const useGetLeadById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchLeadById = useCallback(
    async (leadId: string): Promise<LeadQueryResult | null> => {
      if (!leadId) return null;

      try {
        const result = await graphqlClient.request<{ Lead: LeadQueryResult[] }>(
          GET_LEAD_BY_ID,
          { leadId: leadId }
        );
        return result.Lead?.[0] || null;
      } catch (error) {
        console.error("Error fetching lead by ID:", error);
        throw error;
      }
    },
    [graphqlClient]
  );

  return { fetchLeadById };
};
