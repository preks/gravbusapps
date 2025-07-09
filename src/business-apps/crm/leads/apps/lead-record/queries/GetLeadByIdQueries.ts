import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface GetLeadByIdQueryVariables {
  id: string;
}

export interface GetLeadByIdResponse {
  Lead: Array<{
    id: string;
    version: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    position: string;
    leadSource?: {
      value: string;
    };
    leadRating?: {
      value: string;
    };
    leadStatus?: {
      value: string;
    };
    ownerEmployee?: {
      firstName: string;
      lastName: string;
    };
    createdAt: string;
    companyName: string;
    legalForm?: {
      id: string;
      value: string;
    };
    country?: {
      id: string;
      value: string;
    };
    industry?: {
      id: string;
      value: string;
    };
    companyWebsite: string;
    companyEmail: string;
    companyPhone: string;
    addressLine: string;
    numberOfEmployees?: {
      id: string;
      value: string;
    };
    annualRevenue?: {
      id: string;
      value: string;
    };
  }>;
}

export const GET_LEAD_BY_ID = `
  query GetLeadById($id: uuid!) {
    Lead(where: { id: { _eq: $id }, isDeleted: { _eq: false } }) {
      #Core Lead Data
      id
      version
      name
      firstName
      lastName
      email
      phoneNumber
      position
      leadSource {
        value
      }
      leadRating {
        value
      }
      leadStatus { 
       value
      }
      ownerEmployee {
        firstName
        lastName
      }
      createdAt
      
      #COMPANY
      companyName
      legalForm {
        id
       value
      }
      country {
        id
       value
      }
      industry {
        id
       value
      }
      companyWebsite
      companyEmail
      companyPhone
      addressLine
      numberOfEmployees {
        id
        value
      }
      annualRevenue {
        id
        value
      }
    }
  }
`;

export const useGetLeadById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchLeadById = async (variables: GetLeadByIdQueryVariables) => {
    const query = GET_LEAD_BY_ID;
    try {
      const result = await graphqlClient.request<GetLeadByIdResponse>(query, variables);
      return result;
    } catch (error) {
      console.error('Error fetching lead by ID:', error);
      throw error;
    }
  };

  return { fetchLeadById };
}; 