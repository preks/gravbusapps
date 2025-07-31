/**
 * Server-Side Aggregation Processing Utilities
 * Transforms GraphQL aggregation results into dashboard-ready data
 * 
 * Based on comprehensive UI analysis - see SERVER_SIDE_AGGREGATIONS_DOCUMENTATION.md
 */

import { groupAbsencesByDepartment, groupAbsencesByMonth } from './index';
import { DashboardData } from '../types';

/**
 * ✅ MAIN PROCESSING FUNCTION - Transform Server Aggregations to UI Format
 * This is the missing function that was referenced in useDashboardData
 * 
 * @param kpiResult - Result from getDashboardKPIAggregations
 * @param entitlementsResult - Result from getVacationEntitlementsAggregations  
 * @param hybridResult - Result from getHybridAbsenceData
 * @param timeFilter - Current time filter for processing
 * @returns Complete DashboardData object matching UI expectations
 */
export const processServerSideAggregations = (
  kpiResult: any, 
  entitlementsResult: any, 
  hybridResult: any, 
  timeFilter: string,
  absenceGroups: Record<string, string> = {}
): DashboardData => {
  console.log('🚀 Processing server-side aggregations:', {
    kpiResult: !!kpiResult,
    entitlementsResult: !!entitlementsResult,
    hybridResult: hybridResult?.absences?.length || 0,
    timeFilter
  });

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

  console.log('📊 KPI metrics calculated:', {
    totalAbsences,
    approvedAbsences,
    pendingAbsences,
    rejectedAbsences,
    cancelledAbsences,
    averageDuration: averageDuration.toFixed(2),
    approvalRate: `${approvalRate}%`
  });

  // ✅ PROCESS VACATION ENTITLEMENTS
  const vacationData = entitlementsResult.vacationEntitlements?.aggregate || {};
  const entitlementsCount = vacationData.count || 0;
  
  const averageVacationDays = vacationData.avg?.total || 0;
  const averageUsed = vacationData.avg?.approved || 0;
  const averagePending = vacationData.avg?.pending || 0;
  
  // Calculate vacation liability (total remaining days)
  const totalVacationDays = vacationData.sum?.total || 0;
  const totalUsedDays = vacationData.sum?.approved || 0;
  const totalPendingDays = vacationData.sum?.pending || 0;
  const totalVacationLiability = Math.max(0, totalVacationDays - totalUsedDays - totalPendingDays);
  
  // Calculate average available per employee
  const averageAvailable = averageVacationDays - averageUsed - averagePending;

  console.log('🏖️ Vacation metrics calculated:', {
    entitlementsCount,
    averageVacationDays: averageVacationDays.toFixed(1),
    averageUsed: averageUsed.toFixed(1),
    averagePending: averagePending.toFixed(1),
    averageAvailable: averageAvailable.toFixed(1),
    totalVacationLiability
  });

  // ✅ PROCESS HYBRID DATA (Client-side grouping with enhanced absences)
  const rawAbsences = hybridResult.absences || [];
  
  // Enhance absences with computed fields for grouping
  const enhancedAbsences = rawAbsences.map((absence: any) => ({
    ...absence,
    employeeName: `${absence.employee?.firstName || ''} ${absence.employee?.lastName || ''}`.trim(),
    groupName: (absence.type?.parentEntryId && absenceGroups[absence.type.parentEntryId]) || absence.type?.value || 'Unknown Group',
    typeName: absence.type?.value || 'Unknown Type'
  }));

  // Apply existing business logic for department and monthly grouping
  const departmentStats = groupAbsencesByDepartment(enhancedAbsences);
  const monthlyData = groupAbsencesByMonth(enhancedAbsences, timeFilter);

  console.log('🏢 Hybrid processing completed:', {
    enhancedAbsences: enhancedAbsences.length,
    departmentStats: departmentStats.length,
    monthlyData: monthlyData.length
  });

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
  ].filter(status => status.count > 0); // Only include statuses with data

  // ✅ TYPE BREAKDOWN from enhanced absences
  const typeCounts = enhancedAbsences.reduce((acc: Record<string, { count: number; totalDays: number }>, absence: any) => {
    const type = absence.typeName || 'Unknown';
    if (!acc[type]) {
      acc[type] = { count: 0, totalDays: 0 };
    }
    acc[type].count += 1;
    acc[type].totalDays += absence.effectiveDays || 0;
    return acc;
  }, {});

  const typeBreakdown = Object.entries(typeCounts).map(([type, data]) => ({
    type,
    count: (data as { count: number; totalDays: number }).count,
    totalDays: (data as { count: number; totalDays: number }).totalDays
  }));

  // ✅ CRITICAL: Fix monthlyData to use 'total' field name (not 'totalRequests')
  const formattedMonthlyData = monthlyData.map(month => ({
    month: month.month,
    total: month.totalRequests, // ✅ UI expects 'total' field
    uniqueEmployees: month.uniqueEmployees,
    avgRequestsPerEmployee: month.avgRequestsPerEmployee,
    avgDurationPerRequest: month.avgDurationPerRequest,
    totalDuration: month.totalDuration,
    typeBreakdown: month.typeBreakdown
  }));

  // ✅ RETURN COMPLETE DASHBOARD DATA STRUCTURE
  const result: DashboardData = {
    // Core metrics (matching UI expectations exactly)
    totalAbsences,
    pendingAbsences,
    approvedAbsences,
    rejectedAbsences,
    cancelledAbsences,
    averageDuration: Math.round(averageDuration * 100) / 100, // Round to 2 decimals
    approvalRate,

    // Vacation metrics  
    averageVacationDays: Math.round(averageVacationDays * 100) / 100,
    averageUsed: Math.round(averageUsed * 100) / 100,
    averagePending: Math.round(averagePending * 100) / 100,
    totalVacationLiability,

    // Grouped data
    departmentStats,
    monthlyData: formattedMonthlyData, // ✅ Using correct field names

    // Raw data for drill-downs
    rawAbsences: enhancedAbsences,

    // Chart data
    statusBreakdown,
    typeBreakdown,

    // Entitlements object (used by vacation cards)
    entitlements: {
      averageVacationPerEmployee: Math.round(averageVacationDays * 100) / 100,
      totalActiveEmployees: entitlementsCount,
      averageAvailable: Math.round(averageAvailable * 100) / 100,
      averageUsed: Math.round(averageUsed * 100) / 100,
      totalVacationLiability
    },

    // Loading states
    isLoading: false,
    error: null
  };

  console.log('✅ Server-side aggregation processing complete:', {
    totalAbsences: result.totalAbsences,
    averageDuration: result.averageDuration,
    departmentStats: result.departmentStats.length,
    monthlyData: result.monthlyData.length,
    statusBreakdown: result.statusBreakdown.length,
    totalVacationLiability: result.totalVacationLiability
  });

  return result;
};

