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
import { groupAbsencesByDepartment, groupAbsencesByMonth, calculateVacationMetrics } from './index';



/**
 * ✅ NEW: Process Complete Server-Side Aggregations
 * Handles the new getCompleteAggregationsQuery that combines all aggregations in one query
 */
export const processCompleteServerSideAggregations = (
  aggregationResult: any,
  absenceGroups: Record<string, string>,
  timeFilter: string
): DashboardData => {
  
  // ✅ STATUS BREAKDOWN (from server aggregations)
  const approvedCount = aggregationResult.approvedAbsences?.aggregate?.count || 0;
  const pendingCount = aggregationResult.pendingAbsences?.aggregate?.count || 0;
  const rejectedCount = aggregationResult.rejectedAbsences?.aggregate?.count || 0;
  const cancelledCount = aggregationResult.cancelledAbsences?.aggregate?.count || 0;
  
  const totalAbsencesCount = aggregationResult.totalAbsences?.aggregate?.count || 0;
  
  const statusBreakdown = [
    {
      status: 'APPROVED',
      count: approvedCount,
      totalDays: aggregationResult.approvedAbsences?.aggregate?.sum?.effectiveDays || 0,
      percentage: totalAbsencesCount > 0 ? Math.round((approvedCount / totalAbsencesCount) * 100) : 0
    },
    {
      status: 'PENDING',
      count: pendingCount,
      totalDays: aggregationResult.pendingAbsences?.aggregate?.sum?.effectiveDays || 0,
      percentage: totalAbsencesCount > 0 ? Math.round((pendingCount / totalAbsencesCount) * 100) : 0
    },
    {
      status: 'REJECTED',
      count: rejectedCount,
      totalDays: aggregationResult.rejectedAbsences?.aggregate?.sum?.effectiveDays || 0,
      percentage: totalAbsencesCount > 0 ? Math.round((rejectedCount / totalAbsencesCount) * 100) : 0
    },
    {
      status: 'CANCELLED',
      count: cancelledCount,
      totalDays: aggregationResult.cancelledAbsences?.aggregate?.sum?.effectiveDays || 0,
      percentage: totalAbsencesCount > 0 ? Math.round((cancelledCount / totalAbsencesCount) * 100) : 0
    }
  ];

  // ✅ VACATION ENTITLEMENTS (HYBRID APPROACH - Use frontend calculation on raw data)
  const rawEntitlements = aggregationResult?.EmployeeAbsenceEntitlement || [];
  const vacationMetrics = calculateVacationMetrics(rawEntitlements);

  // ✅ CORE KPIs (from server aggregations)
  const totalAbsencesDays = aggregationResult.totalAbsences?.aggregate?.sum?.effectiveDays || 0;
  const averageDuration = Math.round((aggregationResult.totalAbsences?.aggregate?.avg?.effectiveDays || 0) * 100) / 100;
  
  // Calculate approval rate from status breakdown
  const approvalRate = totalAbsencesCount > 0 ? Math.round((approvedCount / totalAbsencesCount) * 100) : 0;

  // ✅ RESTORE RAW DATA PROCESSING (needed for frontend calculations per documentation)
  const rawAbsences = aggregationResult?.employeeAbsences || [];

  // Transform raw absence data to enhanced format for frontend calculations (RESTORED)
  const enhancedAbsences = rawAbsences.map((absence: any) => ({
    ...absence,
    groupName: absenceGroups[absence.type?.parentEntryId] || 'Other',
    typeName: absence.type?.value || 'Unknown',
    employeeName: absence.employee?.displayName || 'Unknown',
    departmentName: absence.employee?.employeePosition?.organizationalUnit?.name || 'No Department'
  }));

  // Use frontend calculations for departments and monthly trends (per documentation analysis)
  const departmentStatistics = groupAbsencesByDepartment(enhancedAbsences);
  const monthlyTrends = groupAbsencesByMonth(enhancedAbsences, timeFilter);
  
  // ✅ TYPE BREAKDOWN (from minimal raw data - will be server-side later)
  const typeBreakdown = Object.entries(
    rawAbsences.reduce((acc: any, absence: any) => {
      const groupName = absenceGroups[absence.type?.parentEntryId] || 'Other';
      if (!acc[groupName]) {
        acc[groupName] = { count: 0, totalDays: 0 };
      }
      acc[groupName].count++;
      acc[groupName].totalDays += (absence.effectiveDays || absence.calendarDays || 0);
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
    totalAbsences: totalAbsencesCount,
    pendingAbsences: pendingCount,
    approvedAbsences: approvedCount,
    rejectedAbsences: rejectedCount,
    cancelledAbsences: cancelledCount,
    averageDuration,
    approvalRate,
    
    // Vacation metrics (server-side aggregated)
    ...vacationMetrics,
    
    // Breakdown data
    statusBreakdown,
    typeBreakdown,
    departmentStats: departmentStatistics,
    monthlyData: monthlyTrends,
    rawAbsences: enhancedAbsences,
    
    // Entitlements data structure required by interface
    entitlements: {
      averageVacationPerEmployee: vacationMetrics.averageVacationDays,
      totalActiveEmployees: vacationMetrics.totalActiveEmployees || 0,
      averageAvailable: vacationMetrics.averageAvailable || 0,
      averageUsed: vacationMetrics.averageUsed,
      totalVacationLiability: vacationMetrics.totalVacationLiability || 0
    },
    
    // Loading states
    isLoading: false,
    error: null
  };

  return result;
}; 