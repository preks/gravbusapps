// Customer Account hooks - list and by-id operations for customer accounts
import { useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

// Types
import type { BaseCustomerAccount, CustomerAccount } from '../types';

// Queries
import { 
  GET_CUSTOMER_ACCOUNTS, 
  GET_CUSTOMER_ACCOUNT_BY_ID,
  SEARCH_CUSTOMER_ACCOUNTS,
  type CustomerAccountQueryVariables 
} from '../queries/customerAccountQueries';

// Mapper
import { toCustomerAccount } from '../mappers/customerAccountMappers';

export interface CustomerAccountListQueryResponse {
  CustomerAccount: BaseCustomerAccount[];
  CustomerAccountAggregate: {
    aggregate: { count: number };
  };
}

export interface CustomerAccountListData {
  accounts: CustomerAccount[];
  total: number;
}

export const useCustomerAccounts = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchCustomerAccounts = useCallback(async (variables: CustomerAccountQueryVariables = {}): Promise<CustomerAccountListData> => {
    const query = GET_CUSTOMER_ACCOUNTS(variables);
    const result = await graphqlClient.request<CustomerAccountListQueryResponse>(query);
    const accounts = result.CustomerAccount.map(toCustomerAccount);
    const total = result.CustomerAccountAggregate?.aggregate?.count || 0;
    return { accounts, total };
  }, [graphqlClient]);

  const fetchCustomerAccountById = useCallback(async (id: string): Promise<CustomerAccount | null> => {
    const query = GET_CUSTOMER_ACCOUNT_BY_ID(id);
    const result = await graphqlClient.request<{ CustomerAccount: BaseCustomerAccount[] }>(query);
    const base = result.CustomerAccount?.[0];
    return base ? toCustomerAccount(base) : null;
  }, [graphqlClient]);

  const searchCustomerAccounts = useCallback(async (variables: CustomerAccountQueryVariables): Promise<CustomerAccount[]> => {
    const query = SEARCH_CUSTOMER_ACCOUNTS(variables);
    const result = await graphqlClient.request<{ CustomerAccount: BaseCustomerAccount[] }>(query);
    return result.CustomerAccount.map(toCustomerAccount);
  }, [graphqlClient]);

  return { fetchCustomerAccounts, fetchCustomerAccountById, searchCustomerAccounts };
};


