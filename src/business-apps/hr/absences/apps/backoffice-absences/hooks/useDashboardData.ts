/**
 * Custom hook for fetching and processing dashboard data
 * ✅ NOW SUPPORTS: Server-side GraphQL aggregations for optimal performance
 */

import { useEffect, useState } from 'react';
import { useGraphQLClient } from '../../../../../../common/network/graphql/useGraphQLClient';
import { useCatalogManagerClient } from '../../../../../../common/network/catalogs/useCatalogManagerClient';
import { getOptimizedDashboardQuery } from '../queries/ServerSideAggregationQueries';
import { groupAbsencesByDepartment, groupAbsencesByMonth, calculateVacationMetrics } from '../utils';
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

      // ✅ Enhanced Server-Side Aggregations Approach
        
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
        

        
        if (!vacationGroupId) {
          console.warn('⚠️ No vacation group found in catalog! Available groups:', absenceGroups);
        }
        
                // ✅ FIXED: Use single working query (same pattern as legacy getDashboardQuery)
        const result = await graphQLClient.request(getOptimizedDashboardQuery(timeFilter, vacationGroupId));

        // ✅ WORKING: Use existing proven processing logic (same as legacy frontend calculations)
        const { employeeAbsences, EmployeeAbsenceEntitlement } = result;

        // Transform to match existing EnhancedAbsence interface
        const enhancedAbsences = employeeAbsences.map((absence: any) => ({
          ...absence,
          groupName: absence.type?.parentEntryId ? absenceGroups[absence.type.parentEntryId] || 'Unknown Group' : 'Unknown Group',
          typeName: absence.type?.translations?.find((t: any) => t.localeCode === 'en')?.value || absence.type?.value || 'Unknown Type',
          employeeName: `${absence.employee?.firstName || ''} ${absence.employee?.lastName || ''}`.trim(),
          departmentName: absence.employee?.employeePosition?.organizationalUnit?.name || 'No Department'
        }));

        // ✅ WORKING: Use existing proven calculation utilities
        const departmentStats = groupAbsencesByDepartment(enhancedAbsences);
        const monthlyData = groupAbsencesByMonth(enhancedAbsences, timeFilter);
        const vacationMetrics = calculateVacationMetrics(EmployeeAbsenceEntitlement);

        // Calculate other metrics using existing logic
        const totalAbsences = enhancedAbsences.length;
        const pendingAbsences = enhancedAbsences.filter((a: any) => a.status === 'PENDING').length;
        const approvedAbsences = enhancedAbsences.filter((a: any) => a.status === 'APPROVED').length;
        const rejectedAbsences = enhancedAbsences.filter((a: any) => a.status === 'REJECTED').length;
        const cancelledAbsences = enhancedAbsences.filter((a: any) => a.status === 'CANCELLED').length;
        
        const totalDays = enhancedAbsences.reduce((sum: number, a: any) => sum + (a.effectiveDays || 0), 0);
        const averageDuration = totalAbsences > 0 ? totalDays / totalAbsences : 0;
        const approvalRate = totalAbsences > 0 ? (approvedAbsences / totalAbsences) * 100 : 0;

        // Status breakdown for pie chart
        const statusBreakdown = [
          { status: 'APPROVED', count: approvedAbsences, percentage: totalAbsences > 0 ? (approvedAbsences / totalAbsences) * 100 : 0, totalDays: enhancedAbsences.filter((a: any) => a.status === 'APPROVED').reduce((sum: number, a: any) => sum + (a.effectiveDays || 0), 0) },
          { status: 'PENDING', count: pendingAbsences, percentage: totalAbsences > 0 ? (pendingAbsences / totalAbsences) * 100 : 0, totalDays: enhancedAbsences.filter((a: any) => a.status === 'PENDING').reduce((sum: number, a: any) => sum + (a.effectiveDays || 0), 0) },
          { status: 'REJECTED', count: rejectedAbsences, percentage: totalAbsences > 0 ? (rejectedAbsences / totalAbsences) * 100 : 0, totalDays: enhancedAbsences.filter((a: any) => a.status === 'REJECTED').reduce((sum: number, a: any) => sum + (a.effectiveDays || 0), 0) },
          { status: 'CANCELLED', count: cancelledAbsences, percentage: totalAbsences > 0 ? (cancelledAbsences / totalAbsences) * 100 : 0, totalDays: enhancedAbsences.filter((a: any) => a.status === 'CANCELLED').reduce((sum: number, a: any) => sum + (a.effectiveDays || 0), 0) }
        ].filter((s: any) => s.count > 0);

        // Type breakdown
        const typeBreakdown = enhancedAbsences.reduce((acc: any[], absence: any) => {
          const existing = acc.find(t => t.type === absence.typeName);
          if (existing) {
            existing.count += 1;
            existing.totalDays += absence.effectiveDays || 0;
          } else {
            acc.push({
              type: absence.typeName,
              count: 1,
              totalDays: absence.effectiveDays || 0
            });
          }
          return acc;
        }, []);

        const processedData = {
          totalAbsences,
          pendingAbsences,
          approvedAbsences,
          rejectedAbsences,
          cancelledAbsences,
          averageDuration,
          approvalRate,
          departmentStats,
          monthlyData,
          statusBreakdown,
          typeBreakdown,
          rawAbsences: enhancedAbsences,
          entitlements: {
            averageVacationPerEmployee: vacationMetrics.averageVacationDays,
            totalActiveEmployees: vacationMetrics.totalActiveEmployees || 0,
            averageAvailable: vacationMetrics.averageAvailable || 0,
            averageUsed: vacationMetrics.averageUsed,
            totalVacationLiability: vacationMetrics.totalVacationLiability
          },
          ...vacationMetrics,
          isLoading: false,
          error: null
        };

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