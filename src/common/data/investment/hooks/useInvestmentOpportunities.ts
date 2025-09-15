// Investment Opportunity hooks - CRM opportunity entity operations
import { useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import type { 
  BaseInvestmentOpportunity, 
  InvestmentOpportunity,
  BaseInvestmentTask,
  BaseInvestmentActivity,
  BaseInvestmentNote,
  BaseInvestmentDocument
} from '../types';

// Use the new query imports (import directly from the concrete file to avoid barrel re-exports and dynamic chunks)
import {
  GET_INVESTMENT_OPPORTUNITIES,
  GET_INVESTMENT_OPPORTUNITY_BY_ID,
  GET_INVESTMENT_TASKS_BY_OPPORTUNITY_ID,
  GET_INVESTMENT_ACTIVITIES_BY_OPPORTUNITY_ID,
  GET_INVESTMENT_NOTES_BY_OPPORTUNITY_ID,
  GET_INVESTMENT_DOCUMENTS_BY_OPPORTUNITY_ID,
  type InvestmentOpportunityQueryVariables
} from '../queries/investmentOpportunityQueries';

// Use the mapper function
import { 
  toInvestmentOpportunity,
  toInvestmentTask,
  toInvestmentActivity,
  toInvestmentNote,
  toInvestmentDocument
} from '../mappers';

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

// =====================================================
// INVESTMENT OPPORTUNITY RELATED ENTITIES HOOKS
// =====================================================

// Hook for getting investment tasks by opportunity ID
export const useGetInvestmentTasksByOpportunityId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchInvestmentTasksByOpportunityId = useCallback(async (opportunityId: string) => {
    const query = GET_INVESTMENT_TASKS_BY_OPPORTUNITY_ID(opportunityId);
    
    try {
      const result = await graphqlClient.request<{ InvestmentTask: BaseInvestmentTask[] }>(query);
      return result.InvestmentTask.map(toInvestmentTask);
    } catch (error) {
      console.error('Error fetching investment tasks by opportunity ID:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchInvestmentTasksByOpportunityId };
};

// Hook for getting investment activities by opportunity ID
export const useGetInvestmentActivitiesByOpportunityId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchInvestmentActivitiesByOpportunityId = useCallback(async (opportunityId: string) => {
    const query = GET_INVESTMENT_ACTIVITIES_BY_OPPORTUNITY_ID(opportunityId);
    
    try {
      const result = await graphqlClient.request<{ InvestmentActivity: BaseInvestmentActivity[] }>(query);
      return result.InvestmentActivity.map(toInvestmentActivity);
    } catch (error) {
      console.error('Error fetching investment activities by opportunity ID:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchInvestmentActivitiesByOpportunityId };
};

// Hook for getting investment notes by opportunity ID
export const useGetInvestmentNotesByOpportunityId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchInvestmentNotesByOpportunityId = useCallback(async (opportunityId: string) => {
    const query = GET_INVESTMENT_NOTES_BY_OPPORTUNITY_ID(opportunityId);
    
    try {
      const result = await graphqlClient.request<{ InvestmentNote: BaseInvestmentNote[] }>(query);
      return result.InvestmentNote.map(toInvestmentNote);
    } catch (error) {
      console.error('Error fetching investment notes by opportunity ID:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchInvestmentNotesByOpportunityId };
};

// Hook for getting investment documents by opportunity ID
export const useGetInvestmentDocumentsByOpportunityId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchInvestmentDocumentsByOpportunityId = useCallback(async (opportunityId: string) => {
    const query = GET_INVESTMENT_DOCUMENTS_BY_OPPORTUNITY_ID(opportunityId);
    
    try {
      const result = await graphqlClient.request<{ InvestmentDocument: BaseInvestmentDocument[] }>(query);
      return result.InvestmentDocument.map(toInvestmentDocument);
    } catch (error) {
      console.error('Error fetching investment documents by opportunity ID:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchInvestmentDocumentsByOpportunityId };
};
