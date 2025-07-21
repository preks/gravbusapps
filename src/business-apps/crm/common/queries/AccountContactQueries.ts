import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface AccountContactData {
  createdAt: string;
  contactType: string;
  contact: {
    firstName: string;
    lastName: string;
    jobTitle: string;
    email: string;
    phone: string;
  };
}

export interface GetAccountContactResponse {
  AccountContact: AccountContactData[];
}

export interface GetAccountContactQueryVariables {
  accountId: string;
  contactType?: string;
}

// Query to fetch AccountContact data with primary contact filter
export const GET_ACCOUNT_CONTACT = `
  query GetAccountContact($accountId: uuid!, $contactType: String = "PRIMARY_CONTACT") {
    AccountContact(where: { 
      accountId: { _eq: $accountId }, 
      contactType: { _eq: $contactType } 
    }) {
      createdAt
      contactType
      contact {
        firstName
        lastName
        jobTitle
        email
        phone
      }
    }
  }
`;

export const useGetAccountContact = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchAccountContact = async (variables: GetAccountContactQueryVariables) => {
    try {
      const result = await graphqlClient.request<GetAccountContactResponse>(
        GET_ACCOUNT_CONTACT,
        variables
      );
      return result;
    } catch (error) {
      console.error('Error fetching account contact:', error);
      throw error;
    }
  };

  return { fetchAccountContact };
}; 