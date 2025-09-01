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
      
      // Get proprietor name from investment account
      const proprietorName = liquidFundInvestment?.investment?.investmentAccount?.name || 
                           investment?.investmentAccount?.name || 
                           'Unknown Proprietor';
      
      // Use available data for financial calculations (simplified for liquid funds)
      const openingBalance = 1000000; // Default opening balance for liquid funds
      const interestAmount = (liquidFundReport.interestRate || 0) * openingBalance / 100;
      const closingBalance = openingBalance + interestAmount;
      const incoming = interestAmount;
      const outgoing = 0;
      const realizedGainsLosses = interestAmount;
      const unrealizedGainsLosses = 0;
      const timeWeightedPerformance = liquidFundReport.interestRate || 0;

      // Create cash bank identifier using actual bank info
      const cashBankIdentifier = liquidFundReport.bankAccountNumber || 
        `${proprietorName} - ${liquidFundReport.bankName}` ||
        `LiquidFund ${liquidFundReport.id.substring(0, 8)}`;

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
        investmentName: liquidFundInvestment?.investment?.name || investment?.name || 'Unknown Investment',
        // Tab 3 specific fields
        depositName: liquidFundInvestment?.investment?.name || investment?.name || 'N/A',
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

  // Load analytics data
  const loadLiquidFundAnalyticsData = useCallback(async () => {
    if (!accessToken) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Calculate pagination
      const offset = (currentPage - 1) * pageSize;
      
      // Map sort field to valid LiquidFundInvestment field
      const mappedSortField = mapSortFieldToLiquidFundField(sortBy);
      
      // Build where clause
      let where: any = {
        isDeleted: { _eq: false }
      };

      // Add investment type filter (liquid fund specific filtering)
      if (filters.investmentType) {
        const investmentTypes = filters.investmentType.split(',').map(type => type.trim());
        
        if (investmentTypes.length === 1) {
          // Single investment type filter on related investment
          where.investment = {
            investmentType: {
              value: { _ilike: `%${investmentTypes[0]}%` }
            }
          };
        } else {
          // Multiple investment types
          where.investment = {
            investmentType: {
              value: { _in: investmentTypes }
            }
          };
        }
      }

      // Note: Liquid Fund reports are queried via central data source

      // Use enhanced investment reports query
      // LOAD ALL DATA - Don't filter by dates to show data immediately
      const filterParams = {
        // Remove date filters to load all data immediately
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

      console.log('LiquidFund Enhanced Query Parameters:', filterParams);

      const response = await fetchInvestmentReports(filterParams);
      console.log('LiquidFund Enhanced Response:', response);

      // Enhanced query returns: { InvestmentReport: [...], InvestmentReportAggregate: {...} }
      const investmentReports = response.InvestmentReport || [];
      
      // Extract all liquid fund reports from the investment reports relationships
      const allAnalyticsData: AnalyticsRowData[] = [];
      investmentReports.forEach(investmentReport => {
        const liquidFundData = transformLiquidFundToAnalyticsRow(investmentReport, filters.currency || 'EUR');
        allAnalyticsData.push(...liquidFundData);
      });
      
      // Filter by investment type if specified
      const filteredData = filters.investmentType && filters.investmentType !== 'all'
        ? allAnalyticsData.filter(item => {
            return item.investmentType?.toLowerCase().includes(filters.investmentType!.toLowerCase()) ||
                   item.depositName?.toLowerCase().includes(filters.investmentType!.toLowerCase());
          })
        : allAnalyticsData;
      
      // Apply pagination to filtered results (since we're doing client-side filtering)
      const startIndex = (currentPage - 1) * pageSize;
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
    sortBy,
    sortOrder,
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