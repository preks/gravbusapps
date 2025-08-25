import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { enforceQueryLimit } from '@/business-apps/crm/common/utils/queryLimits';
import {
  LiquidFundPortfolioResponse,
  LiquidFundPortfolioReportResponse,
  LiquidPortfolioQueryVariables,
  LiquidPortfolioReportQueryVariables
} from '../types/LiquidPortfolioTypes';

const GET_LIQUID_FUND_PORTFOLIOS_QUERY = `
  query GetLiquidFundPortfolios($limit: Int, $offset: Int, $where: LiquidFundPortfolioBoolExp, $orderBy: [LiquidFundPortfolioOrderBy!]) {
    LiquidFundPortfolio(
      limit: $limit
      offset: $offset
      where: $where
      orderBy: $orderBy
    ) {
      id
      proprietorName
      depositName
      isin
      investmentGroupRef
      investmentTypeRef
      portfolioNumber
      portfolioCode
      uniquePortfolioCode
      positionCode
      positionDescription
      compositePositionDescription
      currencyRef
      portfolioStartDate
      portfolioStartDate2
      portfolioEndDate
      investmentGroup {
        id
        code
        value
      }
      investmentType {
        id
        code
        value
      }
    }
  }
`;

const GET_LIQUID_FUND_PORTFOLIO_BY_ID_QUERY = `
  query GetLiquidFundPortfolioById($id: uuid!) {
    LiquidFundPortfolio(where: { id: { _eq: $id } }) {
      id
      proprietorName
      depositName
      isin
      investmentGroupRef
      investmentTypeRef
      portfolioNumber
      portfolioCode
      uniquePortfolioCode
      positionCode
      positionDescription
      compositePositionDescription
      currencyRef
      portfolioStartDate
      portfolioStartDate2
      portfolioEndDate
      investmentGroup {
        id
        code
        value
      }
      investmentType {
        id
        code
        value
      }
    }
  }
`;

const GET_LIQUID_FUND_PORTFOLIOS_AGGREGATE_QUERY = `
  query GetLiquidFundPortfoliosAggregate($where: LiquidFundPortfolioBoolExp) {
    LiquidFundPortfolioAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

const GET_LIQUID_FUND_PORTFOLIO_REPORTS_QUERY = `
  query GetLiquidFundPortfolioReports($limit: Int, $offset: Int, $where: LiquidFundPortfolioReportBoolExp, $orderBy: [LiquidFundPortfolioReportOrderBy!]) {
    LiquidFundPortfolioReport(
      limit: $limit
      offset: $offset
      where: $where
      orderBy: $orderBy
    ) {
      id
      liquidFundPortfolioId
      reportDate
      startDate
      endDate
      currencyRef
      cashFlowAmount
      positiveCashFlowAmount
      negativeCashFlowAmount
      netIncomeAmount
      incomeAmount
      expensesAmount
      accruedAmount
      accruedInterestRate
      realizedIncomeAmount
      realizedMarketIncomeAmount
      realizedCurrencyExchangeIncomeAmount
      unrealizedIncomeAmount
      unrealizedMarketIncomeAmount
      unrealizedCurrencyExchangeIncomeAmount
      realizedUnrealizedIncomeAmount
      realizedUnrealizedMarketIncomeAmount
      realizedUnrealizedCurrencyExchangeIncomeAmount
      openMarketValueAmount
      closeMarketValueAmount
      changeMarketValueAmount
      timeWeightCompoundYieldPercent
      timeWeightSectorYieldPercent
      benchmarkYieldPercent
      benchmarkNotes
      benchmarkDescription
      benchmarkFromDate
      benchmarkToDate
      depositDescription
      maturityDate
      interestRate
      stocksQuantity
    }
  }
`;

const GET_LIQUID_FUND_PORTFOLIO_REPORTS_AGGREGATE_QUERY = `
  query GetLiquidFundPortfolioReportsAggregate($where: LiquidFundPortfolioReportBoolExp) {
    LiquidFundPortfolioReportAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

// Hook for fetching liquid fund portfolios
export const useGetLiquidFundPortfolios = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchLiquidFundPortfolios = async (variables: LiquidPortfolioQueryVariables = {}) => {
    const processedVariables = {
      ...variables,
      limit: enforceQueryLimit(variables.limit || 50),
      orderBy: variables.orderBy || [{ portfolioStartDate: 'DESC' }]
    };

    try {
      const result = await graphqlClient.request<{ LiquidFundPortfolio: LiquidFundPortfolioResponse[] }>(
        GET_LIQUID_FUND_PORTFOLIOS_QUERY,
        processedVariables
      );
      return result.LiquidFundPortfolio || [];
    } catch (error) {
      console.error('Error fetching liquid fund portfolios:', error);
      throw error;
    }
  };

  const fetchLiquidFundPortfolioById = async (id: string) => {
    try {
      const result = await graphqlClient.request<{ LiquidFundPortfolio: LiquidFundPortfolioResponse[] }>(
        GET_LIQUID_FUND_PORTFOLIO_BY_ID_QUERY,
        { id }
      );
      return result.LiquidFundPortfolio?.[0] || null;
    } catch (error) {
      console.error('Error fetching liquid fund portfolio by ID:', error);
      throw error;
    }
  };

  const fetchLiquidFundPortfoliosCount = async (variables: LiquidPortfolioQueryVariables = {}) => {
    const processedVariables = {
      where: variables.where
    };

    try {
      const result = await graphqlClient.request<{ LiquidFundPortfolioAggregate: { aggregate: { count: number } } }>(
        GET_LIQUID_FUND_PORTFOLIOS_AGGREGATE_QUERY,
        processedVariables
      );
      return result.LiquidFundPortfolioAggregate?.aggregate?.count || 0;
    } catch (error) {
      console.error('Error fetching liquid fund portfolios count:', error);
      throw error;
    }
  };

  return { 
    fetchLiquidFundPortfolios, 
    fetchLiquidFundPortfolioById, 
    fetchLiquidFundPortfoliosCount 
  };
};

// Hook for fetching liquid fund portfolio reports
export const useGetLiquidFundPortfolioReports = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchLiquidFundPortfolioReports = async (variables: LiquidPortfolioReportQueryVariables = {}) => {
    const processedVariables = {
      ...variables,
      limit: enforceQueryLimit(variables.limit || 100),
      orderBy: variables.orderBy || [{ reportDate: 'DESC' }]
    };

    try {
      const result = await graphqlClient.request<{ LiquidFundPortfolioReport: LiquidFundPortfolioReportResponse[] }>(
        GET_LIQUID_FUND_PORTFOLIO_REPORTS_QUERY,
        processedVariables
      );
      return result.LiquidFundPortfolioReport || [];
    } catch (error) {
      console.error('Error fetching liquid fund portfolio reports:', error);
      throw error;
    }
  };

  const fetchLiquidFundPortfolioReportsCount = async (variables: LiquidPortfolioReportQueryVariables = {}) => {
    const processedVariables = {
      where: variables.where
    };

    try {
      const result = await graphqlClient.request<{ LiquidFundPortfolioReportAggregate: { aggregate: { count: number } } }>(
        GET_LIQUID_FUND_PORTFOLIO_REPORTS_AGGREGATE_QUERY,
        processedVariables
      );
      return result.LiquidFundPortfolioReportAggregate?.aggregate?.count || 0;
    } catch (error) {
      console.error('Error fetching liquid fund portfolio reports count:', error);
      throw error;
    }
  };

  return { 
    fetchLiquidFundPortfolioReports, 
    fetchLiquidFundPortfolioReportsCount 
  };
};


