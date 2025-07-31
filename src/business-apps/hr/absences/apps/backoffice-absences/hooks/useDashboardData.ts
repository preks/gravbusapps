import { useState, useEffect, useCallback } from 'react';
import { useGraphQLClient } from '../../../../../../common/network/graphql/useGraphQLClient';
import { useCatalogManagerClient } from '../../../../../../common/network/catalogs/useCatalogManagerClient';
import { DashboardDataProps, DashboardData } from '../types';
import { getDashboardQuery, getDateFilters } from '../queries';







export const useDashboardData = ({ accessToken, timeFilter = 'current-year' }: DashboardDataProps) => {
  const graphQLClient = useGraphQLClient(accessToken);
  const catalogClient = useCatalogManagerClient(accessToken);
  const [data, setData] = useState<DashboardData>({
    totalAbsences: 0,
    pendingAbsences: 0,
    approvedAbsences: 0,
    rejectedAbsences: 0,
    averageDuration: 0,
    approvalRate: 0,
    rawAbsences: [], // 🚀 Initialize empty array for filtered absences
    averageVacationDays: 0,
    averageUsed: 0,
    averagePending: 0,
    totalVacationLiability: 0,
    departmentStats: [],
    monthlyData: [],
    statusBreakdown: [],
    typeBreakdown: [],
    entitlements: {
      averageVacationPerEmployee: 0,
      totalActiveEmployees: 0,
      averageAvailable: 0,
      averageUsed: 0
    },
    isLoading: true,
    error: null
  });

  const fetchDashboardData = useCallback(async () => {
    if (!accessToken) return;

    setData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // 🔧 FIX: Set access token for catalog client
      catalogClient.setAccessToken(accessToken);
      
      // Fetch both absence groups AND absence types from catalogs with correct parameters
      console.log('🔍 Fetching absence catalogs with proper auth parameters...');
      const [groupsCatalogData, typesCatalogData] = await Promise.all([
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: "AbsenceGroup", version: "v1" },
          { limit: 100, offset: 0, returnTotalRecords: true }
        ),
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: "AbsenceType", version: "v1" },
          { limit: 100, offset: 0, returnTotalRecords: true }
        )
      ]);
      
      const groupsMap: { [key: string]: string } = {};
      groupsCatalogData.data.forEach((entry: any) => {
        groupsMap[entry.id] = entry.value;
        if (entry.catalogEntryLocalId) {
          groupsMap[entry.catalogEntryLocalId] = entry.value;
        }
      });
      
      const typesMap: { [key: string]: string } = {};
      typesCatalogData.data.forEach((entry: any) => {
        typesMap[entry.id] = entry.value;
        if (entry.catalogEntryLocalId) {
          typesMap[entry.catalogEntryLocalId] = entry.value;
        }
      });
      
      console.log('✅ Absence catalogs loaded:', {
        groups: Object.keys(groupsMap).length,
        types: Object.keys(typesMap).length,
        groupsMap,
        typesMap
      });

      // Fetch dashboard data with time filtering
      console.log('🔄 Fetching dashboard data with time filter:', timeFilter);
      graphQLClient.setAccessToken(accessToken);
      const dateFilters = getDateFilters(timeFilter);
      console.log('📅 Date filters applied:', dateFilters);
      
      // 🚀 OVERLAP LOGIC DEBUG
      console.log('🎯 CROSS-MONTH ABSENCE HANDLING - OVERLAP LOGIC ENABLED:', {
        previousLogic: 'startDate >= filterStart AND endDate <= filterEnd (restrictive)',
        newLogic: 'startDate <= filterEnd AND endDate >= filterStart (overlap)',
        crossMonthExamples: {
          'Dec 28 → Jan 5': '✅ Now included in January (previously excluded)',
          'Jan 28 → Feb 3': '✅ Now included in January (previously excluded)',
          'Dec 15 → Feb 10': '✅ Now included in January (previously excluded)',
          'Jan 10 → Jan 15': '✅ Still included in January (was always included)'
        },
        expectedResult: 'Chart (37) and list (35) should now match!'
      });
      
      const query = getDashboardQuery(timeFilter);
      const result = await graphQLClient.request(query);

      const rawAbsences = result?.employeeAbsences || [];
      const entitlements = result?.EmployeeAbsenceEntitlement || [];

      // CRITICAL: Enrich absences with all fields needed for dashboard and AbsenceList
      const absences = rawAbsences.map((absence: any) => ({
        ...absence,
        groupName: groupsMap[absence.type?.parentEntryId] || absence.type?.value || 'Unknown Group',
        typeName: typesMap[absence.type?.id] || typesMap[absence.type?.catalogEntryLocalId] || absence.type?.value || 'Unknown Type',
        // Additional fields for AbsenceList compatibility
        employeeName: `${absence.employee?.firstName || ''} ${absence.employee?.lastName || ''}`.trim() || 'Unknown Employee',
        pictureThumbnail: absence.employee?.pictureThumbnail || '',
        createdAt: absence.createdAt || absence.startDate // fallback to startDate if createdAt missing
      }));

      // DEBUG: Check January data specifically  
      const januaryAbsences = absences.filter((a: any) => {
        const date = new Date(a.startDate);
        return date.getMonth() === 0; // January = 0
      });
      
      const january2025 = januaryAbsences.filter((a: any) => {
        const date = new Date(a.startDate);
        return date.getFullYear() === 2025;
      });
      
      const january2024 = januaryAbsences.filter((a: any) => {
        const date = new Date(a.startDate);
        return date.getFullYear() === 2024;
      });

      console.log('📊 Raw GraphQL Results + January Analysis:', {
        timeFilter,
        absenceCount: rawAbsences.length,
        entitlementCount: entitlements.length,
        dateRange: dateFilters ? `${dateFilters.startDate.split('T')[0]} to ${dateFilters.endDate.split('T')[0]}` : 'All time',
        januaryAnalysis: {
          totalJanuaryAbsences: januaryAbsences.length,
          january2025Count: january2025.length,
          january2024Count: january2024.length,
          sampleJan2025: january2025.slice(0, 2).map((a: any) => ({
            id: a.id,
            startDate: a.startDate,
            year: new Date(a.startDate).getFullYear()
          })),
          sampleJan2024: january2024.slice(0, 2).map((a: any) => ({
            id: a.id,
            startDate: a.startDate,
            year: new Date(a.startDate).getFullYear()
          }))
        },
        possibleIssue: january2024.length > 0 ? '⚠️ Found January 2024 data - these should be excluded by year filter' : '✅ No 2024 data found'
      });

      // NOTE: absences already enriched above with groupName from catalog mapping

      console.log('📊 Dashboard data loaded with filter:', {
        timeFilter,
        dateFilters,
        totalAbsences: absences.length,
        totalEntitlements: entitlements.length,
        absenceGroups: Object.keys(groupsMap),
        groupsMap,
        sampleAbsenceStructure: absences.slice(0, 2).map((a: any) => ({ 
          id: a.id, 
          startDate: a.startDate, 
          status: a.status,
          rawType: {
            id: a.type?.id,
            value: a.type?.value,
            parentEntryId: a.type?.parentEntryId,
            catalogEntryLocalId: a.type?.catalogEntryLocalId
          },
          groupName: a.groupName,
          typeName: a.typeName,
          // 🚀 Enhanced fields for AbsenceList compatibility
          employeeName: a.employeeName,
          hasCreatedAt: !!a.createdAt,
          totalFieldCount: Object.keys(a).length
        })),
        allAbsenceTypesFromCatalog: [...new Set(absences.map((a: any) => a.typeName))],
        allAbsenceGroupsFromCatalog: [...new Set(absences.map((a: any) => a.groupName))],
        rawAbsenceTypeValues: [...new Set(absences.map((a: any) => a.type?.value))]
      });

      // Calculate absence metrics - ALL BASED ON FILTERED DATA ONLY
      const totalAbsences = absences.length;
      const pendingAbsences = absences.filter((a: any) => a.status === 'PENDING').length;
      const approvedAbsences = absences.filter((a: any) => a.status === 'APPROVED').length;
      const rejectedAbsences = absences.filter((a: any) => a.status === 'REJECTED').length;
      
      const approvalRate = totalAbsences > 0 ? Math.round((approvedAbsences / totalAbsences) * 100) : 0;
      
      // Calculate average duration from FILTERED absences only
      const absencesWithDuration = absences.filter((a: any) => (a.effectiveDays || a.calendarDays) > 0);
      const totalDuration = absencesWithDuration.reduce((sum: number, a: any) => sum + (a.effectiveDays || a.calendarDays || 0), 0);
      const averageDuration = absencesWithDuration.length > 0 ? Math.round(totalDuration / absencesWithDuration.length * 10) / 10 : 0;

      // DEBUG: Monthly breakdown to check January specifically
      const monthlyDebugBreakdown: { [month: string]: number } = {};
      absences.forEach((absence: any) => {
        const date = new Date(absence.startDate);
        const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()];
        monthlyDebugBreakdown[monthName] = (monthlyDebugBreakdown[monthName] || 0) + 1;
      });

      console.log('🧮 Dashboard Calculations Summary:', {
        dataSource: 'EmployeeAbsence GraphQL table',
        timeFilter,
        dateRange: dateFilters ? `${dateFilters.startDate.split('T')[0]} to ${dateFilters.endDate.split('T')[0]}` : 'All time',
        totalAbsences,
        approvalRate: `${approvalRate}% (${approvedAbsences} approved of ${totalAbsences})`,
        averageDuration: `${averageDuration} days`,
        groupingBy: 'AbsenceGroup catalog (not individual types)',
        monthlyBreakdown: monthlyDebugBreakdown,
        januaryCount: monthlyDebugBreakdown['Jan'] || 0,
        queryLogic: dateFilters ? 
          `FIXED: Now matches original - startDate >= ${dateFilters.startDate.split('T')[0]} AND endDate <= ${dateFilters.endDate.split('T')[0]}` : 
          'No filtering applied',
        expectedResult: 'January count should now match original 44 absences'
      });

      // Calculate vacation entitlements - FILTER AWARE
      const employeeVacationTotals: Record<string, {
        total: number;
        available: number;
        used: number;
        pending: number;
      }> = {};

      // Step 1: Get total allocated vacation days from entitlements (already filtered by date)
      entitlements.forEach((ent: any) => {
        if (!ent.employeeId || !ent.total) return;

        const employeeId = ent.employeeId;
        if (!employeeVacationTotals[employeeId]) {
          employeeVacationTotals[employeeId] = {
            total: 0,
            available: 0,
            used: 0,
            pending: 0
          };
        }

        employeeVacationTotals[employeeId].total += ent.total || 0;
        employeeVacationTotals[employeeId].available += ent.available || 0;
        // Note: used and pending calculated from filtered absences below
      });

      // Step 2: Calculate USED and PENDING from filtered vacation absences (based on time filter)
      const vacationAbsences = absences.filter((absence: any) => {
        const groupName = absence.groupName?.toLowerCase() || '';
        return groupName.includes('vacation') || groupName.includes('holiday') || groupName.includes('annual');
      });

      vacationAbsences.forEach((absence: any) => {
        const employeeId = absence.employee?.id;
        if (employeeVacationTotals[employeeId]) {
          const duration = absence.effectiveDays || absence.calendarDays || 0;
          if (absence.status === 'APPROVED') {
            employeeVacationTotals[employeeId].used += duration;
          } else if (absence.status === 'PENDING') {
            employeeVacationTotals[employeeId].pending += duration;
          }
        }
      });

      const uniqueEmployees = Object.keys(employeeVacationTotals).length;
      const totals = Object.values(employeeVacationTotals).reduce(
        (acc, emp) => ({
          total: acc.total + emp.total,
          available: acc.available + emp.available,
          used: acc.used + emp.used,
          pending: acc.pending + emp.pending
        }),
        { total: 0, available: 0, used: 0, pending: 0 }
      );

      const averageVacationPerEmployee = uniqueEmployees > 0 
        ? Math.round((totals.total / uniqueEmployees) * 100) / 100 
        : 0;

      const averageAvailable = uniqueEmployees > 0 
        ? Math.round((totals.available / uniqueEmployees) * 100) / 100 
        : 0;

      const averageUsed = uniqueEmployees > 0 
        ? Math.round((totals.used / uniqueEmployees) * 100) / 100 
        : 0;

      console.log('🏖️ Vacation Calculation (FILTER AWARE):', {
        timeFilter,
        dateRange: dateFilters ? `${dateFilters.startDate.split('T')[0]} to ${dateFilters.endDate.split('T')[0]}` : 'All time',
        entitlementsCount: entitlements.length,
        vacationAbsencesInPeriod: vacationAbsences.length,
        employeesWithEntitlements: uniqueEmployees,
        averageAllocated: averageVacationPerEmployee,
        averageUsedInPeriod: averageUsed,
        calculationMethod: 'Used/Pending from FILTERED absences (not DB totals)'
      });

      // Department stats from FILTERED absences only - with unique employees and averages
      const departmentMap: Record<string, { 
        totalDays: number; 
        count: number; 
        employees: Set<string> 
      }> = {};
      
      absences.forEach((absence: any) => {
        // Now employeePosition should be a single active position (filtered at query level)
        const deptName = absence.employee?.employeePosition?.organizationalUnit?.name || 'No Department';
        const employeeId = absence.employee?.id;
        
        // Debug logging for position filtering
        if (absence.employee?.firstName === 'Zsolt' || absence.employee?.lastName?.toLowerCase().includes('zsolt')) {
          console.log('🔍 Zsolt Position Debug (Query-Level Filtered):', {
            employeeName: `${absence.employee.firstName} ${absence.employee.lastName}`,
            employeePosition: absence.employee?.employeePosition,
            departmentName: deptName,
            departmentId: absence.employee?.employeePosition?.organizationalUnit?.id,
            note: 'Should now show only active position due to exitDate filter'
          });
        }
        
        // Debug logging for Paul specifically
        if (absence.employee?.firstName?.toLowerCase().includes('paul') || absence.employee?.lastName?.toLowerCase().includes('paul')) {
          console.log('🔍 Paul Debug in Dashboard:', {
            employeeName: `${absence.employee.firstName} ${absence.employee.lastName}`,
            employeePosition: absence.employee?.employeePosition,
            departmentName: deptName,
            departmentId: absence.employee?.employeePosition?.organizationalUnit?.id,
            note: 'Paul found in dashboard absence data'
          });
        }
        
        if (!departmentMap[deptName]) {
          departmentMap[deptName] = { 
            totalDays: 0, 
            count: 0, 
            employees: new Set() 
          };
        }
        
        const duration = absence.effectiveDays || absence.calendarDays || 1;
        departmentMap[deptName].totalDays += duration;
        departmentMap[deptName].count += 1;
        
        if (employeeId) {
          departmentMap[deptName].employees.add(employeeId);
        }
      });

      const departmentStats = Object.entries(departmentMap)
        .map(([department, stats]) => ({
          department,
          totalDays: stats.totalDays,
          count: stats.count,
          uniqueEmployees: stats.employees.size,
          avgDaysPerEmployee: stats.employees.size > 0 
            ? Math.round((stats.totalDays / stats.employees.size) * 10) / 10 
            : 0,
          avgRequestsPerEmployee: stats.employees.size > 0 
            ? Math.round((stats.count / stats.employees.size) * 10) / 10 
            : 0
        }))
        .sort((a, b) => b.totalDays - a.totalDays)
        .slice(0, 10);
      


      // Status breakdown - count requests AND total days per status
      const statusMap: Record<string, { count: number, totalDays: number }> = {};
      absences.forEach((absence: any) => {
        const status = absence.status || 'UNKNOWN';
        const days = absence.effectiveDays || absence.calendarDays || 0;
        
        if (!statusMap[status]) {
          statusMap[status] = { count: 0, totalDays: 0 };
        }
        statusMap[status].count += 1;
        statusMap[status].totalDays += days;
      });

      const statusBreakdown = Object.entries(statusMap).map(([status, data]) => ({
        status,
        totalDays: data.totalDays, // Actual total days
        count: data.count, // Number of requests
        percentage: totalAbsences > 0 ? Math.round((data.count / totalAbsences) * 100) : 0
      }));

      // Type breakdown - count requests AND total days per type
      const typeMap: Record<string, { count: number, totalDays: number }> = {};
      absences.forEach((absence: any) => {
        const type = absence.type?.value || 'Unknown';
        const days = absence.effectiveDays || absence.calendarDays || 0;
        
        if (!typeMap[type]) {
          typeMap[type] = { count: 0, totalDays: 0 };
        }
        typeMap[type].count += 1;
        typeMap[type].totalDays += days;
      });

      const typeBreakdown = Object.entries(typeMap).map(([type, data]) => ({
        type,
        totalDays: data.totalDays, // Actual total days
        count: data.count // Number of requests
      }));

      // Calculate real monthly trends from absence data with employee and duration stats
      const monthlyData: { [month: string]: { 
        typeBreakdown: { [type: string]: number },
        employees: Set<string>,
        totalDuration: number,
        totalRequests: number
      } } = {};
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      // Group absences by month and collect employee/duration data
      absences.forEach((absence: any) => {
        const date = new Date(absence.startDate);
        const monthName = monthNames[date.getMonth()];
        const groupName = absence.groupName || 'Unknown Group'; // Use GROUPS as requested
        const employeeId = absence.employee?.id;
        const duration = absence.effectiveDays || absence.calendarDays || 0;
        
        if (!monthlyData[monthName]) {
          monthlyData[monthName] = {
            typeBreakdown: {},
            employees: new Set(),
            totalDuration: 0,
            totalRequests: 0
          };
        }
        
        // Count by GROUP (as requested by user)
        monthlyData[monthName].typeBreakdown[groupName] = (monthlyData[monthName].typeBreakdown[groupName] || 0) + 1;
        
        // Track unique employees
        if (employeeId) {
          monthlyData[monthName].employees.add(employeeId);
        }
        
        // Track duration and request count
        monthlyData[monthName].totalDuration += duration;
        monthlyData[monthName].totalRequests += 1;
      });
      


      // Convert to chart format with averages
      const monthlyTrends = monthNames.map(month => {
        const monthData = monthlyData[month];
        if (!monthData) {
          return null;
        }
        
        const total = monthData.totalRequests;
        const uniqueEmployees = monthData.employees.size;
        const avgRequestsPerEmployee = uniqueEmployees > 0 ? Math.round((total / uniqueEmployees) * 10) / 10 : 0;
        const avgDurationPerRequest = total > 0 ? Math.round((monthData.totalDuration / total) * 10) / 10 : 0;
        

        
        // Count by status for this month
        const statusCounts = { approved: 0, pending: 0, rejected: 0 };
        absences.forEach((absence: any) => {
          const absenceDate = new Date(absence.startDate);
          if (monthNames[absenceDate.getMonth()] === month) {
            const status = absence.status?.toLowerCase() || 'pending';
            if (status === 'approved') statusCounts.approved++;
            else if (status === 'pending') statusCounts.pending++;
            else if (status === 'rejected') statusCounts.rejected++;
          }
        });
        
        return {
          month,
          total,
          approved: statusCounts.approved,
          pending: statusCounts.pending,
          rejected: statusCounts.rejected,
          typeBreakdown: monthData.typeBreakdown,
          uniqueEmployees,
          avgRequestsPerEmployee,
          avgDurationPerRequest,
          totalDuration: monthData.totalDuration
        };
            }).filter((month): month is NonNullable<typeof month> => month !== null && month.total > 0); // Only include months with data

             console.log('🏖️ Entitlements calculated:', {
        uniqueEmployees,
        averageVacationPerEmployee,
        averageAvailable,
        averageUsed
      });

      console.log('📊 Real absence groups and monthly trends:', {
        absenceGroups: Object.values(groupsMap),
        monthsWithData: monthlyTrends.map(m => ({ 
          month: m.month, 
          total: m.total, 
          types: Object.keys(m.typeBreakdown),
          employees: m.uniqueEmployees,
          avgPerEmployee: m.avgRequestsPerEmployee,
          avgDuration: m.avgDurationPerRequest
        })),
        allAbsenceTypes: [...new Set(absences.map((a: any) => a.groupName))]
      });

      // Final data integrity check
      console.log('✅ FINAL DASHBOARD DATA SUMMARY - OVERLAP LOGIC ENABLED:', {
        dataSource: 'EmployeeAbsence + EmployeeAbsenceEntitlement GraphQL tables',
        timeFilter,
        dateRange: dateFilters ? `${dateFilters.startDate.split('T')[0]} to ${dateFilters.endDate.split('T')[0]}` : 'All time',
        overlapLogic: '🚀 Cross-month absences now included (startDate <= endDate AND endDate >= startDate)',
        totalAbsences,
        approvalRate: `${approvalRate}%`,
        avgDuration: `${averageDuration} days`,
        activeEmployees: uniqueEmployees,
        chartsUseGroups: 'AbsenceGroup catalog (Vacation, Sick Leave, etc.)',
        dataConsistency: '✅ Dashboard chart and detail list should now match!',
        expectedFix: 'Chart (37) and list (35) counts should now be identical',
        rawAbsencesShared: `Sharing ${absences.length} filtered absences with AbsenceList`
      });

      setData({
        totalAbsences,
        pendingAbsences,
        approvedAbsences,
        rejectedAbsences,
        averageDuration,
        approvalRate,
        rawAbsences: absences, // 🚀 Pass the enriched absences to AbsenceList
        averageVacationDays: averageVacationPerEmployee,
        averageUsed,
        averagePending: 0, // TODO: Calculate from entitlements
        totalVacationLiability: 0, // TODO: Calculate remaining vacation days
        departmentStats: departmentStats.map(dept => ({
          name: dept.department,
          totalDays: dept.totalDays,
          uniqueEmployees: dept.uniqueEmployees,
          avgDaysPerEmployee: dept.avgDaysPerEmployee,
          avgRequestsPerEmployee: dept.avgRequestsPerEmployee,
          totalRequests: dept.count
        })),
        monthlyData: monthlyTrends.map(trend => ({
          month: trend.month,
          total: trend.total, // Chart expects 'total', not 'totalRequests'
          uniqueEmployees: trend.uniqueEmployees,
          avgRequestsPerEmployee: trend.avgRequestsPerEmployee,
          avgDurationPerRequest: trend.avgDurationPerRequest,
          totalDuration: trend.totalDuration,
          typeBreakdown: trend.typeBreakdown
        })),
        statusBreakdown,
        typeBreakdown,
        entitlements: {
          averageVacationPerEmployee,
          totalActiveEmployees: uniqueEmployees,
          averageAvailable,
          averageUsed
        },
        isLoading: false,
        error: null
      });

    } catch (err) {
      console.error('❌ Dashboard data query failed:', err);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch dashboard data'
      }));
    }
  }, [accessToken, timeFilter]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData, timeFilter]);

  return data;
};

// Default export for easier importing
export default useDashboardData; 