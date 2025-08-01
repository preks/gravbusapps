/**
 * Server-Side Aggregation Processing Utilities
 * ✅ ENHANCED: Now supports optimized aggregation approaches based on MCP testing
 * 
 * Processes results from the new server-side aggregation queries:
 * - getDepartmentStatsAggregation()
 * - getMonthlyTrendsAggregation() 
 * - getEnhancedVacationMetrics()
 * - getOptimizedAbsenceData()
 */

import { DashboardData } from '../types';
import { groupAbsencesByDepartment, groupAbsencesByMonth } from './index';

/**
 * ✅ NEW: Process Complete Server-Side Aggregations
 * Handles the new getCompleteAggregationsQuery that combines all aggregations in one query
 */
export const processCompleteServerSideAggregations = (
  aggregationResult: any,
  timeFilter: string,
  absenceGroups: Record<string, string> = {}
): DashboardData => {
  
  console.log('🚀 Processing complete server-side aggregations:', {
    hasAggregationResult: !!aggregationResult,
    totalAbsences: aggregationResult?.totalAbsences?.aggregate,
    vacationEntitlements: aggregationResult?.vacationEntitlements?.aggregate,
    rawAbsencesCount: aggregationResult?.employeeAbsences?.length,
    rawEntitlementsCount: aggregationResult?.EmployeeAbsenceEntitlement?.length
  });

  // ✅ EXTRACT AGGREGATION RESULTS
  const totalAbsencesAgg = aggregationResult?.totalAbsences?.aggregate || {};
  const approvedAgg = aggregationResult?.approvedAbsences?.aggregate || {};
  const pendingAgg = aggregationResult?.pendingAbsences?.aggregate || {};
  const rejectedAgg = aggregationResult?.rejectedAbsences?.aggregate || {};
  const cancelledAgg = aggregationResult?.cancelledAbsences?.aggregate || {};
  const vacationAgg = aggregationResult?.vacationEntitlements?.aggregate || {};

  // ✅ CORE KPI METRICS (Server-aggregated)
  const totalAbsences = totalAbsencesAgg.count || 0;
  const approvedAbsences = approvedAgg.count || 0;
  const pendingAbsences = pendingAgg.count || 0;
  const rejectedAbsences = rejectedAgg.count || 0;
  const cancelledAbsences = cancelledAgg.count || 0;
  
  // Average duration from server aggregation (no client-side calculation needed)
  const averageDuration = totalAbsencesAgg.avg?.effectiveDays || 0;
  const approvalRate = totalAbsences > 0 ? Math.round((approvedAbsences / totalAbsences) * 100) : 0;

  // ✅ VACATION METRICS (Server-aggregated)
  const vacationEmployeeCount = vacationAgg.count || 0;
  const averageVacationDays = vacationAgg.avg?.total || 0;
  const averageUsed = vacationAgg.avg?.approved || 0;
  const averagePending = vacationAgg.avg?.pending || 0;
  const averageAvailable = vacationAgg.avg?.available || 0;
  
  // Total vacation liability from server sum
  const totalVacationLiability = vacationAgg.sum?.available || 0;

  // ✅ STATUS BREAKDOWN (Using aggregated counts and sums)
  const statusBreakdown = [
    { 
      status: 'APPROVED', 
      count: approvedAbsences, 
      percentage: totalAbsences > 0 ? Math.round((approvedAbsences / totalAbsences) * 100) : 0,
      totalDays: approvedAgg.sum?.effectiveDays || 0
    },
    { 
      status: 'PENDING', 
      count: pendingAbsences, 
      percentage: totalAbsences > 0 ? Math.round((pendingAbsences / totalAbsences) * 100) : 0,
      totalDays: pendingAgg.sum?.effectiveDays || 0
    },
    { 
      status: 'REJECTED', 
      count: rejectedAbsences, 
      percentage: totalAbsences > 0 ? Math.round((rejectedAbsences / totalAbsences) * 100) : 0,
      totalDays: rejectedAgg.sum?.effectiveDays || 0
    },
    { 
      status: 'CANCELLED', 
      count: cancelledAbsences, 
      percentage: totalAbsences > 0 ? Math.round((cancelledAbsences / totalAbsences) * 100) : 0,
      totalDays: cancelledAgg.sum?.effectiveDays || 0
    }
  ].filter(s => s.count > 0);

  // ✅ RAW DATA PROCESSING (for complex grouping)
  const rawAbsences = aggregationResult?.employeeAbsences || [];
  // Note: rawEntitlements available if needed for future enhancements

  // Transform raw absence data to enhanced format for client-side grouping
  const enhancedAbsences = rawAbsences.map((absence: any) => ({
    ...absence,
    groupName: absence.type?.parentEntryId ? absenceGroups[absence.type.parentEntryId] || 'Unknown Group' : 'Unknown Group',
    typeName: absence.type?.translations?.find((t: any) => t.localeCode === 'en')?.value || absence.type?.value || 'Unknown Type',
    employeeName: `${absence.employee?.firstName || ''} ${absence.employee?.lastName || ''}`.trim(),
    departmentName: absence.employee?.employeePosition?.organizationalUnit?.name || 'No Department'
  }));

  // ✅ HYBRID PROCESSING (Client-side grouping of optimized data)
  const departmentStats = groupAbsencesByDepartment(enhancedAbsences);
  const monthlyData = groupAbsencesByMonth(enhancedAbsences, timeFilter);

  // ✅ TYPE BREAKDOWN (from enhanced raw data)
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

  const result: DashboardData = {
    // ✅ Server-aggregated core metrics (no client calculation needed)
    totalAbsences,
    pendingAbsences,
    approvedAbsences,
    rejectedAbsences,
    cancelledAbsences,
    averageDuration: Math.round(averageDuration * 100) / 100,
    approvalRate,

    // ✅ Server-aggregated vacation metrics (no client calculation needed)
    averageVacationDays: Math.round(averageVacationDays * 100) / 100,
    averageUsed: Math.round(averageUsed * 100) / 100,
    averagePending: Math.round(averagePending * 100) / 100,
    totalVacationLiability,

    // ✅ Hybrid-processed data (minimal client-side grouping)
    departmentStats,
    monthlyData,
    rawAbsences: enhancedAbsences,
    statusBreakdown,
    typeBreakdown,

    // ✅ Enhanced entitlements object (server-aggregated)
    entitlements: {
      averageVacationPerEmployee: Math.round(averageVacationDays * 100) / 100,
      totalActiveEmployees: vacationEmployeeCount,
      averageAvailable: Math.round(averageAvailable * 100) / 100,
      averageUsed: Math.round(averageUsed * 100) / 100,
      totalVacationLiability
    },

    isLoading: false,
    error: null
  };

  console.log('✅ Server-side aggregation processing complete:', {
    totalAbsences: result.totalAbsences,
    averageDuration: result.averageDuration,
    approvalRate: result.approvalRate,
    averageVacationDays: result.averageVacationDays,
    totalVacationLiability: result.totalVacationLiability,
    departmentStatsCount: result.departmentStats.length,
    monthlyDataCount: result.monthlyData.length,
    statusBreakdownCount: result.statusBreakdown.length,
    typeBreakdownCount: result.typeBreakdown.length
  });

  return result;
};

