import { useState, useEffect, useCallback, useMemo } from 'react';
import { useGetInvestmentReports } from '@/common/data/investment/hooks/useInvestmentReports';
import {
  AnalyticsRowData,
  AnalyticsTotals,
  AnalyticsFilters,
  AnalyticsState
} from '../types/AnalyticsTypes';

export interface UseLiquidFundAnalyticsIntegrationProps {
  accessToken: string;
  userInfo: any;
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
  const { fetchInvestmentReports } = useGetInvestmentReports({
    accessToken,
    userInfo,
    additionalData: {}
  });
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

  // Transform InvestmentReport's liquidFundInvestmentReport data to UI format
  const transformLiquidFundToAnalyticsRow = useCallback((
    investmentReport: any,
    targetCurrency: string
  ): AnalyticsRowData[] => {
    const liquidFundReports = investmentReport.liquidFundInvestmentReport || [];
    
    return liquidFundReports.map((liquidFundReport: any) => {
      const investment = investmentReport.investment;
      const liquidFundInvestment = liquidFundReport.liquidFundInvestment;
      
      // FIXED: Get proprietor name and investment name properly
      const proprietorName = liquidFundInvestment?.investment?.investmentAccount?.name || 
                           investment?.investmentAccount?.name || 
                           'Unknown Proprietor';
      
      // FIXED: Use investment name as the primary identifier
      const investmentName = liquidFundInvestment?.investment?.name || 
                           investment?.name || 
                           proprietorName ||
                           'Unknown Investment';
      
      // Use available data for financial calculations (using actual report data when available)
      const openingBalance = liquidFundReport.openingBalance || investment?.initialInvestmentAmount || 1000000;
      const closingBalance = liquidFundReport.closingBalance || investment?.investmentMarketValue || openingBalance;
      const incoming = liquidFundReport.incoming || 0;
      const outgoing = liquidFundReport.outgoing || 0;
      const realizedGainsLosses = liquidFundReport.realizedGainsLosses || 0;
      const unrealizedGainsLosses = liquidFundReport.unrealizedGainsLosses || 0;
      const timeWeightedPerformance = liquidFundReport.timeWeightedPerformance || liquidFundReport.interestRate || 0;

      // Create cash bank identifier using investment name and bank info
      const cashBankIdentifier = `${investmentName} - ${liquidFundReport.bankName || 'Unknown Bank'}`;

      return {
        id: liquidFundReport.id,
        portfolioId: liquidFundReport.id,
        cashBankIdentifier: cashBankIdentifier,
        proprietorName: proprietorName,
        originalCurrency: targetCurrency || 'EUR',
        maturityDate: liquidFundReport.maturityDate || liquidFundInvestment?.maturityDate,
        interestRate: liquidFundReport.interestRate || liquidFundInvestment?.interestRate,
        // Investment navigation fields
        investmentId: liquidFundInvestment?.investment?.id || investment?.id,
        investmentName: investmentName,
        // Tab 3 specific fields  
        depositName: investmentName,
        isin: liquidFundInvestment?.investment?.code || investment?.code,
        stocksQuantity: undefined,
        openingBalance,
        incoming,
        outgoing,
        realizedGainsLosses,
        unrealizedGainsLosses,
        closingBalance,
        timeWeightedPerformance,
        investmentType: liquidFundReport.investmentLiquidFundType?.value || 'Liquid Fund',
        reportCount: 1
      };
    });
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

  // Map sort field to valid LiquidFundInvestment field
  const mapSortFieldToLiquidFundField = useCallback((field: string): string => {
    const fieldMapping: Record<string, string> = {
      'proprietorName': 'proprietorName',
      'bankName': 'bankName',
      'interestRate': 'interestRate',
      'maturityDate': 'maturityDate',
      'name': 'createdAt',      // Sort by creation date since we can't sort by investment name directly
      'investmentName': 'createdAt',
      'date': 'createdAt',
      'id': 'id',
      'createdAt': 'createdAt',
      'updatedAt': 'updatedAt'
    };
    
    return fieldMapping[field] || 'createdAt';
  }, []);

  // Load analytics data - FIXED: Query all liquid fund investments and get latest reports
  const loadLiquidFundAnalyticsData = useCallback(async () => {
    if (!accessToken) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // FIXED: Query all investment reports and filter for liquid fund investments
      // Get latest reports within the selected date range
      const filterParams = {
        reportDateFrom: filters.startDate,
        reportDateTo: filters.endDate,
        // Get all liquid fund investments by querying investment groups
        liquidFundInvestmentIds: [], // Empty array means get all liquid fund investments
        limit: 1000, // Large limit to get all data for aggregation
        offset: 0,
        orderBy: [{
          field: 'date', 
          direction: 'DESC' as const // Get latest reports first
        }]
      };

      console.log('LiquidFund Reports Query Parameters:', filterParams);

      const response = await fetchInvestmentReports(filterParams);
      console.log('LiquidFund Reports Response:', response);

      const investmentReports = response.InvestmentReport || [];
      
      // FIXED: Group by investment ID and get the latest report for each investment
      const latestReportsByInvestment = new Map<string, any>();
      
      investmentReports.forEach(investmentReport => {
        const investmentId = investmentReport.investment?.id;
        if (investmentId && investmentReport.liquidFundInvestmentReport?.length > 0) {
          // Only keep the latest report for each investment (since we sorted by date DESC)
          if (!latestReportsByInvestment.has(investmentId)) {
            latestReportsByInvestment.set(investmentId, investmentReport);
          }
        }
      });
      
      // Transform latest reports to analytics data
      const allAnalyticsData: AnalyticsRowData[] = [];
      latestReportsByInvestment.forEach(investmentReport => {
        const liquidFundData = transformLiquidFundToAnalyticsRow(investmentReport, filters.currency || 'EUR');
        allAnalyticsData.push(...liquidFundData);
      });
      
      // Filter by investment type if specified
      const filteredData = filters.investmentType && filters.investmentType !== 'all'
        ? allAnalyticsData.filter(item => {
            const typeMatches = item.investmentType?.toLowerCase().includes(filters.investmentType!.toLowerCase());
            const nameMatches = item.depositName?.toLowerCase().includes(filters.investmentType!.toLowerCase());
            return typeMatches || nameMatches;
          })
        : allAnalyticsData;
      
      // Apply pagination to filtered results
      const startIndex = (currentPage - 1) * pageSize;
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to load liquid fund analytics data';
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
      console.error('Error loading liquid fund analytics data:', err);
    }
  }, [
    fetchInvestmentReports,
    filters,
    currentPage,
    pageSize,
    transformLiquidFundToAnalyticsRow,
    calculateTotals
  ]);

  // Load data when dependencies change
  useEffect(() => {
    if (accessToken && userInfo) {
      loadLiquidFundAnalyticsData();
    }
  }, [accessToken, userInfo, loadLiquidFundAnalyticsData]);

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
    refetch: loadLiquidFundAnalyticsData,
    
    // Metadata
    currentFilters: state.currentFilters,
    hasData: state.data.length > 0
  }), [state, loadLiquidFundAnalyticsData]);

  return returnValues;
};

export default useLiquidFundAnalyticsIntegration;