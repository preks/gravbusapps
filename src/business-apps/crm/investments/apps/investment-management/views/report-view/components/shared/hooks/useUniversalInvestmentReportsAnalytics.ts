// =============================================================================
// UNIVERSAL INVESTMENT REPORTS ANALYTICS HOOK
// =============================================================================
// This hook replaces useRealEstateReportsData, useEquityReportsData, and useLiquidFundAnalyticsIntegration
// with 100% functionality preservation and zero functionality loss

import { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetInvestmentReports } from '@/common/data/investment-report/hooks/useInvestmentReports';
import { InvestmentReportQueryVariables } from '@/common/data/investment-report/queries';
import { InvestmentReport } from '@/common/data/investment/types';
import { AnalyticsRowData } from '../../../liquid-fund-report/types/AnalyticsTypes';

// Common filter interface that works for all investment types
export interface CommonAnalyticsFilters {
  startDate?: string;
  endDate?: string;
  investmentType?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// Investment group types
export type InvestmentGroupType = 'REAL_ESTATE' | 'EQUITY' | 'LIQUID_FUND';

// Universal hook props with feature flags for exact behavior preservation
export interface UseUniversalInvestmentReportsAnalyticsProps extends BusinessAppContextProps {
  filters: CommonAnalyticsFilters;
  investmentGroup: InvestmentGroupType;
  options?: {
    // Standard options (all investment types)
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    
    // Liquid Fund specific options (preserves exact behavior)
    enableDataTransformation?: boolean; // Only for LIQUID_FUND
    targetCurrency?: string; // Only for LIQUID_FUND  
    returnTransformFunction?: boolean; // Only for LIQUID_FUND
    enableClientSideTypeFiltering?: boolean; // Only for LIQUID_FUND
  };
}

// Universal return interface that covers all use cases
export interface UniversalInvestmentReportsReturn {
  // Data (always present) - can be either InvestmentReport[] or AnalyticsRowData[] for liquid funds
  reports: InvestmentReport[] | AnalyticsRowData[];
  totalCount: number;
  
  // State (always present)
  isLoading: boolean;
  error: Error | null;
  
  // Actions (always present)
  refetch: () => void;
  
  // Metadata (always present)
  hasData: boolean;
  
