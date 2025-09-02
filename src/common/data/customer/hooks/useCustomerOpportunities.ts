// Customer Opportunity hooks - list and by-id operations for opportunities
import { useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

// Types
import type { BaseCustomerOpportunity, CustomerOpportunity } from '../types';

// Queries
import { 
  GET_CUSTOMER_OPPORTUNITIES, 
  GET_CUSTOMER_OPPORTUNITY_BY_ID,
  SEARCH_CUSTOMER_OPPORTUNITIES,
  type CustomerOpportunityQueryVariables 
} from '../queries/customerOpportunityQueries';

// Mapper
import { toCustomerOpportunity } from '../mappers/customerOpportunityMappers';

export interface CustomerOpportunityListQueryResponse {
  CustomerOpportunity: BaseCustomerOpportunity[];
  CustomerOpportunityAggregate: {
    aggregate: { count: number };
  };
}

export interface CustomerOpportunityListData {
  opportunities: CustomerOpportunity[];
  total: number;
}

export const useCustomerOpportunities = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchCustomerOpportunities = useCallback(async (variables: CustomerOpportunityQueryVariables = {}): Promise<CustomerOpportunityListData> => {
    const query = GET_CUSTOMER_OPPORTUNITIES(variables);
    const result = await graphqlClient.request<CustomerOpportunityListQueryResponse>(query);
    const opportunities = result.CustomerOpportunity.map(toCustomerOpportunity);
    const total = result.CustomerOpportunityAggregate?.aggregate?.count || 0;
    return { opportunities, total };
  }, [graphqlClient]);

  const fetchCustomerOpportunityById = useCallback(async (id: string): Promise<CustomerOpportunity | null> => {
    const query = GET_CUSTOMER_OPPORTUNITY_BY_ID(id);
    const result = await graphqlClient.request<{ CustomerOpportunity: BaseCustomerOpportunity[] }>(query);
    const base = result.CustomerOpportunity?.[0];
    return base ? toCustomerOpportunity(base) : null;
  }, [graphqlClient]);

  const searchCustomerOpportunities = useCallback(async (variables: CustomerOpportunityQueryVariables): Promise<CustomerOpportunity[]> => {
    const query = SEARCH_CUSTOMER_OPPORTUNITIES(variables);
    const result = await graphqlClient.request<{ CustomerOpportunity: BaseCustomerOpportunity[] }>(query);
    return result.CustomerOpportunity.map(toCustomerOpportunity);
  }, [graphqlClient]);

  return { fetchCustomerOpportunities, fetchCustomerOpportunityById, searchCustomerOpportunities };
};

