/**
 * Server-Side Aggregation Processing Utilities
 * Transforms GraphQL aggregation results into dashboard-ready data
 */

import { groupAbsencesByDepartment, groupAbsencesByMonth } from './index';

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