/**
 * ✅ MAIN: Enhanced Server-Side Aggregation Processor
 * 
 * Combines results from multiple optimized GraphQL aggregation queries
 * Processes both server-aggregated data and minimal client-side grouping
 */
export const processEnhancedServerSideAggregations = (
  departmentStatsResult: any,
  monthlyTrendsResult: any, 
  vacationMetricsResult: any,
  optimizedAbsenceResult: any,
  timeFilter: string,
  absenceGroups: Record<string, string> = {}
): DashboardData => {

  // ✅ PROCESS DEPARTMENT STATISTICS (Hybrid: Server aggregations + smart grouping)
  const departmentStats = processDepartmentStats(departmentStatsResult, absenceGroups);
  
  // ✅ PROCESS MONTHLY TRENDS (Hybrid: Server aggregations + optimized date grouping)
  const monthlyData = processMonthlyTrends(monthlyTrendsResult, timeFilter, absenceGroups);
  
  // ✅ PROCESS VACATION METRICS (Fully server-side)
  const vacationMetrics = processVacationMetrics(vacationMetricsResult);
  
  // ✅ PROCESS OPTIMIZED ABSENCE DATA (Enhanced raw data)
  const { rawAbsences, statusBreakdown, typeBreakdown } = processOptimizedAbsences(
    optimizedAbsenceResult, 
    absenceGroups
  );
  
  // ✅ CALCULATE REMAINING KPIs from aggregated data
  const totalAbsences = rawAbsences.length;
  const approvedAbsences = statusBreakdown.find(s => s.status === 'APPROVED')?.count || 0;
  const pendingAbsences = statusBreakdown.find(s => s.status === 'PENDING')?.count || 0;
  const rejectedAbsences = statusBreakdown.find(s => s.status === 'REJECTED')?.count || 0;
  const cancelledAbsences = statusBreakdown.find(s => s.status === 'CANCELLED')?.count || 0;
  
  const totalEffectiveDays = rawAbsences.reduce((sum: number, absence: any) => 
    sum + (absence.effectiveDays || 0), 0
  );
  const averageDuration = totalAbsences > 0 ? totalEffectiveDays / totalAbsences : 0;
  const approvalRate = totalAbsences > 0 ? Math.round((approvedAbsences / totalAbsences) * 100) : 0;

  const result: DashboardData = {
    // ✅ Core KPI metrics
    totalAbsences,
    pendingAbsences,
    approvedAbsences,
    rejectedAbsences,
    cancelledAbsences,
    averageDuration: Math.round(averageDuration * 100) / 100,
    approvalRate,

    // ✅ Server-processed vacation metrics  
    averageVacationDays: vacationMetrics.averageVacationDays,
    averageUsed: vacationMetrics.averageUsed,
    averagePending: vacationMetrics.averagePending,
    totalVacationLiability: vacationMetrics.totalVacationLiability,

    // ✅ Hybrid-processed data
    departmentStats,
    monthlyData,
    rawAbsences,
    statusBreakdown,
    typeBreakdown,

    // ✅ Enhanced entitlements data
    entitlements: {
      averageVacationPerEmployee: vacationMetrics.averageVacationDays,
      totalActiveEmployees: vacationMetrics.totalActiveEmployees,
      averageAvailable: vacationMetrics.averageAvailable,
      averageUsed: vacationMetrics.averageUsed,
      totalVacationLiability: vacationMetrics.totalVacationLiability
    },

    isLoading: false,
    error: null
  };

  return result;
};

