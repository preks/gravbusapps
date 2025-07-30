import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { graphQLClient } from '@/common/network/graphql/GraphQLClient';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';

export interface DashboardData {
  // KPI Metrics
  totalAbsences: number;
  pendingAbsences: number;
  approvedAbsences: number;
  rejectedAbsences: number;
  averageDuration: number;
  approvalRate: number;
  
  // 🚀 Raw filtered absences - for AbsenceList to use same exact data
  rawAbsences: Array<any>;
  
  // Vacation Entitlements (accurate calculation)
  entitlements: {
    averageVacationPerEmployee: number;
    totalActiveEmployees: number;
    averageAvailable: number;
    averageUsed: number;
  };
  
  // Chart Data
  departmentStats: Array<{
    department: string;
    totalDays: number;
    count: number;
    uniqueEmployees: number;
    avgDaysPerEmployee: number;
    avgRequestsPerEmployee: number;
  }>;
  
  statusBreakdown: Array<{
    status: string;
    totalDays: number;
    count: number;
    percentage: number;
  }>;
  
  typeBreakdown: Array<{
    type: string;
    totalDays: number;
    count: number;
  }>;
  
  monthlyTrends: Array<{
    month: string;
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    typeBreakdown: { [type: string]: number };
    uniqueEmployees: number;
    avgRequestsPerEmployee: number;
    avgDurationPerRequest: number;
    totalDuration: number;
  }>;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
}

// Comprehensive dashboard query with vacation entitlements
const getDashboardQuery = (dateFilters: any) => {
  // OPTION 1: OVERLAP LOGIC - Include any absence that overlaps with the period
  // Changed from restrictive (fully contained) to inclusive (any overlap)
  const absenceWhere = dateFilters 
    ? `where: { 
        _and: [
          { isDeleted: { _eq: false } },
          { startDate: { _lte: "${dateFilters.endDate}" } },
          { endDate: { _gte: "${dateFilters.startDate}" } }
        ]
      }`
    : `where: { isDeleted: { _eq: false } }`;

  const entitlementWhere = dateFilters 
    ? `where: {
        _and: [
          { isDeleted: { _eq: false } },
          {
            _or: [
              { type: { value: { _ilike: "%vacation%" } } },
              { type: { value: { _ilike: "%annual%" } } },
              { type: { value: { _ilike: "%holiday%" } } },
              { type: { value: { _ilike: "%leave%" } } }
            ]
          },
          {
            _or: [
              { validFrom: { _gte: "${dateFilters.startDate}" } },
              { validTo: { _gte: "${dateFilters.startDate}" } },
              { 
                _and: [
                  { validFrom: { _lte: "${dateFilters.endDate}" } },
                  { validTo: { _gte: "${dateFilters.startDate}" } }
                ]
              }
            ]
          },
          {
            employee: { 
              employeePosition: { id: { _isNull: false } }
            }
          }
        ]
      }`
    : `where: {
        _and: [
          { isDeleted: { _eq: false } },
          {
            _or: [
              { type: { value: { _ilike: "%vacation%" } } },
              { type: { value: { _ilike: "%annual%" } } },
              { type: { value: { _ilike: "%holiday%" } } },
              { type: { value: { _ilike: "%leave%" } } }
            ]
          },
          {
            _or: [
              { validFrom: { _gte: "2025-01-01T00:00:00.000Z" } },
              { validTo: { _gte: "2025-01-01T00:00:00.000Z" } },
              { 
                _and: [
                  { validFrom: { _lte: "2025-12-31T23:59:59.999Z" } },
                  { validTo: { _gte: "2025-01-01T00:00:00.000Z" } }
                ]
              }
            ]
          },
          {
            employee: { 
              employeePosition: { id: { _isNull: false } }
            }
          }
        ]
      }`;

  return `
  query GetDashboardData {
    # Main absences data
    employeeAbsences: EmployeeAbsence(${absenceWhere}) {
      id
      status
      startDate
      endDate
      effectiveDays
      calendarDays
      type {
        objectValue
        translations {
          localeCode
          value
        }
        id
        value
        parentEntryId
      }
      employee {
        id
        firstName
        lastName
        employeePosition {
          organizationalUnit {
            name
          }
        }
      }
    }
    
    # Vacation entitlements for active employees (filtered by time period)
    EmployeeAbsenceEntitlement(${entitlementWhere}) {
      employeeId
      available
      approved
      total
      pending
    }
  }
`;
};

interface DashboardDataProps extends BusinessAppContextProps {
  timeFilter?: 'current-year' | 'quarter' | 'month' | 'everything';
}

