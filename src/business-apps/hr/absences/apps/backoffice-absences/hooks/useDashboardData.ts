/**
 * Custom hook for fetching and processing dashboard data
 * ✅ USES: True server-side GraphQL aggregations for optimal performance
 */

import { useEffect, useState } from 'react';
import { useGraphQLClient } from '../../../../../../common/network/graphql/useGraphQLClient';
import { useCatalogManagerClient } from '../../../../../../common/network/catalogs/useCatalogManagerClient';
import { getOptimizedDashboardQuery } from '../queries/ServerSideAggregationQueries';
import { processCompleteServerSideAggregations } from '../utils/serverSideAggregationUtils';
import { DashboardData, TimeFilter } from '../types';

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

  const fetchData = async () => {
    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      // ✅ STEP 1: Fetch absence groups catalog (required for proper type mapping)
      console.log('📋 Fetching absence groups catalog...');
      
      await catalogClient.setAccessToken(accessToken);
      const absenceGroupsData = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: "AbsenceGroup", version: "v1" },
        { 
          limit: 100, 
          offset: 0, 
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      );
      
      const absenceGroups: Record<string, string> = {};
      absenceGroupsData.data.forEach((group: any) => {
        absenceGroups[group.id] = group.value;
        if (group.catalogEntryLocalId) {
          absenceGroups[group.catalogEntryLocalId] = group.value;
        }
      });

      console.log('✅ Absence groups loaded:', Object.keys(absenceGroups).length, 'groups');

      // ✅ STEP 2: Find vacation group ID for entitlement filtering
      const vacationGroup = absenceGroupsData.data.find((group: any) => 
        group.value && group.value.toLowerCase().includes('leave')
      );
      const vacationGroupId = vacationGroup?.id;
      
      if (vacationGroupId) {
        console.log('🏖️ Vacation group found:', { id: vacationGroupId, name: vacationGroup.value });
      } else {
        console.warn('⚠️ No vacation group found - vacation metrics may be limited');
      }

      // ✅ SERVER-SIDE AGGREGATIONS: True server-side processing
      console.log('🚀 Using server-side aggregations for optimal performance');
      
      const query = getOptimizedDashboardQuery(timeFilter, vacationGroupId);
      const result = await graphQLClient.request<any>(query);
      
      console.log('📊 Server aggregation results received:', {
        totalAbsencesCount: result.totalAbsences?.aggregate?.count,
        approvedCount: result.approvedAbsences?.aggregate?.count,
        pendingCount: result.pendingAbsences?.aggregate?.count,
        vacationEntitlementsCount: result.vacationEntitlements?.aggregate?.count,
        rawDataCount: result.employeeAbsences?.length,
        avgDuration: result.totalAbsences?.aggregate?.avg?.effectiveDays
      });

      // Process aggregation results with minimal client-side work
      const processedData = processCompleteServerSideAggregations(
        result,
        timeFilter,
        absenceGroups
      );

      setData(processedData);
      
      console.log('✅ Server-side aggregations processing complete!', {
        totalAbsences: processedData.totalAbsences,
        averageDuration: processedData.averageDuration,
        approvalRate: processedData.approvalRate,
        averageVacationDays: processedData.averageVacationDays,
        totalVacationLiability: processedData.totalVacationLiability,
        performanceGain: 'Significant - server-side calculations used'
      });

    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      setData(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchData();
    }
  }, [accessToken, timeFilter]);

  return data;
};

// Default export for easier importing
export default useDashboardData; 