/**
 * ✅ ENHANCED: Process Department Statistics
 * Combines server aggregations with smart client-side grouping for dynamic departments
 */
function processDepartmentStats(departmentStatsResult: any, absenceGroups: Record<string, string>) {
  const { 
    engineeringStats, 
    hrStats, 
    financeStats, 
    noDepartmentStats, 
    departmentData 
  } = departmentStatsResult;

  // Start with server-aggregated key departments
  const knownDepartments: Array<{
    name: string;
    totalRequests: number;
    totalDays: number;
    uniqueEmployees: number;
    avgDaysPerEmployee: number;
    avgRequestsPerEmployee: number;
  }> = [];
  
  if (engineeringStats?.aggregate?.count > 0) {
    knownDepartments.push({
      name: 'Engineering',
      totalRequests: engineeringStats.aggregate.count,
      totalDays: engineeringStats.aggregate.sum?.effectiveDays || 0,
      uniqueEmployees: 0, // Will be calculated below
      avgDaysPerEmployee: 0,
      avgRequestsPerEmployee: 0
    });
  }
  
  if (hrStats?.aggregate?.count > 0) {
    knownDepartments.push({
      name: 'HR',
      totalRequests: hrStats.aggregate.count,
      totalDays: hrStats.aggregate.sum?.effectiveDays || 0,
      uniqueEmployees: 0,
      avgDaysPerEmployee: 0,
      avgRequestsPerEmployee: 0
    });
  }
  
  if (financeStats?.aggregate?.count > 0) {
    knownDepartments.push({
      name: 'Finance',
      totalRequests: financeStats.aggregate.count,
      totalDays: financeStats.aggregate.sum?.effectiveDays || 0,
      uniqueEmployees: 0,
      avgDaysPerEmployee: 0,
      avgRequestsPerEmployee: 0
    });
  }
  
  if (noDepartmentStats?.aggregate?.count > 0) {
    knownDepartments.push({
      name: 'No Department',
      totalRequests: noDepartmentStats.aggregate.count,
      totalDays: noDepartmentStats.aggregate.sum?.effectiveDays || 0,
      uniqueEmployees: 0,
      avgDaysPerEmployee: 0,
      avgRequestsPerEmployee: 0
    });
  }

  // ✅ SMART: Use minimal data for complete department grouping + unique employee counting
  if (departmentData?.length > 0) {
    // Add groupName for enhanced absences
    const enhancedAbsences = departmentData.map((absence: any) => ({
      ...absence,
      groupName: absenceGroups[absence.type?.parentEntryId] || 'Unknown Group'
    }));
    
    // Use existing proven logic for complete department stats
    const allDepartmentStats = groupAbsencesByDepartment(enhancedAbsences);
    
    // Merge server aggregations with complete grouping
    const mergedStats = allDepartmentStats.map(dept => {
      const knownDept = knownDepartments.find(kd => 
        kd.name.toLowerCase().includes(dept.name.toLowerCase()) || 
        dept.name.toLowerCase().includes(kd.name.toLowerCase())
      );
      
      return {
        ...dept,
        // Use server aggregations when available for better accuracy
        totalRequests: knownDept?.totalRequests || dept.totalRequests,
        totalDays: knownDept?.totalDays || dept.totalDays
      };
    });
    
    return mergedStats.sort((a, b) => b.totalDays - a.totalDays);
  }

  // Fallback: Use only server aggregations
  return knownDepartments.sort((a, b) => b.totalDays - a.totalDays);
}