// Helper function to get date filters based on timeFilter
const getDateFilters = (timeFilter: string) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  
  console.log('🗓️ Current date context:', {
    now: now.toISOString(),
    currentYear,
    currentMonth: now.getMonth(),
    timeFilter
  });
  
  switch (timeFilter) {
    case 'current-year':
      const yearFilters = {
        startDate: `${currentYear}-01-01T00:00:00.000Z`,
        endDate: `${currentYear}-12-31T23:59:59.999Z`
      };
      console.log('📅 Year filters:', yearFilters);
      return yearFilters;
      
    case 'quarter':
      const currentQuarter = Math.floor(now.getMonth() / 3);
      // Fix: Use UTC dates to avoid timezone issues
      const quarterStartMonth = currentQuarter * 3; // 0, 3, 6, 9 for Q1, Q2, Q3, Q4
      const quarterEndMonth = quarterStartMonth + 2; // 2, 5, 8, 11 for Q1, Q2, Q3, Q4
      
      // Use UTC methods to avoid timezone conversion
      const quarterStart = new Date(Date.UTC(currentYear, quarterStartMonth, 1, 0, 0, 0, 0));
      const quarterEnd = new Date(Date.UTC(currentYear, quarterEndMonth + 1, 0, 23, 59, 59, 999));
      const quarterFilters = {
        startDate: quarterStart.toISOString(),
        endDate: quarterEnd.toISOString()
      };
      console.log('📅 Quarter filters (UTC FIXED):', {
        currentMonth: now.getMonth() + 1,
        currentQuarter,
        quarterNumber: currentQuarter + 1,
        quarterStartMonth: quarterStartMonth + 1, // +1 for human readable (July = 7)
        quarterEndMonth: quarterEndMonth + 1,     // +1 for human readable (Sept = 9)
        quarterStart: quarterStart.toISOString(),
        quarterEnd: quarterEnd.toISOString(),
        expectedQuarter: currentQuarter === 2 ? 'Q3 (July-September)' : `Q${currentQuarter + 1}`,
        ...quarterFilters
      });
      return quarterFilters;
      
    case 'month':
      // Use UTC to avoid timezone issues
      const monthStart = new Date(Date.UTC(currentYear, now.getMonth(), 1, 0, 0, 0, 0));
      const monthEnd = new Date(Date.UTC(currentYear, now.getMonth() + 1, 0, 23, 59, 59, 999));
      const monthFilters = {
        startDate: monthStart.toISOString(),
        endDate: monthEnd.toISOString()
      };
      console.log('📅 Month filters (UTC):', {
        currentMonth: now.getMonth() + 1,
        monthName: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][now.getMonth()],
        ...monthFilters
      });
      return monthFilters;
      
    case 'everything':
    default:
      console.log('📅 No date filtering (everything)');
      return null; // No date filtering
  }
};

export const useDashboardData = ({ accessToken, userInfo, timeFilter = 'current-year' }: DashboardDataProps) => {
  const catalogClient = useCatalogManagerClient(accessToken);
  const [data, setData] = useState<DashboardData>({
    totalAbsences: 0,
    pendingAbsences: 0,
    approvedAbsences: 0,
    rejectedAbsences: 0,
    averageDuration: 0,
    approvalRate: 0,
    rawAbsences: [], // 🚀 Initialize empty array for filtered absences
    entitlements: {
      averageVacationPerEmployee: 0,
      totalActiveEmployees: 0,
      averageAvailable: 0,
      averageUsed: 0
    },
    departmentStats: [],
    statusBreakdown: [],
    typeBreakdown: [],
    monthlyTrends: [],
    isLoading: true,
    error: null
  });

  const fetchDashboardData = useCallback(async () => {
    if (!accessToken) return;

    setData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Fetch both absence groups AND absence types from catalogs
      console.log('🔍 Fetching absence catalogs...');
      const [groupsCatalogData, typesCatalogData] = await Promise.all([
        catalogClient.getCatalogEntriesList({
          catalogIdentifier: "AbsenceGroup",
          version: "v1",
        }),
        catalogClient.getCatalogEntriesList({
          catalogIdentifier: "AbsenceType",
          version: "v1",
        })
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
      
      const query = getDashboardQuery(dateFilters);
      const result = await graphQLClient.request(query);

      const rawAbsences = result?.employeeAbsences || [];
      const entitlements = result?.EmployeeAbsenceEntitlement || [];

      // DEBUG: Check January data specifically
      const januaryAbsences = rawAbsences.filter((a: any) => {
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

      // Enrich absences with proper group names AND type names from catalogs
      // 🚀 ENHANCED: Add all fields that AbsenceList expects (EnhancedAbsence interface)
      const absences = rawAbsences.map((absence: any) => ({
        ...absence,
        groupName: groupsMap[absence.type?.parentEntryId] || 'Unknown Group',
        typeName: typesMap[absence.type?.id] || typesMap[absence.type?.catalogEntryLocalId] || absence.type?.value || 'Unknown Type',
        // Additional fields for AbsenceList compatibility
        employeeName: `${absence.employee?.firstName || ''} ${absence.employee?.lastName || ''}`.trim() || 'Unknown Employee',
        pictureThumbnail: absence.employee?.pictureThumbnail || '',
        createdAt: absence.createdAt || absence.startDate // fallback to startDate if createdAt missing
      }));

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
        const deptName = absence.employee?.employeePosition?.organizationalUnit?.name || 'No Department';
        const employeeId = absence.employee?.id;
        
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
      


      // Status breakdown
      const statusMap: Record<string, number> = {};
      absences.forEach((absence: any) => {
        const status = absence.status || 'UNKNOWN';
        statusMap[status] = (statusMap[status] || 0) + 1;
      });

      const statusBreakdown = Object.entries(statusMap).map(([status, count]) => ({
        status,
        totalDays: count,
        count,
        percentage: totalAbsences > 0 ? Math.round((count / totalAbsences) * 100) : 0
      }));

      // Type breakdown
      const typeMap: Record<string, number> = {};
      absences.forEach((absence: any) => {
        const type = absence.type?.value || 'Unknown';
        typeMap[type] = (typeMap[type] || 0) + 1;
      });

      const typeBreakdown = Object.entries(typeMap).map(([type, count]) => ({
        type,
        totalDays: count,
        count
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
        rawAbsences: absences, // 🚀 Pass the same filtered absences to AbsenceList
        entitlements: {
          averageVacationPerEmployee,
          totalActiveEmployees: uniqueEmployees,
          averageAvailable,
          averageUsed
        },
        departmentStats,
        statusBreakdown,
        typeBreakdown,
        monthlyTrends,
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