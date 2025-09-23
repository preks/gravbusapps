import { useState, useEffect, useCallback } from 'react';
import { useGetInvestmentReports } from '@/common/data/investment-report/hooks/useInvestmentReports';
import { type InvestmentReportQueryVariables } from '@/common/data/investment-report/queries';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { EquityAnalyticsFilters } from '../types/EquityTypes';
import dayjs from 'dayjs';

export interface UseEquityReportsDataProps extends BusinessAppContextProps {
  filters: EquityAnalyticsFilters;
  options?: {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  };
}

export const useEquityReportsData = ({
  accessToken,
  userInfo,
  filters,
  options = {}
}: UseEquityReportsDataProps) => {
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

  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Load reports using the same pattern as InvestmentReportsTab
  const loadReports = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    
    try {
      const params: InvestmentReportQueryVariables = {
        limit: 10000, // Increase limit to handle larger datasets
        offset: 0,
        orderBy: [{ field: sortBy, direction: sortOrder }]
      };
      
      // Add date filters based on user selection
      if (filters.startDate) {
        params.reportDateFrom = filters.startDate;
      }
      if (filters.endDate) {
        params.reportDateTo = filters.endDate;
      }
      
      // Add investment type filter if specified
      if (filters.investmentType && filters.investmentType !== 'all') {
        params.investmentTypeIds = [`InvestmentType:v1:${filters.investmentType}`];
      }
      
      
      const response = await fetchInvestmentReports(params);
      const allReports = response.InvestmentReport || [];
      
      // Filter to only equity investments and group by investment ID to get latest per investment
      const latestReportsByInvestment = new Map<string, any>();
      
      allReports.forEach((report) => {
        const investmentId = report.investment?.id;
        const isEquityInvestment = report.investment?.investmentGroup?.code === 'EQUITY';
        
        if (investmentId && isEquityInvestment) {
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
      
      const latestReports = Array.from(latestReportsByInvestment.values());
      
      // Apply pagination to the results
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedReports = latestReports.slice(startIndex, endIndex);
      
      setReports(paginatedReports);
      setTotalCount(latestReports.length);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load investment reports';
      setError(errorMessage);
      setReports([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [fetchInvestmentReports, filters, sortBy, sortOrder, page, pageSize]);

  // Load data when dependencies change
  useEffect(() => {
    if (accessToken && userInfo) {
      loadReports();
    }
  }, [accessToken, userInfo, loadReports]);

  return {
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
};

export default useEquityReportsData;
