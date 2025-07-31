/**
 * Custom hook for fetching and processing dashboard data
 * ✅ NOW SUPPORTS: Server-side GraphQL aggregations for optimal performance
 */

import { useState, useEffect, useCallback } from 'react';
import { useGraphQLClient } from '../../../../../../common/network/graphql/useGraphQLClient';
import { useCatalogManagerClient } from '../../../../../../common/network/catalogs/useCatalogManagerClient';
import { TimeFilter } from '../types';
import { getDashboardQuery, getAllDashboardAggregationsQuery } from '../queries';
import { 
  groupAbsencesByDepartment, 
  groupAbsencesByMonth, 
  calculateVacationMetrics,
  processHybridDashboardData,
  measureAggregationPerformance
} from '../utils';

// ✅ FEATURE FLAG: Use server-side aggregations (set to false temporarily due to GraphQL syntax complexity)
const USE_SERVER_SIDE_AGGREGATIONS = false;

export interface UseDashboardDataProps {
  accessToken: string;
  userInfo?: any;
  timeFilter?: TimeFilter;
}

export interface DashboardData {
  totalAbsences: number;
  avgDuration: number;
  averageVacationDays: number;
  averageUsed: number;
  averagePending: number;
  totalVacationLiability: number;
  
  // Legacy compatibility properties - required for backward compatibility
  pendingAbsences: number;
  approvedAbsences: number;
  rejectedAbsences: number;
  averageDuration: number;
  approvalRate: number;
  absencesPerEmployee: number;
  avgDaysPerEmployee: number;
  activeEmployeesCount: number;
  totalEffectiveDays: number;
  
  departmentStats: Array<{
    name: string;
    totalDays: number;
    uniqueEmployees: number;
    avgDaysPerEmployee: number;
    avgRequestsPerEmployee: number;
    totalRequests: number;
  }>;
  monthlyData: Array<{
    month: string;
    totalRequests: number;
    uniqueEmployees: number;
    avgRequestsPerEmployee: number;
    avgDurationPerRequest: number;
    totalDuration: number;
    typeBreakdown: Record<string, number>;
    // Legacy compatibility - required for backward compatibility
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  }>;
  typeBreakdown: Array<{
    type: string;
    totalDays: number;
    count: number;
  }>;
  statusBreakdown: Array<{
    status: string;
    count: number;
    totalDays: number;
    color: string;
    // Legacy compatibility - required for backward compatibility
    percentage: number;
  }>;
  rawAbsences: any[];
  
  // Legacy compatibility - entitlements structure
  entitlements: {
    averageVacationPerEmployee: number;
    totalActiveEmployees: number;
    averageAvailable: number;
    averageUsed: number;
    totalVacationLiability: number; // ✅ Add missing vacation liability field
  };
  
  isLoading: boolean;
  error: string | null;
}

