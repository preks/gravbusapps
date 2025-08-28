// Customer Contact hooks - list and by-id operations for contacts
import { useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

// Types
import type { BaseCustomerContact, CustomerContact } from '../types';

// Queries
import { 
  GET_CUSTOMER_CONTACTS, 
  GET_CUSTOMER_CONTACT_BY_ID,
  SEARCH_CUSTOMER_CONTACTS,
  type CustomerContactQueryVariables 
} from '../queries/customerContactQueries';

// Mapper
import { toCustomerContact } from '../mappers/customerContactMappers';

export interface CustomerContactListQueryResponse {
  CustomerContact: BaseCustomerContact[];
  CustomerContactAggregate: {
    aggregate: { count: number };
  };
}

export interface CustomerContactListData {
  contacts: CustomerContact[];
  total: number;
}

export const useCustomerContacts = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchCustomerContacts = useCallback(async (variables: CustomerContactQueryVariables = {}): Promise<CustomerContactListData> => {
    const query = GET_CUSTOMER_CONTACTS(variables);
    const result = await graphqlClient.request<CustomerContactListQueryResponse>(query);
    const contacts = result.CustomerContact.map(toCustomerContact);
    const total = result.CustomerContactAggregate?.aggregate?.count || 0;
    return { contacts, total };
  }, [graphqlClient]);

  const fetchCustomerContactById = useCallback(async (id: string): Promise<CustomerContact | null> => {
    const query = GET_CUSTOMER_CONTACT_BY_ID(id);
    const result = await graphqlClient.request<{ CustomerContact: BaseCustomerContact[] }>(query);
    const base = result.CustomerContact?.[0];
    return base ? toCustomerContact(base) : null;
  }, [graphqlClient]);

  const searchCustomerContacts = useCallback(async (variables: CustomerContactQueryVariables): Promise<CustomerContact[]> => {
    const query = SEARCH_CUSTOMER_CONTACTS(variables);
    const result = await graphqlClient.request<{ CustomerContact: BaseCustomerContact[] }>(query);
    return result.CustomerContact.map(toCustomerContact);
  }, [graphqlClient]);

  return { fetchCustomerContacts, fetchCustomerContactById, searchCustomerContacts };
};


