// Investment Contact hooks - CRM contact entity operations
import { useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import type { BaseInvestmentContact, InvestmentContact } from '../types';

// Use the new query imports
import {
  GET_INVESTMENT_CONTACTS,
  GET_INVESTMENT_CONTACT_BY_ID,
  type InvestmentContactQueryVariables
} from '../queries';

// Use the mapper function
import { toInvestmentContact } from '../mappers';

// Note: InvestmentContactQueryVariables is imported from queries

// Response interfaces  
export interface InvestmentContactQueryResponse {
  InvestmentContact: BaseInvestmentContact[];
  InvestmentContactAggregate: {
    aggregate: {
      count: number;
    };
  };
}

export interface InvestmentContactByIdData {
  contact?: InvestmentContact;
}

// Hook for getting investment contacts with full details
export const useGetInvestmentContacts = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchInvestmentContacts = useCallback(async (variables: InvestmentContactQueryVariables = {}) => {
    const query = GET_INVESTMENT_CONTACTS(variables);
    
    try {
      const result = await graphqlClient.request<InvestmentContactQueryResponse>(query);
      
      // Transform base types to enhanced types using mapper
      const enhancedContacts = result.InvestmentContact.map(toInvestmentContact);
      
      return {
        ...result,
        InvestmentContact: enhancedContacts
      };
    } catch (error) {
      console.error('Error fetching investment contacts:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchInvestmentContacts };
};

// Hook for getting investment contact by ID
export const useGetInvestmentContactById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchInvestmentContactById = useCallback(async (id: string) => {
    const query = GET_INVESTMENT_CONTACT_BY_ID(id);
    
    try {
      const result = await graphqlClient.request<{ InvestmentContact: BaseInvestmentContact[] }>(query);
      const baseContact = result.InvestmentContact[0];
      
      return {
        contact: baseContact ? toInvestmentContact(baseContact) : undefined
      } as InvestmentContactByIdData;
    } catch (error) {
      console.error('Error fetching investment contact by ID:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchInvestmentContactById };
};

// Hook for searching investment contacts
export const useSearchInvestmentContacts = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const searchInvestmentContacts = useCallback(async (searchTerm: string, variables: InvestmentContactQueryVariables = {}) => {
    const searchVariables = { ...variables, search: searchTerm };
    const query = GET_INVESTMENT_CONTACTS(searchVariables);
    
    try {
      const result = await graphqlClient.request<InvestmentContactQueryResponse>(query);
      
      // Transform base types to enhanced types using mapper
      const enhancedContacts = result.InvestmentContact.map(toInvestmentContact);
      
      return {
        ...result,
        InvestmentContact: enhancedContacts
      };
    } catch (error) {
      console.error('Error searching investment contacts:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { searchInvestmentContacts };
};
