import { useState, useEffect, useCallback } from 'react';
import { useGetInvestmentReports } from '@/common/data/investment/hooks/useInvestmentReports';
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
    const investment = report.realEstateInvestment?.investment;
    
    return {
      id: report.id,
      date: report.date ? new Date(report.date).toLocaleDateString() : 'N/A',
      propertyName: report.realEstateInvestment?.locality || `Property ${report.id.slice(-8)}`,
      propertyCode: report.realEstateInvestment?.id?.slice(-8) || 'N/A',
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
      investmentName: investment?.name || investment?.code || `Investment ${report.realEstateInvestment?.id?.slice(-8) || 'Unknown'}`
    };
  }, []);

  // Load Real Estate analytics data using central investment reports hook
  const loadRealEstateAnalyticsData = useCallback(async (): Promise<RealEstateAnalyticsResponse> => {
    try {
      setLoading(true);
      setError(null);

      // Use central investment reports query with real estate filtering
      const filterParams = {
        reportDateFrom: filters.startDate,
        reportDateTo: filters.endDate,
        limit: 100,
        offset: 0,
        orderBy: [{
          field: 'date',
          direction: 'DESC_NULLS_LAST' as 'DESC_NULLS_LAST'
        }]
      };

      console.log('RealEstate Central Query Parameters:', filterParams);

      const response = await fetchInvestmentReports(filterParams);
      console.log('RealEstate Central Response:', response);

      // Extract real estate investment reports from the central response
      const investmentReports = response.InvestmentReport || [];
      
      // Transform all real estate investment reports to analytics format
      const allTransformedData: RealEstateAnalyticsRowData[] = [];
      investmentReports.forEach(investmentReport => {
        const realEstateReports = investmentReport.realEstateInvestmentReport || [];
        realEstateReports.forEach((realEstateReport: any) => {
          const transformedData = transformRealEstateToAnalyticsRow({
            ...realEstateReport,
            realEstateInvestment: investmentReport.investment?.realEstateInvestment?.[0]
          });
          allTransformedData.push(transformedData);
        });
      });

      // Filter by property type if specified (legacy support)
      let filteredData = filters.propertyType && filters.propertyType !== 'all'
        ? allTransformedData.filter(item => item.propertyType?.toLowerCase().includes(filters.propertyType!.toLowerCase()))
        : allTransformedData;
        
      // Filter by investment type if specified
      if (filters.investmentType) {
        filteredData = filteredData.filter(item => {
          // Direct match with the investment type category
          return item.propertyType === filters.investmentType;
        });
        
        console.log(`Filtered for ${filters.investmentType}:`, {
          originalCount: allTransformedData.length,
          filteredCount: filteredData.length,
          sampleTypes: allTransformedData.slice(0, 5).map(item => item.propertyType)
        });
      }

      console.log('RealEstate Transformed Data:', filteredData);
      
      // Debug investment data
      console.log('Debug - Investment data in reports:', filteredData.slice(0, 3).map(item => ({
        id: item.id,
        propertyName: item.propertyName,
        investmentId: item.investmentId,
        investmentName: item.investmentName,
        hasInvestmentId: !!item.investmentId
      })));

      setData(filteredData);
      setTotalCount(response.InvestmentReportAggregate?.aggregate?.count || filteredData.length);

      return {
        data: filteredData,
        totalCount: response.InvestmentReportAggregate?.aggregate?.count || filteredData.length,
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
