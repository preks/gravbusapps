import { useState, useEffect, useCallback } from 'react';
import { useGetInvestmentReports } from '@/common/data/investment-report/hooks/useInvestmentReports';
import { type InvestmentReportQueryVariables } from '@/common/data/investment-report/queries';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { RealEstateReportFilters } from '../types';
import dayjs from 'dayjs';

export interface UseRealEstateReportsDataProps extends BusinessAppContextProps {
  filters: RealEstateReportFilters;
  options?: {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  };
}

interface UseRealEstateReportsDataReturn {
  // Data
  reports: any[];
  totalCount: number;
  
  // State
  isLoading: boolean;
  error: string | null;
  
  // Actions
  refetch: () => void;
  
  // Metadata
  hasData: boolean;
}

export const useRealEstateReportsData = ({
  accessToken,
  userInfo,
  filters,
  options = {}
}: UseRealEstateReportsDataProps): UseRealEstateReportsDataReturn => {
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
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load reports using the same pattern as EquityReportsData
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
      
      // Filter to only real estate investments and group by investment ID to get latest per investment
      const latestReportsByInvestment = new Map<string, any>();
      
      allReports.forEach((report) => {
        const investmentId = report.investment?.id;
        const isRealEstateInvestment = report.investment?.investmentGroup?.code === 'REAL_ESTATE';
        
        if (investmentId && isRealEstateInvestment) {
          // Skip future reports (reports dated in the future)
          if (dayjs(report.date).isAfter(dayjs())) {
            return; // Skip this future report
          }
          
          const existingReport = latestReportsByInvestment.get(investmentId);
          
          if (!existingReport) {
            // First report for this investment
            latestReportsByInvestment.set(investmentId, report);
          } else {
            // Compare dates to ensure we keep the absolute latest report
            if (dayjs(report.date).isAfter(dayjs(existingReport.date))) {
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
  }, [loadReports]);

  // Refetch function (same as loadReports for consistency)
  const refetch = loadReports;

  return {
    // Data
    reports,
    totalCount,
    
    // State
    isLoading,
    error,
    
    // Actions
    refetch,
    
    // Metadata
    hasData: reports.length > 0
  };
};
