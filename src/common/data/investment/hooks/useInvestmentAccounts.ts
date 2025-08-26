// Investment Account hooks - CRM account entity operations
import { useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import type { 
  BaseInvestmentAccount, 
  InvestmentAccount,
  BaseInvestmentTask, 
  BaseInvestmentActivity, 
  BaseInvestmentNote, 
  BaseInvestmentDocument,
} from '../types';

// Use the new query imports
import {
  GET_INVESTMENT_ACCOUNTS,
  GET_INVESTMENT_ACCOUNT_BY_ID,
  GET_INVESTMENT_TASKS_BY_ACCOUNT_ID,
  GET_INVESTMENT_ACTIVITIES_BY_ACCOUNT_ID,
  GET_INVESTMENT_NOTES_BY_ACCOUNT_ID,
  GET_INVESTMENT_DOCUMENTS_BY_ACCOUNT_ID,
  type InvestmentAccountQueryVariables
} from '../queries';

// Use the mapper functions
import { 
  toInvestmentAccount,
  toInvestmentTask,
  toInvestmentActivity,
  toInvestmentNote,
  toInvestmentDocument
} from '../mappers';

// Note: InvestmentAccountQueryVariables is imported from queries

// Response interfaces  
export interface InvestmentAccountQueryResponse {
  InvestmentAccount: BaseInvestmentAccount[];
  InvestmentAccountAggregate: {
    aggregate: {
      count: number;
    };
  };
}

export interface InvestmentAccountByIdData {
  account?: InvestmentAccount;
}

// Hook for getting investment accounts with full details
export const useGetInvestmentAccounts = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchInvestmentAccounts = useCallback(async (variables: InvestmentAccountQueryVariables = {}) => {
    const query = GET_INVESTMENT_ACCOUNTS(variables);
    
    try {
      const result = await graphqlClient.request<InvestmentAccountQueryResponse>(query);
      
      // Transform base types to enhanced types using mapper
      const enhancedAccounts = result.InvestmentAccount.map(toInvestmentAccount);
      
      return {
        ...result,
        InvestmentAccount: enhancedAccounts
      };
    } catch (error) {
      console.error('Error fetching investment accounts:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchInvestmentAccounts };
};

// Hook for getting investment account by ID
export const useGetInvestmentAccountById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchInvestmentAccountById = useCallback(async (id: string) => {
    const query = GET_INVESTMENT_ACCOUNT_BY_ID(id);
    
    try {
      const result = await graphqlClient.request<{ InvestmentAccount: BaseInvestmentAccount[] }>(query);
      const baseAccount = result.InvestmentAccount[0];
      
      return {
        account: baseAccount ? toInvestmentAccount(baseAccount) : undefined
      } as InvestmentAccountByIdData;
    } catch (error) {
      console.error('Error fetching investment account by ID:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchInvestmentAccountById };
};

// Hook for searching investment accounts
export const useSearchInvestmentAccounts = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const searchInvestmentAccounts = useCallback(async (searchTerm: string, variables: InvestmentAccountQueryVariables = {}) => {
    const searchVariables = { ...variables, search: searchTerm };
    const query = GET_INVESTMENT_ACCOUNTS(searchVariables);
    
    try {
      const result = await graphqlClient.request<InvestmentAccountQueryResponse>(query);
      
      // Transform base types to enhanced types using mapper
      const enhancedAccounts = result.InvestmentAccount.map(toInvestmentAccount);
      
      return {
        ...result,
        InvestmentAccount: enhancedAccounts
      };
    } catch (error) {
      console.error('Error searching investment accounts:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { searchInvestmentAccounts };
};

// =====================================================
// INVESTMENT ACCOUNT RELATED ENTITIES HOOKS
// =====================================================

// Hook for getting investment tasks by account ID
export const useGetInvestmentTasksByAccountId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchInvestmentTasksByAccountId = useCallback(async (accountId: string) => {
    const query = GET_INVESTMENT_TASKS_BY_ACCOUNT_ID(accountId);
    
    try {
      const result = await graphqlClient.request<{ InvestmentTask: BaseInvestmentTask[] }>(query);
      // Transform base types to enhanced types using mapper
      return result.InvestmentTask.map(toInvestmentTask);
    } catch (error) {
      console.error('Error fetching investment tasks by account ID:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchInvestmentTasksByAccountId };
};

// Hook for getting investment activities by account ID
export const useGetInvestmentActivitiesByAccountId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchInvestmentActivitiesByAccountId = useCallback(async (accountId: string) => {
    const query = GET_INVESTMENT_ACTIVITIES_BY_ACCOUNT_ID(accountId);
    
    try {
      const result = await graphqlClient.request<{ InvestmentActivity: BaseInvestmentActivity[] }>(query);
      // Transform base types to enhanced types using mapper
      return result.InvestmentActivity.map(toInvestmentActivity);
    } catch (error) {
      console.error('Error fetching investment activities by account ID:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchInvestmentActivitiesByAccountId };
};

// Hook for getting investment notes by account ID
export const useGetInvestmentNotesByAccountId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchInvestmentNotesByAccountId = useCallback(async (accountId: string) => {
    const query = GET_INVESTMENT_NOTES_BY_ACCOUNT_ID(accountId);
    
    try {
      const result = await graphqlClient.request<{ InvestmentNote: BaseInvestmentNote[] }>(query);
      // Transform base types to enhanced types using mapper
      return result.InvestmentNote.map(toInvestmentNote);
    } catch (error) {
      console.error('Error fetching investment notes by account ID:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchInvestmentNotesByAccountId };
};

// Hook for getting investment documents by account ID
export const useGetInvestmentDocumentsByAccountId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchInvestmentDocumentsByAccountId = useCallback(async (accountId: string) => {
    const query = GET_INVESTMENT_DOCUMENTS_BY_ACCOUNT_ID(accountId);
    
    try {
      const result = await graphqlClient.request<{ InvestmentDocument: BaseInvestmentDocument[] }>(query);
      // Transform base types to enhanced types using mapper
      return result.InvestmentDocument.map(toInvestmentDocument);
    } catch (error) {
      console.error('Error fetching investment documents by account ID:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchInvestmentDocumentsByAccountId };
};