/**
 * ✅ ENHANCED: Process Monthly Trends  
 * Uses server aggregations + optimized client-side month grouping
 */
function processMonthlyTrends(monthlyTrendsResult: any, timeFilter: string, absenceGroups: Record<string, string>) {
  const { monthlyData } = monthlyTrendsResult;

  if (!monthlyData?.length) {
    return [];
  }

  // ✅ OPTIMIZED: Add groupName and use existing proven month grouping logic
  const enhancedAbsences = monthlyData.map((absence: any) => ({
    ...absence,
    groupName: absenceGroups[absence.type?.parentEntryId] || 'Unknown Group',
    // Add employee info for unique counting
    employee: { id: absence.employee?.id }
  }));

  // Use existing proven logic with enhanced data
  return groupAbsencesByMonth(enhancedAbsences, timeFilter);
}

/**
 * ✅ COMPLETE: Process Enhanced Vacation Metrics
 * Fully server-side vacation calculations - replaces calculateVacationMetrics()
 */
function processVacationMetrics(vacationMetricsResult: any) {
  const { vacationEntitlements, vacationLiabilityData } = vacationMetricsResult;

  const aggregateData = vacationEntitlements?.aggregate;
  
  if (!aggregateData || aggregateData.count === 0) {
    return {
      averageVacationDays: 0,
      averageUsed: 0,
      averagePending: 0,
      totalVacationLiability: 0,
      totalActiveEmployees: 0,
      averageAvailable: 0
    };
  }

  // ✅ SERVER-CALCULATED: All vacation metrics from aggregations
  const averageVacationDays = Math.round((aggregateData.avg?.total || 0) * 100) / 100;
  const averageUsed = Math.round((aggregateData.avg?.approved || 0) * 100) / 100;
  const averagePending = Math.round((aggregateData.avg?.pending || 0) * 100) / 100;
  const averageAvailable = Math.round((aggregateData.avg?.available || 0) * 100) / 100;
  
  // ✅ SERVER-CALCULATED: Vacation liability from raw data
  const totalVacationLiability = vacationLiabilityData?.reduce((sum: number, entitlement: any) => {
    const remaining = (entitlement.total || 0) - (entitlement.approved || 0) - (entitlement.pending || 0);
    return sum + Math.max(0, remaining);
  }, 0) || 0;

  return {
    averageVacationDays,
    averageUsed,
    averagePending,
    totalVacationLiability,
    totalActiveEmployees: aggregateData.count,
    averageAvailable
  };
}

