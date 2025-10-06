// Liquid Fund Reports Hook - Uses common data layer
// Simple wrapper around useGetInvestmentReports with liquid fund specific logic

import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetInvestmentReports } from '@/common/data/investment-report/hooks/useInvestmentReports';
import type { InvestmentReportQueryVariables } from '@/common/data/investment-report/queries/investmentReportQueries';
import type { InvestmentReport } from '@/common/data/investment/types';
import { AnalyticsRowData } from '../types/AnalyticsTypes';

export interface LiquidFundReportFilters {
  startDate?: string;
  endDate?: string;
  investmentType?: string; // For client-side filtering by liquid fund type
}

export interface UseLiquidFundReportsReturn {
  reports: InvestmentReport[];
  analyticsData: AnalyticsRowData[];
  isLoading: boolean;
  error: Error | null;
  totalCount: number;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching liquid fund investment reports
 * Uses the common data layer and applies liquid fund specific transformations
 */
export const useLiquidFundReports = (
  context: BusinessAppContextProps,
  filters: LiquidFundReportFilters
): UseLiquidFundReportsReturn => {
  const [reports, setReports] = useState<InvestmentReport[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsRowData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const { fetchInvestmentReports } = useGetInvestmentReports(context);

  const loadReports = useCallback(async () => {
    if (!context.accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Build query variables - use the common data layer
      const variables: InvestmentReportQueryVariables = {
        investmentGroupIds: ['InvestmentGroup:v1:LIQUID_FUND'],
        limit: 1000,
        offset: 0,
        orderBy: [{ field: 'date', direction: 'DESC' }]
      };

      // Apply date filters
      if (filters.startDate) {
        variables.reportDateFrom = filters.startDate;
      }
      if (filters.endDate) {
        variables.reportDateTo = filters.endDate;
      }

      // Fetch using common data layer
      const { reports: fetchedReports, total } = await fetchInvestmentReports(variables);

      // Get latest report per investment
      const latestReportsByInvestment = new Map<string, InvestmentReport>();
      
      fetchedReports.forEach((report) => {
        const investmentId = report.investment?.id;
        if (!investmentId) return;

        const existingReport = latestReportsByInvestment.get(investmentId);
        if (!existingReport || new Date(report.date) > new Date(existingReport.date)) {
          latestReportsByInvestment.set(investmentId, report);
        }
      });

      const latestReports = Array.from(latestReportsByInvestment.values());

      // Transform to analytics data
      const transformedData: AnalyticsRowData[] = [];

      latestReports.forEach((report) => {
        const liquidFundReports = report.liquidFundInvestmentReport || [];

        // Create a row for each liquid fund report
        liquidFundReports.forEach((liquidFundReport) => {
          const row: AnalyticsRowData = {
            id: `${report.id}-${liquidFundReport.id}`,
            investmentId: report.investment?.id || '',
            investmentName: report.investment?.name || '',
            reportDate: report.date,
            liquidFundReport: liquidFundReport,
            liquidFundInvestment: liquidFundReport.liquidFundInvestment,
            investment: report.investment
          };

          transformedData.push(row);
        });
      });

      // Client-side filtering by investment type (if needed)
      let filteredData = transformedData;
      if (filters.investmentType) {
        const typeMapping: Record<string, string> = {
          'Bank Deposit': 'BANK_DEPOSITE',       // Catalog has typo DEPOSITE (not DEPOSIT)
          'Fixed-Term Deposit': 'FIXED_TERM_DEPOSIT',
          'Money Market Funds': 'MONEY_MARKET_FUNDS',
          'Pension Fund': 'PENSION_FUNDS',
          'Equity': 'EQUITY',
          'Bond': 'BONDS'
        };

        const targetType = typeMapping[filters.investmentType];
        if (targetType) {
          filteredData = transformedData.filter(
            (item) => item.liquidFundReport?.investmentLiquidFundType?.code === targetType
          );
        }
      }

      setReports(latestReports);
      setAnalyticsData(filteredData);
      
      // Derive totalCount from actual visible data to match what user sees
      // (accounts for client-side deduping and filtering)
      const visibleCount = filters.investmentType ? filteredData.length : latestReports.length;
      setTotalCount(visibleCount || total);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load liquid fund reports';
      setError(new Error(errorMessage));
      console.error('Error loading liquid fund reports:', err);
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, context.userInfo, filters.startDate, filters.endDate, filters.investmentType, fetchInvestmentReports]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  return {
    reports,
    analyticsData,
    isLoading,
    error,
    totalCount,
    refetch: loadReports
  };
};
