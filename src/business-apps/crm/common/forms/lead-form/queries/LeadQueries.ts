import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCallback } from 'react';

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
  countryRef?: string;
  country?: {
    id: string;
    code: string;
    value: string;
  };
  leadSource?: {
    id: string;
    code: string;
    value: string;
  };
  leadStatus?: {
    id: string;
    code: string;
    value: string;
  };
  leadRating?: {
    id: string;
    code: string;
    value: string;
  };
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
  version?: number;
}

export const GET_LEAD_BY_ID = `
  query GetLeadById($id: uuid!) {
    LeadByPk(id: $id) {
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
      countryRef
      country {
        id
        code
        value
      }
      leadSource {
        id
        code
        value
      }
      leadStatus {
        id
        code
        value
      }
      leadRating {
        id
        code
        value
      }
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
      version
    }
  }
`;

export const useGetLeadById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchLeadById = useCallback(async (leadId: string): Promise<LeadQueryResult | null> => {
    if (!leadId) return null;

    try {
      const result = await graphqlClient.request<{ LeadByPk: LeadQueryResult | null }>(
        GET_LEAD_BY_ID,
        { id: leadId }
      );
      return result.LeadByPk;
    } catch (error) {
      console.error('Error fetching lead by ID:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchLeadById };
}; 