/**
 * ✅ ENHANCED: Process Optimized Absence Data
 * Processes minimal absence data for UI components
 */
function processOptimizedAbsences(optimizedAbsenceResult: any, absenceGroups: Record<string, string>) {
  const absences = optimizedAbsenceResult?.absences || [];

  // ✅ ENHANCE: Add groupName to raw absences
  const rawAbsences = absences.map((absence: any) => ({
    ...absence,
    groupName: absenceGroups[absence.type?.parentEntryId] || 'Unknown Group',
    typeName: absence.type?.value || 'Unknown Type',
    employeeName: absence.employee?.displayName || 'Unknown Employee'
  }));

  // ✅ CALCULATE: Status breakdown for pie chart
  const statusMap = new Map();
  rawAbsences.forEach((absence: any) => {
    const status = absence.status || 'UNKNOWN';
    if (!statusMap.has(status)) {
      statusMap.set(status, { count: 0, totalDays: 0 });
    }
    const statusData = statusMap.get(status);
    statusData.count += 1;
    statusData.totalDays += absence.effectiveDays || 0;
  });

  const statusBreakdown = Array.from(statusMap.entries()).map(([status, data]: [string, any]) => ({
    status,
    count: data.count,
    totalDays: data.totalDays,
    percentage: rawAbsences.length > 0 ? Math.round((data.count / rawAbsences.length) * 100) : 0
  }));

  // ✅ CALCULATE: Type breakdown
  const typeMap = new Map();
  rawAbsences.forEach((absence: any) => {
    const type = absence.groupName || 'Unknown Group';
    if (!typeMap.has(type)) {
      typeMap.set(type, { count: 0, totalDays: 0 });
    }
    const typeData = typeMap.get(type);
    typeData.count += 1;
    typeData.totalDays += absence.effectiveDays || 0;
  });

  const typeBreakdown = Array.from(typeMap.entries()).map(([type, data]: [string, any]) => ({
    type,
    count: data.count,
    totalDays: data.totalDays
  }));

  return {
    rawAbsences,
    statusBreakdown,
    typeBreakdown
  };
}

/**
 * ✅ LEGACY: Original server-side aggregation processor (keep for compatibility)
 * 
 * Maintained for backward compatibility until migration is complete
 */