// ✅ EXISTING FUNCTIONS (keep as-is for backward compatibility)

// ✅ Process Server-Side KPI Aggregations
export const processKPIAggregations = (aggregationResult: any) => {
  const {
    totalAbsences,
    approvedAbsences,
    pendingAbsences,
    rejectedAbsences,
    draftAbsences,
    activeEmployees
  } = aggregationResult;

  // Calculate KPIs from server aggregations
  const totalAbsencesCount = totalAbsences?.aggregate?.count || 0;
  const totalEffectiveDays = totalAbsences?.aggregate?.sum?.effectiveDays || 0;
  const avgDuration = totalAbsences?.aggregate?.avg?.effectiveDays || 0;
  const activeEmployeesCount = activeEmployees?.aggregate?.count || 0;

  // Status breakdown from server aggregations
  const statusBreakdown = [
    {
      status: 'APPROVED',
      count: approvedAbsences?.aggregate?.count || 0,
      totalDays: approvedAbsences?.aggregate?.sum?.effectiveDays || 0,
      color: '#52c41a'
    },
    {
      status: 'PENDING',
      count: pendingAbsences?.aggregate?.count || 0,
      totalDays: pendingAbsences?.aggregate?.sum?.effectiveDays || 0,
      color: '#faad14'
    },
    {
      status: 'REJECTED',
      count: rejectedAbsences?.aggregate?.count || 0,
      totalDays: rejectedAbsences?.aggregate?.sum?.effectiveDays || 0,
      color: '#ff4d4f'
    },
    {
      status: 'DRAFT',
      count: draftAbsences?.aggregate?.count || 0,
      totalDays: draftAbsences?.aggregate?.sum?.effectiveDays || 0,
      color: '#d9d9d9'
    }
  ];

  return {
    totalAbsences: totalAbsencesCount,
    totalEffectiveDays,
    avgDuration: Math.round(avgDuration * 100) / 100,
    activeEmployeesCount,
    statusBreakdown,
    
    // Additional metrics
    absencesPerEmployee: activeEmployeesCount > 0 ? 
      Math.round((totalAbsencesCount / activeEmployeesCount) * 100) / 100 : 0,
    avgDaysPerEmployee: activeEmployeesCount > 0 ? 
      Math.round((totalEffectiveDays / activeEmployeesCount) * 100) / 100 : 0,
  };
};

