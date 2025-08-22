import { useState, useEffect, useCallback, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetLiquidFundAnalyticsData } from '../queries/AnalyticsQueries';
import {
  AnalyticsRowData,
  AnalyticsTotals,
  AnalyticsFilters,
  AnalyticsState,
  LiquidFundPortfolioAnalyticsResponse,
  LiquidFundPortfolioReportAnalyticsResponse
} from '../types/AnalyticsTypes';

export interface UseLiquidFundAnalyticsIntegrationProps extends BusinessAppContextProps {
  filters: AnalyticsFilters;
  currentPage?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export const useLiquidFundAnalyticsIntegration = ({
  accessToken,
  userInfo,
  filters,
  currentPage = 1,
  pageSize = 50,
  sortBy = 'proprietorName',
  sortOrder = 'ASC'
}: UseLiquidFundAnalyticsIntegrationProps) => {
  const [state, setState] = useState<AnalyticsState>({
    data: [],
    totals: {
      openingBalance: 0,
      incoming: 0,
      outgoing: 0,
      realizedGainsLosses: 0,
      unrealizedGainsLosses: 0,
      closingBalance: 0
    },
    isLoading: true,
    error: null,
    totalCount: 0,
    currentFilters: filters
  });

  const { fetchLiquidFundAnalyticsData, fetchLiquidFundAnalyticsCount } = 
    useGetLiquidFundAnalyticsData({ accessToken, userInfo });

  // Transform raw portfolio data into analytics row format
  const transformPortfolioToAnalyticsRow = useCallback((
    portfolio: LiquidFundPortfolioAnalyticsResponse,
    targetCurrency: string
  ): AnalyticsRowData => {
    const reports = portfolio.portfolioReports || [];
    
    // Transform portfolio data into analytics row format
    
    // Sort reports by date to ensure proper ordering
    const sortedReports = [...reports].sort((a, b) => 
      new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime()
    );

    // Calculate analytics values from reports
    let openingBalance = 0;
    let closingBalance = 0;
    let incoming = 0;
    let outgoing = 0;
    let realizedGainsLosses = 0;
    let unrealizedGainsLosses = 0;
    let timeWeightedPerformance = 0;
    let maturityDate: string | undefined;
    let interestRate: number | undefined;

    if (sortedReports.length > 0) {
      const latestReport = sortedReports[sortedReports.length - 1];
      
      // Extract values from the latest report
      
      // Use latest report values as specified:
      // 1) Opening Balance - openMarketValueAmount
      openingBalance = latestReport.openMarketValueAmount || 0;
      
      // 2) Incoming - positiveCashFlowAmount
      incoming = latestReport.positiveCashFlowAmount || 0;
      
      // 3) Outgoing - negativeCashFlowAmount
      outgoing = latestReport.negativeCashFlowAmount || 0;
      
      // 4) Realized Gains/Losses - realizedIncomeAmount
      realizedGainsLosses = latestReport.realizedIncomeAmount || 0;
      
      // 5) Unrealized Gains/Losses - unrealizedIncomeAmount
      unrealizedGainsLosses = latestReport.unrealizedIncomeAmount || 0;
      
      // 6) Closing Balance - closeMarketValueAmount
      closingBalance = latestReport.closeMarketValueAmount || 0;
      
      // 7) Time-weighted Performance - timeWeightCompoundYieldPercent
      timeWeightedPerformance = latestReport.timeWeightCompoundYieldPercent || 0;
      
      // 8) Fixed-Term Deposit specific fields from latest report
      maturityDate = latestReport.maturityDate;
      interestRate = latestReport.interestRate;
    }

    // Extract Tab 3 specific fields from latest report (stocksQuantity)
    let stocksQuantity: number | undefined;
    if (sortedReports.length > 0) {
      const latestReport = sortedReports[sortedReports.length - 1];
      stocksQuantity = latestReport.stocksQuantity;
    }

    // Create cash bank identifier (use portfolio code, position code, or fallback)
    const cashBankIdentifier = portfolio.portfolioCode || 
      portfolio.uniquePortfolioCode ||
      portfolio.positionCode ||
      `${portfolio.proprietorName} - Portfolio` ||
      `Portfolio ${portfolio.id.substring(0, 8)}`;

    const finalResult = {
      id: portfolio.id,
      portfolioId: portfolio.id,
      cashBankIdentifier: cashBankIdentifier,
      proprietorName: portfolio.proprietorName || 'Unknown',
      originalCurrency: portfolio.currencyRef?.split(':').pop() || 'EUR',
      maturityDate,
      interestRate,
      // Tab 3 specific fields
      depositName: portfolio.depositName,
      isin: portfolio.isin,
      stocksQuantity,
      openingBalance,
      incoming,
      outgoing,
      realizedGainsLosses,
      unrealizedGainsLosses,
      closingBalance,
      timeWeightedPerformance,
      investmentType: portfolio.investmentType?.value || portfolio.investmentTypeRef || 'Bank Deposit',
      reportCount: reports.length
    };
    
    // Return the calculated analytics row data
    
    return finalResult;
  }, []);

  // Calculate totals from analytics data
  const calculateTotals = useCallback((data: AnalyticsRowData[]): AnalyticsTotals => {
    return data.reduce(
      (totals, row) => ({
        openingBalance: totals.openingBalance + row.openingBalance,
        incoming: totals.incoming + row.incoming,
        outgoing: totals.outgoing + row.outgoing,
        realizedGainsLosses: totals.realizedGainsLosses + row.realizedGainsLosses,
        unrealizedGainsLosses: totals.unrealizedGainsLosses + row.unrealizedGainsLosses,
        closingBalance: totals.closingBalance + row.closingBalance
      }),
      {
        openingBalance: 0,
        incoming: 0,
        outgoing: 0,
        realizedGainsLosses: 0,
        unrealizedGainsLosses: 0,
        closingBalance: 0
      }
    );
  }, []);

  // Load analytics data
  const loadAnalyticsData = useCallback(async () => {
    if (!accessToken) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Calculate pagination
      const offset = (currentPage - 1) * pageSize;
      
      // Build order by
      const orderBy = sortBy && sortOrder ? [{ [sortBy]: sortOrder }] : [{ proprietorName: 'ASC' }];

      // Fetch portfolios data first
      const portfoliosData = await fetchLiquidFundAnalyticsData({
        limit: pageSize,
        offset,
        orderBy,
        filters
      });

      // Use actual data length as total count since we filter out portfolios without reports
      const totalCount = portfoliosData.length;

      // Transform data
      const analyticsData = portfoliosData.map(portfolio => 
        transformPortfolioToAnalyticsRow(portfolio, filters.currency || 'EUR')
      );

      // Calculate totals
      const totals = calculateTotals(analyticsData);

      // Analytics data transformed and ready for display

      setState(prev => ({
        ...prev,
        data: analyticsData,
        totals,
        totalCount,
        currentFilters: filters,
        isLoading: false,
        error: null
      }));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics data';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        data: [],
        totals: {
          openingBalance: 0,
          incoming: 0,
          outgoing: 0,
          realizedGainsLosses: 0,
          unrealizedGainsLosses: 0,
          closingBalance: 0
        }
      }));
      console.error('Error loading analytics data:', err);
    }
  }, [
    accessToken,
    filters,
    currentPage,
    pageSize,
    sortBy,
    sortOrder
  ]);

  // Load data when dependencies change
  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  // Memoized return values for performance
  const returnValues = useMemo(() => ({
    // Data
    analyticsData: state.data,
    totals: state.totals,
    totalCount: state.totalCount,
    
    // State
    isLoading: state.isLoading,
    error: state.error,
    
    // Actions
    refetch: loadAnalyticsData,
    
    // Metadata
    currentFilters: state.currentFilters,
    hasData: state.data.length > 0
  }), [state, loadAnalyticsData]);

  return returnValues;
};

export default useLiquidFundAnalyticsIntegration;