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
      const investment = investmentReport.investment || equityReport.equityInvestment?.investment;
      
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

      // Use enhanced investment reports query
      const filterParams = {
        // Comment out date filters to enable auto-loading without filters on initial screen
        // reportDateFrom: filters.startDate,
        // reportDateTo: filters.endDate,
        investmentIds: filters.investmentType ? [] : undefined, // Can filter by specific investments later
        limit: pageSize,
        offset,
        orderBy: [{
          field: 'date', // Sort by report date instead of investment-specific fields
          direction: sortOrder
        }] as Array<{ field: string; direction: 'ASC' | 'DESC' }>
      };

      console.log('Equity Enhanced Query Parameters:', filterParams);

      const response = await fetchInvestmentReports(filterParams);
      console.log('Equity Enhanced Response:', response);

      // Enhanced query returns: { InvestmentReport: [...], InvestmentReportAggregate: {...} }
      const investmentReports = response.InvestmentReport || [];
      
      // Extract all equity reports from the investment reports relationships
      const allAnalyticsData: EquityAnalyticsRowData[] = [];
      investmentReports.forEach(investmentReport => {
        const equityData = transformEquityToAnalyticsRow(investmentReport, filters.currency || 'EUR');
        allAnalyticsData.push(...equityData);
      });
      
      // Filter by investment type if specified
      const filteredData = filters.investmentType && filters.investmentType !== 'all'
        ? allAnalyticsData.filter(item => {
            // Filter based on equity investment type or investment type
            return item.investmentName?.toLowerCase().includes(filters.investmentType!.toLowerCase()) ||
                   item.investmentCode?.toLowerCase().includes(filters.investmentType!.toLowerCase());
          })
        : allAnalyticsData;
      
      // Apply pagination to filtered results (since we're doing client-side filtering)
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedData = filteredData.slice(startIndex, endIndex);

      // Calculate totals
      const totals = calculateTotals(paginatedData);

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
      console.error('Error loading equity analytics data:', err);
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