// ✅ Process Server-Side Vacation Entitlements
export const processVacationEntitlementsAggregations = (aggregationResult: any) => {
  const { vacationEntitlements, allEntitlements, activeEmployees } = aggregationResult;

  const vacationData = vacationEntitlements?.aggregate;
  const activeEmployeesCount = activeEmployees?.aggregate?.count || 0;

  if (!vacationData) {
    return {
      averageVacationDays: 0,
      averageUsed: 0,
      averagePending: 0,
      totalVacationLiability: 0,
      vacationEntitlementsCount: 0,
      totalEntitlementsCount: allEntitlements?.aggregate?.count || 0
    };
  }

  const totalVacationDays = vacationData.sum?.total || 0;
  const totalUsedDays = vacationData.sum?.approved || 0;
  const totalPendingDays = vacationData.sum?.pending || 0;
  const entitlementsCount = vacationData.count || 0;

  // Calculate vacation liability (remaining days)
  const totalVacationLiability = Math.max(0, totalVacationDays - totalUsedDays - totalPendingDays);

  return {
    averageVacationDays: entitlementsCount > 0 ? 
      Math.round((totalVacationDays / entitlementsCount) * 100) / 100 : 0,
    averageUsed: entitlementsCount > 0 ? 
      Math.round((totalUsedDays / entitlementsCount) * 100) / 100 : 0,
    averagePending: entitlementsCount > 0 ? 
      Math.round((totalPendingDays / entitlementsCount) * 100) / 100 : 0,
    totalVacationLiability,
    vacationEntitlementsCount: entitlementsCount,
    totalEntitlementsCount: allEntitlements?.aggregate?.count || 0,
    activeEmployeesCount
  };
};

