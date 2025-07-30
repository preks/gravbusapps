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
const DASHBOARD_QUERY = `
  query GetDashboardData {
    # Main absences data
    employeeAbsences: EmployeeAbsence(where: { isDeleted: { _eq: false } }) {
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
    
    # Vacation entitlements for active employees (current year)
    EmployeeAbsenceEntitlement(
      where: {
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
      }
    ) {
      employeeId
      available
      approved
      total
      pending
    }
  }
`;

export const useDashboardData = ({ accessToken, userInfo }: BusinessAppContextProps) => {
  const catalogClient = useCatalogManagerClient(accessToken);
  const [data, setData] = useState<DashboardData>({
    totalAbsences: 0,
    pendingAbsences: 0,
    approvedAbsences: 0,
    rejectedAbsences: 0,
    averageDuration: 0,
    approvalRate: 0,
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
      // Fetch absence groups from catalog first
      console.log('🔍 Fetching absence groups from catalog...');
      const catalogData = await catalogClient.getCatalogEntriesList({
        catalogIdentifier: "AbsenceGroup",
        version: "v1",
      });
      
      const groupsMap: { [key: string]: string } = {};
      catalogData.data.forEach((entry: any) => {
        groupsMap[entry.id] = entry.value;
        if (entry.catalogEntryLocalId) {
          groupsMap[entry.catalogEntryLocalId] = entry.value;
        }
      });
      console.log('✅ Absence groups loaded:', Object.keys(groupsMap).length);

      // Fetch dashboard data
      graphQLClient.setAccessToken(accessToken);
      const result = await graphQLClient.request(DASHBOARD_QUERY);

      const rawAbsences = result?.employeeAbsences || [];
      const entitlements = result?.EmployeeAbsenceEntitlement || [];

      // Enrich absences with group names
      const absences = rawAbsences.map((absence: any) => ({
        ...absence,
        groupName: groupsMap[absence.type?.parentEntryId] || absence.type?.value || 'Unknown'
      }));

      console.log('📊 Dashboard data loaded:', {
        totalAbsences: absences.length,
        totalEntitlements: entitlements.length,
        absenceGroups: Object.keys(groupsMap).length
      });

      // Calculate absence metrics
      const totalAbsences = absences.length;
      const pendingAbsences = absences.filter((a: any) => a.status === 'PENDING').length;
      const approvedAbsences = absences.filter((a: any) => a.status === 'APPROVED').length;
      const rejectedAbsences = absences.filter((a: any) => a.status === 'REJECTED').length;
      
      const approvalRate = totalAbsences > 0 ? Math.round((approvedAbsences / totalAbsences) * 100) : 0;
      
      // Calculate average duration (simplified)
      const averageDuration = 5; // TODO: Calculate from actual start/end dates

      // Calculate vacation entitlements (using working logic from test)
      const employeeVacationTotals: Record<string, {
        total: number;
        available: number;
        used: number;
        pending: number;
      }> = {};

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
        employeeVacationTotals[employeeId].used += ent.approved || 0;
        employeeVacationTotals[employeeId].pending += ent.pending || 0;
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

      // Department stats
      const departmentMap: Record<string, { totalDays: number; count: number }> = {};
      absences.forEach((absence: any) => {
        const deptName = absence.employee?.employeePosition?.organizationalUnit?.name || 'No Department';
        if (!departmentMap[deptName]) {
          departmentMap[deptName] = { totalDays: 0, count: 0 };
        }
        departmentMap[deptName].totalDays += 1; // Simplified
        departmentMap[deptName].count += 1;
      });

      const departmentStats = Object.entries(departmentMap)
        .map(([department, stats]) => ({
          department,
          totalDays: stats.totalDays,
          count: stats.count
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
        const groupName = absence.groupName || 'Unknown';
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
        
        // Count by type
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

      setData({
        totalAbsences,
        pendingAbsences,
        approvedAbsences,
        rejectedAbsences,
        averageDuration,
        approvalRate,
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
  }, [accessToken]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return data;
};

// Default export for easier importing
export default useDashboardData; 