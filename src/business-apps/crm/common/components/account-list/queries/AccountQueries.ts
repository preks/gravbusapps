import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCallback } from 'react';
import { AccountQueryVariables, AccountListResponse } from '../types';

export const GET_ACCOUNTS_QUERY = `
  query GetAccounts($offset: Int, $limit: Int, $orderBy: [AccountOrderBy!], $where: AccountBoolExp) {
    Account(offset: $offset, limit: $limit, orderBy: $orderBy, where: $where) {
      id
      name
      email
      phone
      website
      createdAt
      updatedAt
      version
      foundationDate
      liquidationDate
      mission
      specialty
      geographicPresence
      notesSummary
      pictureUrl
      sourceApp
      industry {
        id
        code
        value
      }
      legalForm {
        id
        code
        value
      }
      numberOfEmployees {
        id
        code
        value
      }
      annualRevenue {
        id
        code
        value
      }
      timeZone {
        id
        code
        value
      }
      ownerEmployee {
        id
        firstName
        lastName
        displayName
        picture
        pictureThumbnail
      }
      addresses {
        id
        city
        addressLine
        postalCode
        country {
          id
          code
          value
        }
        region {
          id
          code
          value
        }
      }
      contact {
        id
        firstName
        lastName
        email
        phone
      }
    }
    AccountAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

export const useGetAccountsData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchAccountsData = useCallback(async (variables: AccountQueryVariables = {}): Promise<AccountListResponse> => {
    const defaultVariables = {
      offset: 0,
      limit: 20,
      orderBy: [{ createdAt: "DESC" }],
      where: { isDeleted: { _eq: false } },
      ...variables
    };
    
    try {
      const result = await graphqlClient.request<AccountListResponse>(GET_ACCOUNTS_QUERY, defaultVariables);
      return result;
    } catch (error) {
      console.error('Error fetching accounts data:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchAccountsData };
}; 