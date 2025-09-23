import { useState, useEffect, useCallback } from 'react';
import { useGetInvestmentReports } from '@/common/data/investment-report/hooks/useInvestmentReports';
import type { 
  RealEstateAnalyticsFilters, 
  RealEstateAnalyticsRowData, 
  RealEstateAnalyticsResponse 
} from '../types';

interface UseRealEstateAnalyticsIntegrationProps {
  accessToken: string;
  userInfo: any;
  filters: RealEstateAnalyticsFilters;
  additionalData?: any;
}

interface UseRealEstateAnalyticsIntegrationReturn {
  data: RealEstateAnalyticsRowData[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  refetch: () => void;
}

// Simple hook for Real Estate analytics data

export const useRealEstateAnalyticsIntegration = ({
  accessToken,
  userInfo,
  filters,
  additionalData = {}
}: UseRealEstateAnalyticsIntegrationProps): UseRealEstateAnalyticsIntegrationReturn => {
  const { fetchInvestmentReports } = useGetInvestmentReports({
    accessToken,
    userInfo,
    additionalData
  });
  
  const [data, setData] = useState<RealEstateAnalyticsRowData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Transform RealEstateInvestmentReport data to UI format
  const transformRealEstateToAnalyticsRow = useCallback((report: any): RealEstateAnalyticsRowData => {
    const investment = report.realEstateInvestment?.investment || report.investment;
    
    // Use investment name as property name
    const propertyName = investment?.name || 
                        report.realEstateInvestment?.locality || 
                        `Property ${report.id.slice(-8)}`;
    
    return {
      id: report.id,
      date: report.date ? new Date(report.date).toLocaleDateString() : 'N/A',
      propertyName: propertyName,
      propertyCode: investment?.code || report.realEstateInvestment?.id?.slice(-8) || 'N/A',
      propertyType: (() => {
        // Since investment relationship is broken, map to investment types based on available data
        const locality = report.realEstateInvestment?.locality?.toLowerCase() || '';
        const buildingYear = report.realEstateInvestment?.buildingYear;
        
        // Map to the investment type categories used in the tabs
        // Try to categorize based on locality keywords and building year
        if (locality.includes('development') || locality.includes('new') || locality.includes('construction')) {
          return 'Project Development';
        } else if (locality.includes('loan') || locality.includes('mezzanine') || locality.includes('financing')) {
          return 'Mezzanine Loans';
        } else if (locality.includes('existing') || (buildingYear && buildingYear < 2020)) {
          return 'Existing Properties';
        } else if (locality.includes('office') || locality.includes('commercial') || locality.includes('retail')) {
          return 'Existing Properties'; // Most commercial properties are existing
        } else if (locality.includes('residential') || locality.includes('apartment') || locality.includes('housing')) {
          return 'Existing Properties'; // Most residential properties are existing
        } else {
          return 'Others'; // Default fallback to match the "Others" tab
        }
      })(),
      annualNetColdRent: Number(report.annualNetColdRent || 0),
      occupancyPercent: Number(report.occupancyPercent || 0),
      numberOfUnits: report.numberOfUnits ? Number(report.numberOfUnits) : undefined,
      actualAnnualExpenses: report.actualAnnualExpenses ? Number(report.actualAnnualExpenses) : undefined,
      funding: report.funding ? Number(report.funding) : undefined,
      currency: 'EUR', // Default since relationship is broken
      fundManagerName: 'N/A', // Default since relationship is broken
      // Investment information for linking
      investmentId: investment?.id,
      investmentName: propertyName // Use the same property name (which is now investment name)
    };
  }, []);

  // Load Real Estate analytics data - get all real estate investments and latest reports
  const loadRealEstateAnalyticsData = useCallback(async (): Promise<RealEstateAnalyticsResponse> => {
    try {
      setLoading(true);
      setError(null);

      // Query all real estate investment reports within date range
      const filterParams = {
        reportDateFrom: filters.startDate,
        reportDateTo: filters.endDate,
        // Get all real estate investments
        realEstateInvestmentIds: [], // Empty array means get all real estate investments
        limit: 1000, // Large limit to get all data for aggregation
        offset: 0,
        orderBy: [{
          field: 'date',
          direction: 'DESC' as const // Get latest reports first
        }]
      };

      const response = await fetchInvestmentReports(filterParams);

      const investmentReports = response.InvestmentReport || [];
      
      // Group by investment ID and get the latest report for each investment
      const latestReportsByInvestment = new Map<string, any>();
      
      investmentReports.forEach(investmentReport => {
        const investmentId = investmentReport.investment?.id;
        if (investmentId && investmentReport.realEstateInvestmentReport?.length > 0) {
          // Only keep the latest report for each investment (since we sorted by date DESC)
          if (!latestReportsByInvestment.has(investmentId)) {
            latestReportsByInvestment.set(investmentId, investmentReport);
          }
        }
      });
      
      // Transform latest reports to analytics format
      const allTransformedData: RealEstateAnalyticsRowData[] = [];
      latestReportsByInvestment.forEach(investmentReport => {
        const realEstateReports = investmentReport.realEstateInvestmentReport || [];
        realEstateReports.forEach((realEstateReport: any) => {
          const transformedData = transformRealEstateToAnalyticsRow({
            ...realEstateReport,
            realEstateInvestment: investmentReport.investment?.realEstateInvestment?.[0],
            investment: investmentReport.investment // Pass investment data for proper name mapping
          });
          allTransformedData.push(transformedData);
        });
      });

      // Filter by investment type if specified
      let filteredData = allTransformedData;
      if (filters.investmentType) {
        filteredData = allTransformedData.filter(item => {
          // Direct match with the investment type category
          return item.propertyType === filters.investmentType;
        });
        
      }

      setData(filteredData);
      setTotalCount(filteredData.length);

      return {
        data: filteredData,
        totalCount: filteredData.length,
      };
    } catch (err) {
      console.error('Error loading real estate analytics data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Error Loading Real Estate Analytics Data: ${errorMessage}`);
      
      return {
        data: [],
        totalCount: 0,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  }, [fetchInvestmentReports, filters, transformRealEstateToAnalyticsRow]);

  // Load data when dependencies change
  useEffect(() => {
    // ALWAYS load data if we have access token and user info - NO FILTER REQUIREMENT
    if (accessToken && userInfo) {
      loadRealEstateAnalyticsData();
    }
  }, [accessToken, userInfo, loadRealEstateAnalyticsData]);

  // Refetch function
  const refetch = useCallback(() => {
    loadRealEstateAnalyticsData();
  }, [loadRealEstateAnalyticsData]);

  return {
    data,
    loading,
    error,
    totalCount,
    refetch,
  };
};