export const useDashboardData = ({ accessToken, timeFilter = 'current-year' }: UseDashboardDataProps): DashboardData => {
  const [data, setData] = useState<DashboardData>({
    totalAbsences: 0,
    avgDuration: 0,
    averageVacationDays: 0,
    averageUsed: 0,
    averagePending: 0,
    totalVacationLiability: 0,
    
    // Legacy compatibility properties
    pendingAbsences: 0,
    approvedAbsences: 0,
    rejectedAbsences: 0,
    averageDuration: 0,
    approvalRate: 0,
    absencesPerEmployee: 0,
    avgDaysPerEmployee: 0,
    activeEmployeesCount: 0,
    totalEffectiveDays: 0,
    
    departmentStats: [],
    monthlyData: [],
    typeBreakdown: [],
    statusBreakdown: [],
    rawAbsences: [],
    
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

  const fetchDashboardData = useCallback(async () => {
    if (!accessToken) {
      console.warn('🔐 useDashboardData: No access token provided');
      return;
    }

    const startTime = performance.now();
    console.log(`🚀 useDashboardData: Starting data fetch with ${USE_SERVER_SIDE_AGGREGATIONS ? 'SERVER-SIDE' : 'CLIENT-SIDE'} aggregations`, {
      timeFilter,
      approach: USE_SERVER_SIDE_AGGREGATIONS ? 'GraphQL Aggregations + Hybrid Processing' : 'Legacy Frontend Calculations'
    });

    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      // ✅ STEP 1: Set up catalog client authentication
      catalogClient.setAccessToken(accessToken);

      // ✅ STEP 2: Fetch catalog data (required for both approaches)
      console.log('📚 Fetching catalog data...');
      const [absenceGroupsResponse, absenceTypesResponse] = await Promise.all([
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'AbsenceGroup', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: true, includeChildCatalogEntries: true }
        ),
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'AbsenceType', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: true, includeChildCatalogEntries: true }
        )
      ]);

      // Create catalog mapping objects
      const absenceGroupsMap = absenceGroupsResponse.data.reduce((map: any, entry: any) => {
        map[entry.id] = entry.value;
        return map;
      }, {});

      const absenceTypesMap = absenceTypesResponse.data.reduce((map: any, entry: any) => {
        map[entry.id] = entry.value;
        return map;
      }, {});

      const catalogMaps = { absenceGroupsMap, absenceTypesMap };
      console.log('✅ Catalog data fetched', {
        absenceGroups: Object.keys(absenceGroupsMap).length,
        absenceTypes: Object.keys(absenceTypesMap).length
      });

      // ✅ STEP 3: Choose aggregation approach
      if (USE_SERVER_SIDE_AGGREGATIONS) {
        // 🚀 NEW: Server-Side Aggregations Approach (disabled)
        console.log('🏎️ Using SERVER-SIDE aggregations with GraphQL...');
        
        graphQLClient.setAccessToken(accessToken);
        const query = getAllDashboardAggregationsQuery(timeFilter);
        
        console.log('📡 Executing server-side aggregation query...');
        const result = await graphQLClient.request(query);
        
        console.log('✅ Server aggregation query completed', {
          totalAbsences: result.totalAbsences?.aggregate?.count || 0,
          rawAbsencesCount: result.rawAbsences?.length || 0,
          aggregationFields: Object.keys(result).filter(key => key.includes('Absences') || key.includes('Employees'))
        });

        const processedData = processHybridDashboardData(result, catalogMaps);
        
        console.log('🎯 Server-side aggregation completed successfully', {
          totalAbsences: processedData.totalAbsences,
          avgDuration: processedData.avgDuration,
          departmentStats: processedData.departmentStats.length,
          monthlyData: processedData.monthlyData.length,
          vacationLiability: processedData.totalVacationLiability
        });

        // Map processed data to include legacy compatibility properties
        const compatibleData: DashboardData = {
          ...processedData,
          // Legacy compatibility mappings
          pendingAbsences: processedData.statusBreakdown.find(s => s.status === 'PENDING')?.count || 0,
          approvedAbsences: processedData.statusBreakdown.find(s => s.status === 'APPROVED')?.count || 0,
          rejectedAbsences: processedData.statusBreakdown.find(s => s.status === 'REJECTED')?.count || 0,
          averageDuration: processedData.avgDuration,
          approvalRate: processedData.totalAbsences > 0 ? 
            Math.round(((processedData.statusBreakdown.find(s => s.status === 'APPROVED')?.count || 0) / processedData.totalAbsences) * 100) : 0,
          // Map monthly data to include legacy properties
          monthlyData: processedData.monthlyData.map(month => ({
            ...month,
            total: month.totalRequests,
            approved: 0, // TODO: Calculate from rawAbsences if needed
            pending: 0,  // TODO: Calculate from rawAbsences if needed
            rejected: 0  // TODO: Calculate from rawAbsences if needed
          })),
          // Map status breakdown to include percentages
          statusBreakdown: processedData.statusBreakdown.map(status => ({
            ...status,
            percentage: processedData.totalAbsences > 0 ? 
              Math.round((status.count / processedData.totalAbsences) * 100) : 0
          })),
          // Legacy entitlements structure
          entitlements: {
            averageVacationPerEmployee: processedData.averageVacationDays,
            totalActiveEmployees: processedData.activeEmployeesCount || 0,
            averageAvailable: processedData.averageUsed, // Note: might need adjustment
            averageUsed: processedData.averageUsed,
            totalVacationLiability: processedData.totalVacationLiability || 0
          },
          // Ensure required properties are included
          isLoading: false,
          error: null
        };

        setData(compatibleData);

      } else {
        // 🔄 LEGACY: Frontend Calculations Approach (CURRENTLY ACTIVE)
        console.log('⚠️ Using LEGACY frontend calculations...');
        console.log('🎯 DEBUG: About to execute getDashboardQuery with timeFilter:', timeFilter);
        
        graphQLClient.setAccessToken(accessToken);
        
        const query = getDashboardQuery(timeFilter);
        console.log('🔍 DEBUG: GraphQL query constructed:', query.substring(0, 500) + '...');
        
        const result = await graphQLClient.request(query);
        
        console.log('📊 Raw data fetched, processing with frontend calculations...', {
          absencesCount: result.employeeAbsences?.length || 0,
          entitlementsCount: result.EmployeeAbsenceEntitlement?.length || 0,
          hasEmployeeAbsences: !!result.employeeAbsences,
          hasEntitlements: !!result.EmployeeAbsenceEntitlement,
          resultKeys: Object.keys(result)
        });

        if (!result.employeeAbsences) {
          console.warn('⚠️ WARNING: No employeeAbsences data in result!', result);
        }

        // Enhanced absences with group names
        const enhancedAbsences = (result.employeeAbsences || []).map((absence: any) => ({
          ...absence,
          groupName: absenceGroupsMap[absence.type?.parentEntryId] || 'Unknown Group',
          typeName: absenceTypesMap[absence.type?.id] || 'Unknown Type',
          employeeName: absence.employee ? 
            `${absence.employee.firstName || ''} ${absence.employee.lastName || ''}`.trim() || absence.employee.displayName || 'Unknown Employee'
            : 'Unknown Employee'
        }));

        console.log('🔍 DEBUG: Enhanced absences sample:', {
          totalEnhanced: enhancedAbsences.length,
          firstThreeAbsences: enhancedAbsences.slice(0, 3).map((a: any) => ({
            id: a.id,
            status: a.status,
            effectiveDays: a.effectiveDays,
            groupName: a.groupName,
            typeName: a.typeName
          }))
        });

        // Enhanced entitlements
        const enhancedEntitlements = (result.EmployeeAbsenceEntitlement || []).map((entitlement: any) => ({
          ...entitlement,
          typeName: absenceTypesMap[entitlement.type?.id] || 'Unknown Type'
        }));

        console.log('🔍 DEBUG: Enhanced entitlements sample:', {
          totalEntitlements: enhancedEntitlements.length,
          vacationEntitlements: enhancedEntitlements.filter((e: any) => 
            e.typeName.toLowerCase().includes('vacation') || 
            e.typeName.toLowerCase().includes('annual') || 
            e.typeName.toLowerCase().includes('holiday')
          ).length,
          sampleEntitlementTypes: enhancedEntitlements.slice(0, 5).map((e: any) => ({
            id: e.id,
            typeName: e.typeName,
            entitlement: e.entitlement,
            available: e.available,
            total: e.total
          })),
          vacationKeywords: enhancedEntitlements.filter((e: any) => 
            e.typeName.toLowerCase().includes('vacation') || 
            e.typeName.toLowerCase().includes('annual') || 
            e.typeName.toLowerCase().includes('holiday')
          ).map((e: any) => e.typeName)
        });

        // Frontend calculations
        const departmentStats = groupAbsencesByDepartment(enhancedAbsences);
        const monthlyData = groupAbsencesByMonth(enhancedAbsences, timeFilter);
        
        
        // Filter vacation entitlements with more debug info
        const vacationEntitlements = enhancedEntitlements.filter((e: any) => 
          e.typeName.toLowerCase().includes('vacation') || 
          e.typeName.toLowerCase().includes('annual') || 
          e.typeName.toLowerCase().includes('holiday')
        );
        
        console.log('🔍 DEBUG: Vacation entitlements filtering:', {
          allEntitlements: enhancedEntitlements.length,
          vacationFiltered: vacationEntitlements.length,
          vacationSample: vacationEntitlements.slice(0, 3)
        });
        
        const vacationMetrics = calculateVacationMetrics(vacationEntitlements);

        console.log('🔍 DEBUG: Frontend calculations results:', {
          departmentStatsLength: departmentStats.length,
          monthlyDataLength: monthlyData.length,
          vacationMetrics: {
            averageVacationDays: vacationMetrics.averageVacationDays,
            averageUsed: vacationMetrics.averageUsed,
            totalVacationLiability: vacationMetrics.totalVacationLiability
          }
        });

        console.log('🔍 DEBUG: Vacation metrics calculation result:', {
          inputVacationEntitlements: vacationEntitlements.length,
          outputMetrics: vacationMetrics,
          hasValidMetrics: Object.values(vacationMetrics).some(v => v > 0)
        });

        // Calculate other metrics
        const totalAbsences = enhancedAbsences.length;
        const totalDays = enhancedAbsences.reduce((sum: number, absence: any) => 
          sum + (absence.effectiveDays || absence.calendarDays || 0), 0);
        const avgDuration = totalAbsences > 0 ? Math.round((totalDays / totalAbsences) * 100) / 100 : 0;

        console.log('🔍 DEBUG: Core metrics calculated:', {
          totalAbsences,
          totalDays,
          avgDuration,
          absencesWithEffectiveDays: enhancedAbsences.filter((a: any) => a.effectiveDays > 0).length
        });

        // Status breakdown
        const statusMap = enhancedAbsences.reduce((map: any, absence: any) => {
          const status = absence.status || 'UNKNOWN';
          if (!map[status]) {
            map[status] = { count: 0, totalDays: 0 };
          }
          map[status].count++;
          map[status].totalDays += absence.effectiveDays || absence.calendarDays || 0;
          return map;
        }, {});

        const statusBreakdown = Object.entries(statusMap).map(([status, data]: [string, any]) => ({
          status,
          count: data.count,
          totalDays: data.totalDays,
          color: status === 'APPROVED' ? '#52c41a' : 
                 status === 'PENDING' ? '#faad14' : 
                 status === 'REJECTED' ? '#ff4d4f' : '#d9d9d9'
        }));

        // Type breakdown for pie chart
        const typeBreakdown = statusBreakdown.reduce((acc: any, item: any) => {
          acc[item.status] = item.count;
          return acc;
        }, {});

        // Measure performance
        measureAggregationPerformance(startTime, enhancedAbsences.length);

        console.log('✅ Legacy frontend calculations completed', {
          totalAbsences,
          avgDuration,
          departmentStats: departmentStats.length,
          monthlyData: monthlyData.length,
          vacationLiability: vacationMetrics.totalVacationLiability
        });

        const legacyCompatibleData: DashboardData = {
          totalAbsences,
          avgDuration,
          ...vacationMetrics,
          departmentStats,
          monthlyData: monthlyData.map(month => ({
            ...month,
            total: month.totalRequests,
            approved: 0, // Could calculate from raw data if needed
            pending: 0,
            rejected: 0
          })),
          typeBreakdown,
          statusBreakdown: statusBreakdown.map(status => ({
            ...status,
            percentage: totalAbsences > 0 ? Math.round((status.count / totalAbsences) * 100) : 0
          })),
          rawAbsences: enhancedAbsences,
          
          // Legacy compatibility properties
          pendingAbsences: statusBreakdown.find(s => s.status === 'PENDING')?.count || 0,
          approvedAbsences: statusBreakdown.find(s => s.status === 'APPROVED')?.count || 0,
          rejectedAbsences: statusBreakdown.find(s => s.status === 'REJECTED')?.count || 0,
          averageDuration: avgDuration,
          approvalRate: totalAbsences > 0 ? 
            Math.round(((statusBreakdown.find(s => s.status === 'APPROVED')?.count || 0) / totalAbsences) * 100) : 0,
          absencesPerEmployee: 0, // Could calculate if needed
          avgDaysPerEmployee: 0,  // Could calculate if needed
          activeEmployeesCount: 0, // Could calculate if needed
          totalEffectiveDays: totalDays,
          
          // Legacy entitlements structure
          entitlements: {
            averageVacationPerEmployee: vacationMetrics.averageVacationDays,
            totalActiveEmployees: vacationEntitlements.length, // Use actual vacation entitlements count
            averageAvailable: vacationMetrics.averageVacationDays - vacationMetrics.averageUsed, // Available = Total - Used
            averageUsed: vacationMetrics.averageUsed,
            totalVacationLiability: vacationMetrics.totalVacationLiability // ✅ Add missing vacation liability
          },
          
          isLoading: false,
          error: null
        };

        setData(legacyCompatibleData);
      }

    } catch (error: any) {
      console.error('❌ Dashboard data fetch failed:', error);
      const errorMessage = error?.message || 'Failed to load dashboard data';
      
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
    }
  }, [accessToken, timeFilter, graphQLClient, catalogClient]);

  useEffect(() => {
    if (accessToken) {
      fetchDashboardData();
    }
  }, [accessToken, fetchDashboardData]);

  return data;
};

// Default export for easier importing
export default useDashboardData; 