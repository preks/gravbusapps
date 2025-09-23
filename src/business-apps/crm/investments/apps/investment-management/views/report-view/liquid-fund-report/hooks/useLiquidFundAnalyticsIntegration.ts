import { useState, useEffect, useCallback, useMemo } from 'react';
import { useGetInvestmentReports } from '@/common/data/investment-report/hooks/useInvestmentReports';
import dayjs from 'dayjs';
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
    
    if (liquidFundReports.length === 0) {
      return [];
    }
    
    return liquidFundReports.map((liquidFundReport: any) => {
      const investment = investmentReport.investment;
      const liquidFundInvestment = liquidFundReport.liquidFundInvestment;
      
      // Get proprietor name and investment name properly
      const proprietorName = liquidFundInvestment?.investment?.investmentAccount?.name || 
                           investment?.investmentAccount?.name || 
                           'Unknown Proprietor';
      
      // Use investment name as the primary identifier
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

      const result = {
        id: liquidFundReport.id,
        portfolioId: liquidFundReport.id,
        cashBankIdentifier: cashBankIdentifier,
        proprietorName: proprietorName,
        originalCurrency: targetCurrency || 'EUR',
        // Report date for display
        reportDate: investmentReport.date,
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
        reportCount: 1,
        
        // IMPORTANT: Include the full data structures for dynamic column access
        // This ensures the getValue functions in dynamic columns can access all nested data
        investment: liquidFundInvestment?.investment || investment,
        liquidFundInvestment: liquidFundInvestment ? [liquidFundInvestment] : [],
        liquidFundReport: liquidFundReport
      };
      
      return result;
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

  // Load analytics data - Query all liquid fund investments and get latest reports
  const loadLiquidFundAnalyticsData = useCallback(async () => {
    if (!accessToken) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Query all investment reports and filter for liquid fund investments
      // Use the same pattern as equity and real estate reports
      const filterParams = {
        limit: 10000, // Increase limit to handle larger datasets
        offset: 0,
        orderBy: [{
          field: 'date', 
          direction: 'DESC' as const // Get latest reports first
        }]
      };
      
      // Add date filters based on user selection
      if (filters.startDate) {
        filterParams.reportDateFrom = filters.startDate;
      }
      if (filters.endDate) {
        filterParams.reportDateTo = filters.endDate;
      }
      
      // Don't filter by investmentType at the GraphQL level - we'll filter by liquid fund type client-side
      // This is because the tabs represent liquid fund types, not general investment types

      const response = await fetchInvestmentReports(filterParams);

      const investmentReports = response.InvestmentReport || [];
      
      // Filter to only liquid fund investments and group by investment ID to get latest per investment
      const latestReportsByInvestment = new Map<string, any>();
      
      investmentReports.forEach((report) => {
        const investmentId = report.investment?.id;
        const investmentGroupCode = report.investment?.investmentGroup?.code;
        const isLiquidFundInvestment = investmentGroupCode === 'LIQUID_FUND';
        const hasLiquidFundReport = report.liquidFundInvestmentReport?.length > 0;
        
        if (investmentId && isLiquidFundInvestment && hasLiquidFundReport) {
          // Skip future reports (reports dated in the future)
          const reportDate = dayjs(report.date);
          const now = dayjs();
          
          // Validate date and skip if invalid or in the future
          if (!reportDate.isValid() || reportDate.isAfter(now)) {
            return; // Skip this future or invalid report
          }
          
          const existingReport = latestReportsByInvestment.get(investmentId);
          
          if (!existingReport) {
            // First report for this investment
            latestReportsByInvestment.set(investmentId, report);
          } else {
            // Compare dates to ensure we keep the absolute latest report
            const currentReportDate = dayjs(report.date);
            const existingReportDate = dayjs(existingReport.date);
            
            // Only update if current report date is valid and after existing report date
            if (currentReportDate.isValid() && existingReportDate.isValid() && currentReportDate.isAfter(existingReportDate)) {
              latestReportsByInvestment.set(investmentId, report);
            }
          }
        }
      });
      
      // Transform latest reports to analytics data
      const allAnalyticsData: AnalyticsRowData[] = [];
      latestReportsByInvestment.forEach(investmentReport => {
        const liquidFundData = transformLiquidFundToAnalyticsRow(investmentReport, 'EUR');
        allAnalyticsData.push(...liquidFundData);
      });
      
      // Filter by liquid fund type if specified (using the tab mapping)
      const tabToTypeMapping: Record<string, string> = {
        'Bank Deposit': 'BANK_DEPOSITE',
        'Fixed-Term Deposit': 'FIXED_TERM_DEPOSIT', 
        'Money Market Funds': 'MONEY_MARKET_FUNDS',
        'Pension Fund': 'PENSION_FUNDS',
        'Equity': 'EQUITY',
        'Bond': 'BONDS'
      };
      
      const filteredData = filters.investmentType && filters.investmentType !== 'all' && !filters.investmentType.includes(',')
        ? allAnalyticsData.filter(item => {
            // Map the display name to the liquid fund type code
            const targetLiquidFundTypeCode = tabToTypeMapping[filters.investmentType!];
            
            // Get the liquid fund type code from the item
            const itemLiquidFundTypeCode = 
              item.liquidFundInvestment?.[0]?.investmentLiquidFundType?.code ||
              item.liquidFundReport?.investmentLiquidFundType?.code ||
              item.investment?.liquidFundInvestment?.[0]?.investmentLiquidFundType?.code;
            
            const matches = itemLiquidFundTypeCode === targetLiquidFundTypeCode;
            
            return matches || !targetLiquidFundTypeCode; // If no mapping found, include the item
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
      console.error('Error loading liquid fund analytics data:', err);
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