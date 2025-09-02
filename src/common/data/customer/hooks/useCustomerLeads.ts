// Customer Lead hooks - list and by-id operations for leads
import { useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

// Types
import type { BaseCustomerLead, CustomerLead } from '../types';

// Queries
import { 
  GET_CUSTOMER_LEADS, 
  GET_CUSTOMER_LEAD_BY_ID,
  SEARCH_CUSTOMER_LEADS,
  type CustomerLeadQueryVariables 
} from '../queries/customerLeadQueries';

// Mapper
import { toCustomerLead } from '../mappers/customerLeadMappers';

export interface CustomerLeadListQueryResponse {
  CustomerLead: BaseCustomerLead[];
  CustomerLeadAggregate: {
    aggregate: { count: number };
  };
}

export interface CustomerLeadListData {
  leads: CustomerLead[];
  total: number;
}

export const useCustomerLeads = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchCustomerLeads = useCallback(async (variables: CustomerLeadQueryVariables = {}): Promise<CustomerLeadListData> => {
    const query = GET_CUSTOMER_LEADS(variables);
    const result = await graphqlClient.request<CustomerLeadListQueryResponse>(query);
    const leads = result.CustomerLead.map(toCustomerLead);
    const total = result.CustomerLeadAggregate?.aggregate?.count || 0;
    return { leads, total };
  }, [graphqlClient]);

  const fetchCustomerLeadById = useCallback(async (id: string): Promise<CustomerLead | null> => {
    const query = GET_CUSTOMER_LEAD_BY_ID(id);
    const result = await graphqlClient.request<{ CustomerLead: BaseCustomerLead[] }>(query);
    const base = result.CustomerLead?.[0];
    return base ? toCustomerLead(base) : null;
  }, [graphqlClient]);

  const searchCustomerLeads = useCallback(async (variables: CustomerLeadQueryVariables): Promise<CustomerLead[]> => {
    const query = SEARCH_CUSTOMER_LEADS(variables);
    const result = await graphqlClient.request<{ CustomerLead: BaseCustomerLead[] }>(query);
    return result.CustomerLead.map(toCustomerLead);
  }, [graphqlClient]);

  return { fetchCustomerLeads, fetchCustomerLeadById, searchCustomerLeads };
};