  // Liquid Fund specific returns (conditional)
  transformLiquidFundToAnalyticsRow?: (investmentReport: InvestmentReport, targetCurrency: string) => AnalyticsRowData[];
  analyticsData?: AnalyticsRowData[]; // For liquid fund transformed data
}

// =============================================================================
// WRAPPER HOOK INTERFACES
// =============================================================================

// Base interface for all universal reports wrapper props
export interface UniversalReportsProps extends BusinessAppContextProps {
  filters: CommonAnalyticsFilters;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

// Real Estate Reports specific props (no additional properties needed)
export interface RealEstateReportsProps extends UniversalReportsProps {}

// Equity Reports specific props (no additional properties needed)
export interface EquityReportsProps extends UniversalReportsProps {}

// Liquid Fund Reports specific props with additional options
export interface LiquidFundReportsProps extends UniversalReportsProps {
  enableDataTransformation?: boolean;
  targetCurrency?: string;
  returnTransformFunction?: boolean;
  enableClientSideTypeFiltering?: boolean;
}

// Universal hook that preserves 100% functionality from all three existing hooks
export const useUniversalInvestmentReportsAnalytics = ({
  accessToken,
  userInfo,
  filters,
  investmentGroup,
  options = {}
}: UseUniversalInvestmentReportsAnalyticsProps): UniversalInvestmentReportsReturn => {
  const {
    page = 1,
    pageSize = 50,
    sortBy = 'date',
    sortOrder = 'DESC',
    enableDataTransformation = false,
    targetCurrency = 'EUR',
    returnTransformFunction = false,
    enableClientSideTypeFiltering = false
  } = options;

  // Use the same central infrastructure as all existing hooks
  const { fetchInvestmentReports } = useGetInvestmentReports({
    accessToken,
    userInfo,
    additionalData: {}
  });
  
  // State management (identical to all existing hooks)
  const [reports, setReports] = useState<InvestmentReport[] | AnalyticsRowData[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsRowData[]>([]);

  // Liquid Fund transformation function (exact copy from useLiquidFundAnalyticsIntegration)
  const transformLiquidFundToAnalyticsRow = useCallback((
    investmentReport: InvestmentReport,
    targetCurrency: string
  ): AnalyticsRowData[] => {
    const liquidFundReports = investmentReport.liquidFundInvestmentReport || [];
    
    if (liquidFundReports.length === 0) {
      return [];
    }
    
    return liquidFundReports.map((liquidFundReport) => {
      const investment = investmentReport.investment;
      const liquidFundInvestment = liquidFundReport.liquidFundInvestment;
      
      // Get proprietor name and investment name properly (exact copy)
      const proprietorName = (liquidFundInvestment as any)?.investment?.investmentAccount?.name || 
                           (investment as any)?.investmentAccount?.name || 
                           'Unknown Proprietor';
      
      const investmentName = liquidFundInvestment?.investment?.name || 
                           investment?.name || 
                           proprietorName ||
                           'Unknown Investment';
      
      // Financial calculations (exact copy) - cast to any for dynamic property access
      const liquidFundReportAny = liquidFundReport as any;
      const openingBalance = liquidFundReportAny.openingBalance || investment?.initialInvestmentAmount || 1000000;
      const closingBalance = liquidFundReportAny.closingBalance || investment?.investmentMarketValue || openingBalance;
      const incoming = liquidFundReportAny.incoming || 0;
      const outgoing = liquidFundReportAny.outgoing || 0;
      const realizedGainsLosses = liquidFundReportAny.realizedGainsLosses || 0;
      const unrealizedGainsLosses = liquidFundReportAny.unrealizedGainsLosses || 0;
      const timeWeightedPerformance = liquidFundReportAny.timeWeightedPerformance || liquidFundReport.interestRate || 0;

      const cashBankIdentifier = `${investmentName} - ${liquidFundReport.bankName || 'Unknown Bank'}`;

      return {
        id: liquidFundReport.id,
        portfolioId: liquidFundReport.id,
        cashBankIdentifier: cashBankIdentifier,
        proprietorName: proprietorName,
        originalCurrency: targetCurrency || 'EUR',
        reportDate: investmentReport.date,
        maturityDate: liquidFundReport.maturityDate || liquidFundInvestment?.maturityDate,
        interestRate: liquidFundReport.interestRate || liquidFundInvestment?.interestRate,
        investmentId: liquidFundInvestment?.investment?.id || investment?.id,
        investmentName: investmentName,
        openingBalance,
        incoming,
        outgoing,
        realizedGainsLosses,
        unrealizedGainsLosses,
        closingBalance,
        timeWeightedPerformance,
        investmentType: liquidFundReport.investmentLiquidFundType?.value || 'Liquid Fund',
        reportCount: 1,
        investment: investment,
        liquidFundInvestment: [liquidFundInvestment],
        liquidFundReport: liquidFundReport
      };
    });
  }, []);

  // Load reports with investment group-specific logic (preserves exact behavior)
  const loadReports = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    
    try {
      // Build GraphQL parameters (identical to all hooks)
      const params: InvestmentReportQueryVariables = {
        limit: 10000,
        offset: 0,
        orderBy: [{ field: sortBy, direction: sortOrder }]
      };
      
      // Date filtering (identical in all hooks)
      if (filters.startDate) {
        params.reportDateFrom = filters.startDate;
      }
      if (filters.endDate) {
        params.reportDateTo = filters.endDate;
      }
      
      // Investment type filtering (Real Estate & Equity only)
      if ((investmentGroup === 'REAL_ESTATE' || investmentGroup === 'EQUITY') && 
          filters.investmentType && filters.investmentType !== 'all') {
        params.investmentTypeIds = [`InvestmentType:v1:${filters.investmentType}`];
      }
      
      // Fetch data (identical in all hooks)
      const response = await fetchInvestmentReports(params);
      let allReports = response.InvestmentReport || [];
      
      // Fallback data fetching (identical in all hooks)
      if (allReports.length === 0 && filters.endDate) {
        const { reportDateFrom, ...paramsWithoutDateFrom } = params;
        const fallbackParams = {
          ...paramsWithoutDateFrom,
          reportDateTo: filters.endDate
        };
        const fallbackResponse = await fetchInvestmentReports(fallbackParams);
        allReports = fallbackResponse.InvestmentReport || [];
      }
      
      // Filter by investment group and get latest per investment (identical logic)
      const latestReportsByInvestment = new Map<string, InvestmentReport>();
      
      allReports.forEach((report) => {
        const investmentId = report.investment?.id;
        const investmentGroupCode = (report as any).investment?.investmentGroup?.code;
        const isCorrectGroup = investmentGroupCode === investmentGroup;
        
        if (investmentId && isCorrectGroup) {
          // Future report filtering (identical in all hooks)
          const reportDate = dayjs(report.date);
          const now = dayjs();
          
          if (!reportDate.isValid() || reportDate.isAfter(now)) {
            return;
          }
          
          const existingReport = latestReportsByInvestment.get(investmentId);
          
          if (!existingReport) {
            latestReportsByInvestment.set(investmentId, report);
          } else {
            const currentReportDate = dayjs(report.date);
            const existingReportDate = dayjs(existingReport.date);
            
            if (currentReportDate.isValid() && existingReportDate.isValid() && 
                currentReportDate.isAfter(existingReportDate)) {
              latestReportsByInvestment.set(investmentId, report);
            }
          }
        }
      });
      
      const latestReports = Array.from(latestReportsByInvestment.values());
      
      // Branch: Liquid Fund specific processing
      if (investmentGroup === 'LIQUID_FUND' && enableDataTransformation) {
        const allAnalyticsData: AnalyticsRowData[] = [];
        latestReportsByInvestment.forEach(investmentReport => {
          const liquidFundData = transformLiquidFundToAnalyticsRow(investmentReport, targetCurrency);
          allAnalyticsData.push(...liquidFundData);
        });
        
        // Client-side type filtering (Liquid Fund only)
        let filteredData = allAnalyticsData;
        if (enableClientSideTypeFiltering && filters.investmentType) {
          // Exact filtering logic from useLiquidFundAnalyticsIntegration
          const typeMapping: Record<string, string> = {
            'Bank Deposit': 'BANK_DEPOSITE',
            'Fixed-Term Deposit': 'FIXED_TERM_DEPOSIT', 
            'Money Market Funds': 'MONEY_MARKET_FUNDS',
            'Pension Fund': 'PENSION_FUNDS',
            'Equity': 'EQUITY',
            'Bond': 'BONDS'
          };
          
          const targetTypeValue = typeMapping[filters.investmentType];
          if (targetTypeValue) {
            filteredData = allAnalyticsData.filter(item => {
              const itemTypeValue = item.liquidFundReport?.investmentLiquidFundType?.value;
              return itemTypeValue === targetTypeValue;
            });
          }
        }
        
        setAnalyticsData(filteredData);
        setReports(filteredData);
        setTotalCount(filteredData.length);
      } else {
        // Branch: Real Estate & Equity processing (identical to original hooks)
        const paginatedReports = latestReports.slice(
          (page - 1) * pageSize,
          page * pageSize
        );
        
        setReports(paginatedReports);
        setTotalCount(latestReports.length);
      }
      
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load investment reports');
      setError(error);
      setReports([]);
      setTotalCount(0);
      if (enableDataTransformation) {
        setAnalyticsData([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    fetchInvestmentReports, 
    filters, 
    investmentGroup, 
    sortBy, 
    sortOrder, 
    page, 
    pageSize,
    enableDataTransformation,
    targetCurrency,
    enableClientSideTypeFiltering,
    transformLiquidFundToAnalyticsRow,
    accessToken
  ]);

  // Load data when dependencies change (identical to all hooks)
  useEffect(() => {
    if (accessToken && userInfo) {
      loadReports();
    }
  }, [accessToken, userInfo, loadReports]);

  // Return interface that covers all use cases
  const baseReturn = {
    // Data
    reports,
    totalCount,
    
    // State
    isLoading,
    error,
    
    // Actions
    refetch: loadReports,
    
    // Metadata
    hasData: reports.length > 0
  };

  // Conditional returns for Liquid Fund specific functionality
  if (investmentGroup === 'LIQUID_FUND') {
    return {
      ...baseReturn,
      ...(returnTransformFunction && { transformLiquidFundToAnalyticsRow }),
      ...(enableDataTransformation && { analyticsData })
    };
  }

  return baseReturn;
};

// =============================================================================
// CONVENIENCE WRAPPERS FOR EXISTING HOOKS (100% COMPATIBILITY)
// =============================================================================

// Real Estate Reports wrapper (exact same interface)
export const useRealEstateReportsDataUniversal = (props: RealEstateReportsProps): UniversalInvestmentReportsReturn => {
  return useUniversalInvestmentReportsAnalytics({
    accessToken: props.accessToken,
    userInfo: props.userInfo,
    filters: props.filters,
    investmentGroup: 'REAL_ESTATE' as const,
    options: {
      page: props.page,
      pageSize: props.pageSize,
      sortBy: props.sortBy,
      sortOrder: props.sortOrder
    }
  });
};

// Equity Reports wrapper (exact same interface)
export const useEquityReportsDataUniversal = (props: EquityReportsProps): UniversalInvestmentReportsReturn => {
  return useUniversalInvestmentReportsAnalytics({
    accessToken: props.accessToken,
    userInfo: props.userInfo,
    filters: props.filters,
    investmentGroup: 'EQUITY' as const,
    options: {
      page: props.page,
      pageSize: props.pageSize,
      sortBy: props.sortBy,
      sortOrder: props.sortOrder
    }
  });
};

// Liquid Fund Analytics wrapper (exact same interface)
export const useLiquidFundAnalyticsIntegrationUniversal = (props: LiquidFundReportsProps): UniversalInvestmentReportsReturn => {
  return useUniversalInvestmentReportsAnalytics({
    accessToken: props.accessToken,
    userInfo: props.userInfo,
    filters: props.filters,
    investmentGroup: 'LIQUID_FUND' as const,
    options: {
      page: props.page,
      pageSize: props.pageSize,
      sortBy: props.sortBy,
      sortOrder: props.sortOrder,
      enableDataTransformation: props.enableDataTransformation ?? true,
      targetCurrency: props.targetCurrency ?? 'EUR',
      returnTransformFunction: props.returnTransformFunction ?? true,
      enableClientSideTypeFiltering: props.enableClientSideTypeFiltering ?? true
    }
  });
};
