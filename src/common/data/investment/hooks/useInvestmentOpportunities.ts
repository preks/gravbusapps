// Investment Opportunity hooks - CRM opportunity entity operations
import { useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import type { BaseInvestmentOpportunity, InvestmentOpportunity } from '../types';

// Use the new query imports
import {
  GET_INVESTMENT_OPPORTUNITIES,
  GET_INVESTMENT_OPPORTUNITY_BY_ID,
  type InvestmentOpportunityQueryVariables
} from '../queries';

// Use the mapper function
import { toInvestmentOpportunity } from '../mappers';

// Note: InvestmentOpportunityQueryVariables is imported from queries

// Response interfaces  
export interface InvestmentOpportunityQueryResponse {
  InvestmentOpportunity: BaseInvestmentOpportunity[];
  InvestmentOpportunityAggregate: {
    aggregate: {
      count: number;
    };
  };
}

export interface InvestmentOpportunityByIdData {
  opportunity?: InvestmentOpportunity;
}

// Hook for getting investment opportunities with full details
export const useGetInvestmentOpportunities = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchInvestmentOpportunities = useCallback(async (variables: InvestmentOpportunityQueryVariables = {}) => {
    const query = GET_INVESTMENT_OPPORTUNITIES(variables);
    
    try {
      const result = await graphqlClient.request<InvestmentOpportunityQueryResponse>(query);
      
      // Transform base types to enhanced types using mapper
      const enhancedOpportunities = result.InvestmentOpportunity.map(toInvestmentOpportunity);
      
      return {
        ...result,
        InvestmentOpportunity: enhancedOpportunities
      };
    } catch (error) {
      console.error('Error fetching investment opportunities:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchInvestmentOpportunities };
};

// Hook for getting investment opportunity by ID
export const useGetInvestmentOpportunityById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchInvestmentOpportunityById = useCallback(async (id: string) => {
    const query = GET_INVESTMENT_OPPORTUNITY_BY_ID(id);
    
    try {
      const result = await graphqlClient.request<{ InvestmentOpportunity: BaseInvestmentOpportunity[] }>(query);
      const baseOpportunity = result.InvestmentOpportunity[0];
      
      return {
        opportunity: baseOpportunity ? toInvestmentOpportunity(baseOpportunity) : undefined
      } as InvestmentOpportunityByIdData;
    } catch (error) {
      console.error('Error fetching investment opportunity by ID:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchInvestmentOpportunityById };
};

// Hook for searching investment opportunities
export const useSearchInvestmentOpportunities = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const searchInvestmentOpportunities = useCallback(async (searchTerm: string, variables: InvestmentOpportunityQueryVariables = {}) => {
    const searchVariables = { ...variables, search: searchTerm };
    const query = GET_INVESTMENT_OPPORTUNITIES(searchVariables);
    
    try {
      const result = await graphqlClient.request<InvestmentOpportunityQueryResponse>(query);
      
      // Transform base types to enhanced types using mapper
      const enhancedOpportunities = result.InvestmentOpportunity.map(toInvestmentOpportunity);
      
      return {
        ...result,
        InvestmentOpportunity: enhancedOpportunities
      };
    } catch (error) {
      console.error('Error searching investment opportunities:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { searchInvestmentOpportunities };
};
