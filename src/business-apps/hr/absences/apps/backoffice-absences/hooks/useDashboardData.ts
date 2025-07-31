/**
 * Custom hook for fetching and processing dashboard data
 * ✅ NOW SUPPORTS: Server-side GraphQL aggregations for optimal performance
 */

import { useEffect, useState } from 'react';
import { useGraphQLClient } from '../../../../../../common/network/graphql/useGraphQLClient';
import { useCatalogManagerClient } from '../../../../../../common/network/catalogs/useCatalogManagerClient';
import { 
  getDashboardKPIAggregations,
  getVacationEntitlementsAggregations,
  getHybridAbsenceData
} from '../queries';
import { processServerSideAggregations } from '../utils/serverSideAggregationUtils';
import { DashboardData, TimeFilter } from '../types';

// ✅ FEATURE FLAG: Control server-side vs client-side aggregations
// ✅ Using server-side aggregations only

export interface UseDashboardDataProps {
  accessToken: string;
  timeFilter?: TimeFilter;
}

export const useDashboardData = ({ accessToken, timeFilter = 'current-year' }: UseDashboardDataProps): DashboardData => {
  const [data, setData] = useState<DashboardData>({
    totalAbsences: 0,
    pendingAbsences: 0,
    approvedAbsences: 0,
    rejectedAbsences: 0,
    cancelledAbsences: 0,
    averageDuration: 0,
    approvalRate: 0,
    
    averageVacationDays: 0,
    averageUsed: 0,
    averagePending: 0,
    totalVacationLiability: 0,
    
    departmentStats: [],
    monthlyData: [],
    rawAbsences: [],
    statusBreakdown: [],
    typeBreakdown: [],
    
    entitlements: {
      averageVacationPerEmployee: 0,
      totalActiveEmployees: 0,
      averageAvailable: 0,
      averageUsed: 0,
      totalVacationLiability: 0
    },
    
    isLoading: true,
    error: null
  });

  const graphQLClient = useGraphQLClient(accessToken);
  const catalogClient = useCatalogManagerClient(accessToken);

  // ✅ GET ABSENCE GROUP CATALOG - UNIFIED APPROACH
  const [absenceGroups, setAbsenceGroups] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchAbsenceGroups = async () => {
      if (!accessToken) return;

      try {
        catalogClient.setAccessToken(accessToken);
        const response = await catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'AbsenceGroup', version: 'v1' },
          { limit: 100, offset: 0, includeChildCatalogEntries: true }
        );

        const groupsMap = response.data.reduce((acc: Record<string, string>, group: any) => {
          acc[group.id] = group.displayName || group.value;
          return acc;
        }, {});

        setAbsenceGroups(groupsMap);
      } catch (error) {
        console.error('Error fetching absence groups:', error);
      }
    };

    fetchAbsenceGroups();
  }, [accessToken, catalogClient]);

  const fetchData = async () => {
    try {
          console.log('🚀 useDashboardData: Starting data fetch with SERVER-SIDE aggregations', {
      timeFilter,
      approach: 'GraphQL Aggregations + Hybrid Processing'
    });
      
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      if (!accessToken) {
        console.error('❌ No access token provided');
        setData(prev => ({ ...prev, isLoading: false, error: 'No access token provided' }));
        return;
      }

      // ✅ Set up GraphQL client
      graphQLClient.setAccessToken(accessToken);
      
      // ✅ Set up Catalog client for absenceGroups/Types
      catalogClient.setAccessToken(accessToken);

      // ✅ STEP 3: Server-Side Aggregations Approach
      console.log('🏎️ Using SERVER-SIDE aggregations with GraphQL...');
        
        // Ensure absence groups are loaded before proceeding
        if (Object.keys(absenceGroups).length === 0) {
          console.log('⏳ Waiting for absence groups to load...');
          return; // Exit early, will retry when absenceGroups loads
        }
        
        // Find vacation group ID from catalog (try multiple search terms)
        const vacationGroupId = Object.keys(absenceGroups).find(groupId => {
          const groupName = absenceGroups[groupId].toLowerCase();
          return groupName.includes('vacation') || groupName.includes('urlaub') || groupName.includes('annual');
        });
        
        console.log('🏖️ Vacation group search results:', { 
          vacationGroupId, 
          groupName: vacationGroupId ? absenceGroups[vacationGroupId] : 'NOT FOUND',
          availableGroups: Object.entries(absenceGroups).map(([id, name]) => ({ id, name })),
          totalGroups: Object.keys(absenceGroups).length
        });
        
        if (!vacationGroupId) {
          console.warn('⚠️ No vacation group found in catalog! Available groups:', absenceGroups);
        }
        
        // Execute all three queries in parallel for optimal performance
        const [kpiResult, entitlementsResult, hybridResult] = await Promise.all([
          graphQLClient.request(getDashboardKPIAggregations(timeFilter)),
          graphQLClient.request(getVacationEntitlementsAggregations(timeFilter, vacationGroupId)),
          graphQLClient.request(getHybridAbsenceData(timeFilter))
        ]);
        
        console.log('✅ Server aggregation queries completed', {
          totalAbsences: kpiResult.totalAbsences?.aggregate?.count || 0,
          vacationEntitlements: entitlementsResult.vacationEntitlements?.aggregate?.count || 0,
          hybridAbsences: hybridResult.absences?.length || 0
        });

        // Process server-side aggregations into dashboard format
        const processedData = processServerSideAggregations(
          kpiResult, 
          entitlementsResult, 
          hybridResult, 
          timeFilter,
          absenceGroups
        );
        
        console.log('🔄 Server-side aggregation processing completed', {
          processedData: {
            totalAbsences: processedData.totalAbsences,
            monthlyData: processedData.monthlyData?.length || 0,
            departmentStats: processedData.departmentStats?.length || 0,
            statusBreakdown: processedData.statusBreakdown?.length || 0
          }
        });

        // Set final data structure
        setData(processedData);

    } catch (error: any) {
      console.error('❌ Error in useDashboardData:', error);
      setData(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error?.message || 'Failed to load dashboard data' 
      }));
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchData();
    }
  }, [accessToken, timeFilter, JSON.stringify(absenceGroups)]);

  return data;
};

// Default export for easier importing
export default useDashboardData; 