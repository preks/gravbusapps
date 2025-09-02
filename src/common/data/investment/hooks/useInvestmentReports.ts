// Investment Report hooks - Investment reporting entities operations
import { useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import type { 
  BaseInvestmentReport,
  BaseInvestmentTransaction,
  BaseEquityInvestmentReport,
  BaseEquityInvestmentRound,
  BaseRealEstateInvestmentReport,
  BaseRealEstateInvestmentRentalUnit,
  BaseLiquidFundInvestmentReport
} from '../types';

// Use the new query imports
import {
  GET_INVESTMENT_REPORTS,
  GET_INVESTMENT_REPORT_BY_ID,
  GET_INVESTMENT_TRANSACTIONS,
  GET_INVESTMENT_TRANSACTION_BY_ID,
  // NOTE: Specific report queries removed - all reports now use GET_INVESTMENT_REPORTS
  GET_EQUITY_INVESTMENT_ROUNDS,
  GET_REAL_ESTATE_INVESTMENT_RENTAL_UNITS,
  type InvestmentReportQueryVariables,
  type InvestmentTransactionQueryVariables,
  type EquityInvestmentRoundQueryVariables,
  type RealEstateInvestmentRentalUnitQueryVariables
} from '../queries';

// Use the mapper functions
import { 
  toInvestmentReport
} from '../mappers';

// Note: Query variables are now imported from queries module

// Response interfaces  
export interface InvestmentReportQueryResponse {
  InvestmentReport: BaseInvestmentReport[];
  InvestmentReportAggregate: {
    aggregate: {
      count: number;
    };
  };
}

export interface InvestmentTransactionQueryResponse {
  InvestmentTransaction: BaseInvestmentTransaction[];
  InvestmentTransactionAggregate: {
    aggregate: {
      count: number;
    };
  };
}

export interface EquityInvestmentRoundQueryResponse {
  EquityInvestmentRound: BaseEquityInvestmentRound[];
  EquityInvestmentRoundAggregate: {
    aggregate: {
      count: number;
    };
  };
}

export interface RealEstateInvestmentRentalUnitQueryResponse {
  RealEstateInvestmentRentalUnit: BaseRealEstateInvestmentRentalUnit[];
  RealEstateInvestmentRentalUnitAggregate: {
    aggregate: {
      count: number;
    };
  };
}

export interface EquityInvestmentReportQueryResponse {
  EquityInvestmentReport: BaseEquityInvestmentReport[];
  EquityInvestmentReportAggregate: {
    aggregate: {
      count: number;
    };
  };
}

export interface EquityInvestmentRoundQueryResponse {
  EquityInvestmentRound: BaseEquityInvestmentRound[];
  EquityInvestmentRoundAggregate: {
    aggregate: {
      count: number;
    };
  };
}

export interface RealEstateInvestmentReportQueryResponse {
  RealEstateInvestmentReport: BaseRealEstateInvestmentReport[];
  RealEstateInvestmentReportAggregate: {
    aggregate: {
      count: number;
    };
  };
}

export interface LiquidFundInvestmentReportQueryResponse {
  LiquidFundInvestmentReport: BaseLiquidFundInvestmentReport[];
  LiquidFundInvestmentReportAggregate: {
    aggregate: {
      count: number;
    };
  };
}

// =============================================================================
// INVESTMENT REPORT HOOKS
// =============================================================================

// Hook for getting investment reports
export const useGetInvestmentReports = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchInvestmentReports = useCallback(async (variables: InvestmentReportQueryVariables = {}) => {
    const query = GET_INVESTMENT_REPORTS(variables);
    
    try {
      const result = await graphqlClient.request<InvestmentReportQueryResponse>(query);
      
      // Transform base types to enhanced types using mapper
      const enhancedReports = result.InvestmentReport.map(toInvestmentReport);
      
      return {
        ...result,
        InvestmentReport: enhancedReports
      };
    } catch (error) {
      console.error('Error fetching investment reports:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchInvestmentReports };
};

// Hook for getting investment report by ID
export const useGetInvestmentReportById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchInvestmentReportById = useCallback(async (id: string) => {
    const query = GET_INVESTMENT_REPORT_BY_ID(id);
    
    try {
      const result = await graphqlClient.request<{ InvestmentReport: BaseInvestmentReport[] }>(query);
      const baseReport = result.InvestmentReport[0];
      
      return {
        report: baseReport ? toInvestmentReport(baseReport) : undefined
      };
    } catch (error) {
      console.error('Error fetching investment report by ID:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchInvestmentReportById };
};

// =============================================================================
// INVESTMENT TRANSACTION HOOKS
// =============================================================================

// Hook for getting investment transactions
export const useGetInvestmentTransactions = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchInvestmentTransactions = useCallback(async (variables: InvestmentTransactionQueryVariables = {}) => {
    const query = GET_INVESTMENT_TRANSACTIONS(variables);
    
    try {
      const result = await graphqlClient.request<InvestmentTransactionQueryResponse>(query);
      return result;
    } catch (error) {
      console.error('Error fetching investment transactions:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchInvestmentTransactions };
};

// Hook for getting investment transaction by ID
export const useGetInvestmentTransactionById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchInvestmentTransactionById = useCallback(async (id: string) => {
    const query = GET_INVESTMENT_TRANSACTION_BY_ID(id);
    
    try {
      const result = await graphqlClient.request<{ InvestmentTransaction: import('../types').BaseInvestmentTransaction[] }>(query);
      return {
        transaction: result.InvestmentTransaction[0]
      };
    } catch (error) {
      console.error('Error fetching investment transaction by ID:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchInvestmentTransactionById };
};

// =============================================================================
// SPECIALIZED REPORT HOOKS
// =============================================================================

// NOTE: useGetEquityInvestmentReports removed - use useGetInvestmentReports instead

// Hook for getting equity investment rounds
export const useGetEquityInvestmentRounds = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchEquityInvestmentRounds = useCallback(async (variables: EquityInvestmentRoundQueryVariables = {}) => {
    const query = GET_EQUITY_INVESTMENT_ROUNDS(variables);
    
    try {
      const result = await graphqlClient.request<EquityInvestmentRoundQueryResponse>(query);
      return result;
    } catch (error) {
      console.error('Error fetching equity investment rounds:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchEquityInvestmentRounds };
};

// NOTE: useGetRealEstateInvestmentReports removed - use useGetInvestmentReports instead

// Hook for getting real estate investment rental units
export const useGetRealEstateInvestmentRentalUnits = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchRealEstateInvestmentRentalUnits = useCallback(async (variables: RealEstateInvestmentRentalUnitQueryVariables = {}) => {
    const query = GET_REAL_ESTATE_INVESTMENT_RENTAL_UNITS(variables);
    
    try {
      const result = await graphqlClient.request<RealEstateInvestmentRentalUnitQueryResponse>(query);
      return result;
    } catch (error) {
      console.error('Error fetching real estate investment rental units:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchRealEstateInvestmentRentalUnits };
};

// NOTE: useGetLiquidFundInvestmentReports removed - use useGetInvestmentReports instead
