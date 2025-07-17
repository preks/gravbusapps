import { useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface AccountQueryVariables {
  offset?: number;
  limit?: number;
  where?: any;
  orderBy?: any;
}

export interface AccountData {
  id: string;
  name: string;
  version: number;
  website: string;
  legalForm: {
    value: string;
    code: string;
    id: string;
    objectValue?: any;
  };
  numberOfEmployees: {
    value: string;
  };
  contact: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  }[];
  addresses: {
    city: string;
    country: {
      id: string;
      value: string;
      code: string;
    };
    region: {
      id: string;
      value: string;
      code: string;
    };
  }[];
  foundationDate: string;
  industry: {
    id: string;
    code: string;
    value: string;
    objectValue?: any;
  };
  ownerEmployee: {
    id: string;
    lastName: string;
    firstName: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface GetAccountsResponse {
  Account: AccountData[];
  AccountAggregate: {
    aggregate: {
      count: number;
    };
  };
}

export const GET_ACCOUNTS_DATA = `
  query GetAccounts(
    $where: AccountBoolExp
    $limit: Int 
    $offset: Int
    $orderBy: [AccountOrderBy!]
  ) { 
    Account(
      where: $where 
      limit: $limit 
      offset: $offset
      orderBy: $orderBy
    ) {
      id
      version
      name
      website
      legalForm {
        value
        code
        id
        objectValue
      }
      numberOfEmployees {
        value
      }
      contact {
        firstName
        lastName
        email
        phone
      }
      addresses {
        city
        country {
          id
          value
          code
        }
        region {
          id
          value
          code
        }
      }
      foundationDate
      industry {
        id
        code
        value
        objectValue
      }
      ownerEmployee {
        id
        lastName
        firstName
        pictureThumbnail
      }
      createdAt
      updatedAt
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
  
  const fetchAccountsData = useCallback(async (variables: AccountQueryVariables = {}) => {
    const query = GET_ACCOUNTS_DATA;
    try {
      const result = await graphqlClient.request<GetAccountsResponse>(query, variables);
      return result;
    } catch (error) {
      console.error('Error fetching accounts data:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchAccountsData };
}; 