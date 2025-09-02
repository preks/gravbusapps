import { useState, useEffect, useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { AUDIT_FIELDS } from '@/common/network/graphql/commonFragments';
import type { 
  RealEstateAnalyticsFilters, 
  RealEstateAnalyticsRowData, 
  RealEstateAnalyticsResponse 
} from '../types';

interface UseRealEstateAnalyticsIntegrationProps {
  accessToken: string;
  userInfo: any;
  filters: RealEstateAnalyticsFilters;
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
  filters
}: UseRealEstateAnalyticsIntegrationProps): UseRealEstateAnalyticsIntegrationReturn => {
  const graphqlClient = useGraphQLClient(accessToken);
  
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

  // Load Real Estate analytics data using direct RealEstateInvestmentReport query
  const loadRealEstateAnalyticsData = useCallback(async (): Promise<RealEstateAnalyticsResponse> => {
    try {
      setLoading(true);
      setError(null);

      // Build where clause for filtering
      let whereClause = 'where: { isDeleted: { _eq: false }';
      
      // Filter by date range
      if (filters.startDate || filters.endDate) {
        let dateFilter = 'date: {';
        if (filters.startDate) {
          dateFilter += ` _gte: "${filters.startDate}"`;
        }
        if (filters.endDate) {
          if (filters.startDate) {
            dateFilter += ',';
          }
          dateFilter += ` _lte: "${filters.endDate}"`;
        }
        dateFilter += ' }';
        whereClause += `, ${dateFilter}`;
      }
      
      // Note: Investment type filtering moved to JavaScript level due to broken DB relationships
      // GraphQL level filtering: realEstateInvestment.investment is often null
      
      whereClause += ' }';

      const query = `
        query GetRealEstateInvestmentReports {
          RealEstateInvestmentReport(
            limit: 100
            offset: 0
            orderBy: [{ date: DESC }]
            ${whereClause}
          ) {
            id
            date
            annualNetColdRent
            occupancyPercent
            numberOfUnits
            actualAnnualExpenses
            funding
            ${AUDIT_FIELDS}
            
            realEstateInvestment {
              id
              locality
              buildingYear
              investment {
                id
                name
                code
                investmentType {
                  id
                  value
                }
              }
            }
          }
          
          RealEstateInvestmentReportAggregate(${whereClause}) {
            aggregate {
              count
            }
          }
        }
      `;

      console.log('RealEstate Direct Query:', query);

      const response = await graphqlClient.request<{
        RealEstateInvestmentReport: any[];
        RealEstateInvestmentReportAggregate: { aggregate: { count: number } };
      }>(query);
      
      console.log('RealEstate Direct Response:', response);

      const realEstateReports = response.RealEstateInvestmentReport || [];
      
                  // Transform reports directly to UI format
            const allTransformedData: RealEstateAnalyticsRowData[] = realEstateReports.map(transformRealEstateToAnalyticsRow);

            // Filter by property type if specified (legacy support)
            let filteredData = filters.propertyType && filters.propertyType !== 'all'
              ? allTransformedData.filter(item => item.propertyType?.toLowerCase().includes(filters.propertyType!.toLowerCase()))
              : allTransformedData;
              
            // Filter by investment type if specified (JavaScript level filtering due to broken DB relationships)
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
            console.log('RealEstate Raw Reports:', realEstateReports);
            
            // Debug investment data
            console.log('Debug - Investment data in reports:', filteredData.slice(0, 3).map(item => ({
              id: item.id,
              propertyName: item.propertyName,
              investmentId: item.investmentId,
              investmentName: item.investmentName,
              hasInvestmentId: !!item.investmentId
            })));

      setData(filteredData);
      setTotalCount(response.RealEstateInvestmentReportAggregate.aggregate.count);

      return {
        data: filteredData,
        totalCount: response.RealEstateInvestmentReportAggregate.aggregate.count,
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
  }, [graphqlClient, filters, transformRealEstateToAnalyticsRow]);

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