// ✅ Hybrid Processing: Server Aggregations + Client Grouping
export const processHybridDashboardData = (aggregationResult: any, catalogMaps: any) => {
  const { rawAbsences, ...aggregations } = aggregationResult;

  console.log('🚀 Processing Hybrid Dashboard Data', {
    totalAggregations: Object.keys(aggregations).length,
    rawAbsencesCount: rawAbsences?.length || 0,
    catalogs: {
      absenceGroups: Object.keys(catalogMaps.absenceGroupsMap || {}).length,
      absenceTypes: Object.keys(catalogMaps.absenceTypesMap || {}).length
    }
  });

  // ✅ SERVER-SIDE: Process KPI aggregations
  const kpiData = processKPIAggregations(aggregations);

  // ✅ SERVER-SIDE: Process vacation entitlements
  const vacationData = processVacationEntitlementsAggregations(aggregations);

  // ✅ CLIENT-SIDE: Process department grouping (using existing utilities)
  const departmentStats = rawAbsences ? 
    groupAbsencesByDepartment(rawAbsences.map((absence: any) => ({
      ...absence,
      groupName: catalogMaps.absenceGroupsMap[absence.type?.parentEntry?.id] || 'Unknown Group'
    }))) : [];

  // ✅ CLIENT-SIDE: Process monthly trends (using existing utilities)
  const monthlyData = rawAbsences ? 
    groupAbsencesByMonth(rawAbsences.map((absence: any) => ({
      ...absence,
      groupName: catalogMaps.absenceGroupsMap[absence.type?.parentEntry?.id] || 'Unknown Group'
    }))) : [];

  // ✅ CLIENT-SIDE: Enhanced type breakdown using server data
  const typeBreakdown = kpiData.statusBreakdown.reduce((acc: any, status: any) => {
    acc[status.status] = status.count;
    return acc;
  }, {});

  console.log('✅ Hybrid Processing Complete', {
    serverSideKPIs: {
      totalAbsences: kpiData.totalAbsences,
      avgDuration: kpiData.avgDuration,
      statusBreakdown: kpiData.statusBreakdown.length
    },
    serverSideVacation: {
      averageVacationDays: vacationData.averageVacationDays,
      totalLiability: vacationData.totalVacationLiability
    },
    clientSideGrouping: {
      departmentStats: departmentStats.length,
      monthlyData: monthlyData.length
    }
  });

  return {
    // Raw data (for drill-downs)
    rawAbsences: rawAbsences || [],
    
    // Server-side aggregated KPIs
    totalAbsences: kpiData.totalAbsences,
    avgDuration: kpiData.avgDuration,
    absencesPerEmployee: kpiData.absencesPerEmployee,
    avgDaysPerEmployee: kpiData.avgDaysPerEmployee,
    
    // Server-side vacation metrics
    ...vacationData,
    
    // Client-side grouped data (for charts)
    departmentStats,
    monthlyData,
    typeBreakdown,
    
    // Status breakdown for pie chart
    statusBreakdown: kpiData.statusBreakdown,
    
    // Additional metrics
    activeEmployeesCount: kpiData.activeEmployeesCount,
    totalEffectiveDays: kpiData.totalEffectiveDays
  };
};

// ✅ Data Validation & Comparison
export const validateServerClientConsistency = (serverData: any, clientData: any) => {
  const serverTotal = serverData.totalAbsences || 0;
  const clientTotal = clientData.totalAbsences || 0;
  const difference = Math.abs(serverTotal - clientTotal);
  const tolerance = 0.01; // Allow small rounding differences

  console.log('🔍 Server vs Client Data Validation', {
    server: {
      totalAbsences: serverTotal,
      avgDuration: serverData.avgDuration
    },
    client: {
      totalAbsences: clientTotal,
      avgDuration: clientData.avgDuration
    },
    difference,
    isConsistent: difference <= tolerance
  });

  return {
    isConsistent: difference <= tolerance,
    difference,
    details: {
      server: serverTotal,
      client: clientTotal,
      tolerance
    }
  };
};

// ✅ Performance Metrics
export const measureAggregationPerformance = (startTime: number, dataSize: number) => {
  const endTime = performance.now();
  const processingTime = endTime - startTime;
  const throughput = dataSize > 0 ? (dataSize / processingTime) * 1000 : 0;

  console.log('📈 Aggregation Performance Metrics', {
    processingTime: `${processingTime.toFixed(2)}ms`,
    dataSize: `${dataSize} records`,
    throughput: `${throughput.toFixed(0)} records/second`,
    efficiency: processingTime < 100 ? 'Excellent' : processingTime < 500 ? 'Good' : 'Needs Optimization'
  });

  return {
    processingTime,
    dataSize,
    throughput,
    efficiency: processingTime < 100 ? 'Excellent' : processingTime < 500 ? 'Good' : 'Needs Optimization'
  };
}; 