export const processServerSideAggregations = (
  kpiResult: any, 
  entitlementsResult: any, 
  hybridResult: any, 
  timeFilter: string,
  absenceGroups: Record<string, string> = {}
): DashboardData => {
  // ✅ PROCESS KPI AGGREGATIONS
  const totalAbsencesData = kpiResult.totalAbsences?.aggregate || {};
  const approvedData = kpiResult.approvedAbsences?.aggregate || {};
  const pendingData = kpiResult.pendingAbsences?.aggregate || {};
  const rejectedData = kpiResult.rejectedAbsences?.aggregate || {};
  const cancelledData = kpiResult.cancelledAbsences?.aggregate || {};

  // Core metrics
  const totalAbsences = totalAbsencesData.count || 0;
  const approvedAbsences = approvedData.count || 0;
  const pendingAbsences = pendingData.count || 0;
  const rejectedAbsences = rejectedData.count || 0;
  const cancelledAbsences = cancelledData.count || 0;
  
  // CRITICAL: UI expects 'averageDuration' (not 'avgDuration')
  const averageDuration = totalAbsencesData.avg?.effectiveDays || 0;
  const approvalRate = totalAbsences > 0 ? Math.round((approvedAbsences / totalAbsences) * 100) : 0;

  
  // ✅ PROCESS VACATION ENTITLEMENTS
  const entitlementsData = entitlementsResult.vacationEntitlements?.aggregate || {};
  const entitlementsCount = entitlementsData.count || 0;
  const totalVacationDays = entitlementsData.sum?.total || 0;
  const totalUsedDays = entitlementsData.sum?.approved || 0;
  const totalPendingDays = entitlementsData.sum?.pending || 0;
  
  const averageVacationDays = entitlementsCount > 0 ? Math.round((totalVacationDays / entitlementsCount) * 100) / 100 : 0;
  const averageUsed = entitlementsCount > 0 ? Math.round((totalUsedDays / entitlementsCount) * 100) / 100 : 0;
  const averagePending = entitlementsCount > 0 ? Math.round((totalPendingDays / entitlementsCount) * 100) / 100 : 0;
  
  // Calculate vacation liability (remaining days)
  const totalVacationLiability = Math.max(0, totalVacationDays - totalUsedDays - totalPendingDays);
  const averageAvailable = averageVacationDays - averageUsed - averagePending;

  // ✅ PROCESS HYBRID DATA (Client-side grouping with enhanced absences)
  const rawAbsences = hybridResult?.absences || [];
  const enhancedAbsences = rawAbsences.map((absence: any) => ({
    ...absence,
    groupName: absenceGroups[absence.type?.parentEntryId] || 'Unknown Group'
  }));

  // Apply existing business logic for department and monthly grouping
  const departmentStats = groupAbsencesByDepartment(enhancedAbsences);
  const monthlyData = groupAbsencesByMonth(enhancedAbsences, timeFilter);

  // ✅ STATUS BREAKDOWN for pie chart
  const statusBreakdown = [
    {
      status: 'APPROVED',
      count: approvedAbsences,
      totalDays: approvedData.sum?.effectiveDays || 0,
      percentage: totalAbsences > 0 ? Math.round((approvedAbsences / totalAbsences) * 100) : 0
    },
    {
      status: 'PENDING',
      count: pendingAbsences,
      totalDays: pendingData.sum?.effectiveDays || 0,
      percentage: totalAbsences > 0 ? Math.round((pendingAbsences / totalAbsences) * 100) : 0
    },
    {
      status: 'REJECTED',
      count: rejectedAbsences,
      totalDays: rejectedData.sum?.effectiveDays || 0,
      percentage: totalAbsences > 0 ? Math.round((rejectedAbsences / totalAbsences) * 100) : 0
    },
    {
      status: 'CANCELLED',
      count: cancelledAbsences,
      totalDays: cancelledData.sum?.effectiveDays || 0,
      percentage: totalAbsences > 0 ? Math.round((cancelledAbsences / totalAbsences) * 100) : 0
    }
  ];

  // ✅ TYPE BREAKDOWN (computed from raw data)
  const typeBreakdown = Object.entries(
    enhancedAbsences.reduce((acc: any, absence: any) => {
      const groupName = absence.groupName || 'Unknown Group';
      if (!acc[groupName]) {
        acc[groupName] = { count: 0, totalDays: 0 };
      }
      acc[groupName].count += 1;
      acc[groupName].totalDays += absence.effectiveDays || 0;
      return acc;
    }, {})
  ).map(([type, data]: [string, any]) => ({
    type,
    count: data.count,
    totalDays: data.totalDays
  }));

  // ✅ FINAL RESULT: Complete dashboard data with exact UI compatibility
  const result: DashboardData = {
    // Core metrics
    totalAbsences,
    pendingAbsences,
    approvedAbsences,
    rejectedAbsences,
    cancelledAbsences,
    averageDuration: Math.round(averageDuration * 100) / 100,
    approvalRate,

    // Vacation metrics
    averageVacationDays,
    averageUsed,
    averagePending,
    totalVacationLiability,

    // Grouped data
    departmentStats,
    monthlyData,
    rawAbsences: enhancedAbsences,
    statusBreakdown,
    typeBreakdown,

    // Entitlements
    entitlements: {
      averageVacationPerEmployee: averageVacationDays,
      totalActiveEmployees: entitlementsCount,
      averageAvailable,
      averageUsed,
      totalVacationLiability
    },

    isLoading: false,
    error: null
  };

  return result;
}; 