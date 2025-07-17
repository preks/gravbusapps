import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface GetAccountByIdQueryVariables {
  id: string;
}

export interface GetAccountByIdResponse {
  Account: Array<{
    id: string;
    version: string;
    name: string;
    email: string;
    phoneNumber: string;
    website: string;
    accountType?: {
      value: string;
    };
    accountStatus?: {
      value: string;
    };
    ownerEmployee?: {
      firstName: string;
      lastName: string;
    };
    createdAt: string;
    contact?: Array<{
      firstName: string;
      lastName: string;
      phone: string;
      createdAt: string;
      jobTitle: string;
    }>;
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
    addressLine: string;
    numberOfEmployees?: {
      id: string;
      value: string;
    };
    annualRevenue?: {
      id: string;
      value: string;
    };
    description?: string;
  }>;
}

export const GET_ACCOUNT_BY_ID = `
  query GetAccountById($id: uuid!) {
    Account(where: { id: { _eq: $id }, isDeleted: { _eq: false } }) {
      #Core Account Data
      id
      version
      name
      email
      phoneNumber
      website
      accountType {
        value
      }
      accountStatus {
        value
      }
      ownerEmployee {
        firstName
        lastName
      }
      createdAt

      #Company Details
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
      addressLine
      numberOfEmployees {
        id
        value
      }
      annualRevenue {
        id
        value
      }
      description
    }
  }
`;

export const useGetAccountById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchAccountById = async (variables: GetAccountByIdQueryVariables) => {
    const query = GET_ACCOUNT_BY_ID;
    try {
      const result = await graphqlClient.request<GetAccountByIdResponse>(query, variables);
      return result;
    } catch (error) {
      console.error('Error fetching account by ID:', error);
      throw error;
    }
  };

  return { fetchAccountById };
}; 