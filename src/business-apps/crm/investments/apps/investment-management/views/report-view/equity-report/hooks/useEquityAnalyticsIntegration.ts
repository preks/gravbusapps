import { useState, useEffect, useCallback, useMemo } from 'react';
import { useGetInvestmentReports } from '@/common/data/investment/hooks/useInvestmentReports';
import {
  EquityAnalyticsRowData,
  EquityAnalyticsTotals,
  EquityAnalyticsFilters,
  EquityAnalyticsState
} from '../types/EquityTypes';

export interface UseEquityAnalyticsIntegrationProps {
  accessToken: string;
  userInfo: any;
  filters: EquityAnalyticsFilters;
  options?: {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  };
}

export const useEquityAnalyticsIntegration = ({
  accessToken,
  userInfo,
  filters,
  options = {}
}: UseEquityAnalyticsIntegrationProps) => {
  const {
    page = 1,
    pageSize = 50,
    sortBy = 'date',
    sortOrder = 'DESC'
  } = options;

  const { fetchInvestmentReports } = useGetInvestmentReports({
    accessToken,
    userInfo,
    additionalData: {}
  });

  const [state, setState] = useState<EquityAnalyticsState>({
    data: [],
    totals: {
      totalMarketValue: 0,
      totalEbitda: 0,
      totalForecastedProfit: 0,
      totalForecastedRevenue: 0,
      totalUnrealizedGain: 0,
      averageEbitdaMargin: 0
    },
    isLoading: true,
    error: null,
    totalCount: 0,
    currentFilters: filters
  });
  // Using central data source instead of direct GraphQL client

  // Transform InvestmentReport's equityInvestmentReport data to UI format
  const transformEquityToAnalyticsRow = useCallback((
    investmentReport: any,
    targetCurrency: string
  ): EquityAnalyticsRowData[] => {
    const equityReports = investmentReport.equityInvestmentReport || [];
    
    return equityReports.map((equityReport: any) => {
      // Try to get investment data from multiple sources
      const mainInvestment = investmentReport.investment;
      const equityInvestment = equityReport.equityInvestment?.investment;
      
      // Use whichever has investment type data, prioritizing equity investment
      const investment = equityInvestment?.investmentType ? equityInvestment : mainInvestment;
      

      
      // Extract currency from investment or use default
      const currency = targetCurrency || investmentReport.currency?.value || 'EUR';
      
      // Calculate unrealized gain (current market value - forecasted profit as initial investment proxy)
      const unrealizedGain = (equityReport.marketValue || 0) - (investment?.forecastedProfitAmount || 0);
      
      // Calculate EBITDA margin (EBITDA / Forecasted Revenue * 100)
      const ebitdaMargin = (investment?.forecastedRevenueAmount || 0) > 0 
        ? ((equityReport.ebitdaAmount || 0) / (investment?.forecastedRevenueAmount || 0)) * 100 
        : 0;

      return {
        id: equityReport.id,
        equityInvestmentId: equityReport.equityInvestmentId || equityReport.id,
        investmentId: investment?.id || investmentReport.investmentId || '',
        investmentCode: investment?.code || 'N/A',
        investmentName: investment?.name || 'N/A',
        fundManagerName: investmentReport.fundManagerName || investment?.fundManagerName || 'N/A',
        currency: currency,
        acquisitionDate: investment?.acquisitionDate || '',
        foundationDate: equityReport.equityInvestment?.foundationDate || '',
        // Investment type data for filtering (only from main investment data)
        investmentType: investment?.investmentType?.code,
        investmentTypeValue: investment?.investmentType?.value,
        investmentGroupCode: investment?.investmentGroup?.code,
        // Financial metrics
        currentMarketValue: equityReport.marketValue || 0,
        currentEbitda: equityReport.ebitdaAmount || 0,
        forecastedProfit: investment?.forecastedProfitAmount || investmentReport.forecastedProfitAmount || 0,
        forecastedRevenue: investment?.forecastedRevenueAmount || investmentReport.forecastedRevenueAmount || 0,
        // Performance calculations
        unrealizedGain,
        ebitdaMargin,
        // Metadata
        reportCount: 1 // Each equity report represents one data point
      };
    });
  }, []);

  // Calculate totals from analytics data
  const calculateTotals = useCallback((data: EquityAnalyticsRowData[]): EquityAnalyticsTotals => {
    const totals = data.reduce(
      (acc, row) => ({
        totalMarketValue: acc.totalMarketValue + row.currentMarketValue,
        totalEbitda: acc.totalEbitda + row.currentEbitda,
        totalForecastedProfit: acc.totalForecastedProfit + row.forecastedProfit,
        totalForecastedRevenue: acc.totalForecastedRevenue + row.forecastedRevenue,
        totalUnrealizedGain: acc.totalUnrealizedGain + row.unrealizedGain,
        averageEbitdaMargin: acc.averageEbitdaMargin + row.ebitdaMargin
      }),
      {
        totalMarketValue: 0,
        totalEbitda: 0,
        totalForecastedProfit: 0,
        totalForecastedRevenue: 0,
        totalUnrealizedGain: 0,
        averageEbitdaMargin: 0
      }
    );

    // Calculate average EBITDA margin
    if (data.length > 0) {
      totals.averageEbitdaMargin = totals.averageEbitdaMargin / data.length;
    }

    return totals;
  }, []);

  // Using enhanced investment reports query with relationships

  // Load equity analytics data from actual equity investments
  const loadEquityAnalyticsData = useCallback(async () => {
    if (!accessToken) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Calculate pagination
      const offset = (page - 1) * pageSize;

      // FIXED: Use date filters to get reports within selected date range
      const filterParams = {
        reportDateFrom: filters.startDate,
        reportDateTo: filters.endDate,
        // Get all equity investments
        equityInvestmentIds: [], // Empty array means get all equity investments
        limit: 1000, // Large limit to get all data for aggregation
        offset: 0,
        orderBy: [{
          field: 'date',
          direction: 'DESC' as const // Get latest reports first
        }]
      };

      const response = await fetchInvestmentReports(filterParams);

      const investmentReports = response.InvestmentReport || [];
      
      // FIXED: Group by investment ID and get the latest report for each investment
      const latestReportsByInvestment = new Map<string, any>();
      
      investmentReports.forEach(investmentReport => {
        const investmentId = investmentReport.investment?.id;
        if (investmentId && investmentReport.equityInvestmentReport?.length > 0) {
          // Only keep the latest report for each investment (since we sorted by date DESC)
          if (!latestReportsByInvestment.has(investmentId)) {
            latestReportsByInvestment.set(investmentId, investmentReport);
          }
        }
      });
      
      // Transform latest reports to analytics data
      const allAnalyticsData: EquityAnalyticsRowData[] = [];
      latestReportsByInvestment.forEach(investmentReport => {
        const equityData = transformEquityToAnalyticsRow(investmentReport, filters.currency || 'EUR');
        allAnalyticsData.push(...equityData);
      });
      


      // Filter by investment type if specified
      const filteredData = filters.investmentType && filters.investmentType !== 'all'
        ? allAnalyticsData.filter(item => {
            // Filter based on actual investment type code
            // Only include items that have the matching investment type AND belong to EQUITY group
            return item.investmentType === filters.investmentType && 
                   item.investmentGroupCode === 'EQUITY';
          })
        : allAnalyticsData; // For overview, show all equity reports (don't filter by group for now)
      

      
      // Apply pagination to filtered results (since we're doing client-side filtering)
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedData = filteredData.slice(startIndex, endIndex);

      // Calculate totals from all filtered data (not just paginated)
      const totals = calculateTotals(filteredData);

      setState(prev => ({
        ...prev,
        data: paginatedData,
        totals,
        totalCount: filteredData.length,
        currentFilters: filters,
        isLoading: false,
        error: null
      }));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load equity analytics data';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        data: [],
        totals: {
          totalMarketValue: 0,
          totalEbitda: 0,
          totalForecastedProfit: 0,
          totalForecastedRevenue: 0,
          totalUnrealizedGain: 0,
          averageEbitdaMargin: 0
        }
      }));

    }
  }, [
    fetchInvestmentReports,
    filters,
    page,
    pageSize,
    sortBy,
    sortOrder,
    transformEquityToAnalyticsRow,
    calculateTotals
  ]);

  // Load data when dependencies change
  useEffect(() => {
    if (accessToken && userInfo) {
      loadEquityAnalyticsData();
    }
  }, [accessToken, userInfo, loadEquityAnalyticsData]);

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
    refetch: loadEquityAnalyticsData,
    
    // Metadata
    currentFilters: state.currentFilters,
    hasData: state.data.length > 0
  }), [state, loadEquityAnalyticsData]);

  return returnValues;
};

export default useEquityAnalyticsIntegration;
