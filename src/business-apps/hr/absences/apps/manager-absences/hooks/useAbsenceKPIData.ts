import { useState, useEffect, useCallback, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { CatalogEntry } from '@/common/types/CatalogTypes';
import { AbsenceFilters } from '../types';

// Working GraphQL query for KPI data (using supervisor pattern)
const GET_EMPLOYEE_ABSENCES_FOR_KPI = `
  query GetEmployeeAbsencesForKPI($supervisorId: uuid!) {
    EmployeeAbsence(
      limit: 500
      where: {
        isDeleted: {_eq: false}
        employee: {employeePosition: {supervisor: {id: {_eq: $supervisorId}}}}
      }
      orderBy: {startDate: DESC}
    ) {
      id
      startDate
      endDate
      calendarDays
      effectiveDays
      status
      employee {
        id
        lastName
        firstName
        pictureThumbnail
        employeePosition {
          organizationalUnit {
            name
          }
        }
      }
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
    }
  }
`;

interface EmployeeAbsence {
  id: string;
  startDate: string;
  endDate: string;
  calendarDays: number;
  effectiveDays: number;
  status: string;
  employee: {
    id: string;
    lastName: string;
    firstName: string;
    pictureThumbnail?: string;
    employeePosition: {
      organizationalUnit: {
        name: string;
      };
    };
  };
  type: {
    objectValue: string;
    translations: { localeCode: string; value: string }[];
    id: string;
    value: string;
    parentEntryId: string;
    groupName?: string;
  };
}

interface KPIData {
  barChartData: Array<{
    month: string;
    [key: string]: string | number;
  }>;
  pieChartData: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
  topAbsentees: Array<{
    name: string;
    department: string;
    total: number;
    colorIdx: number;
    absences: EmployeeAbsence[];
  }>;
  totalAbsenceDays: number;
  maxAbsenceDays: number;
  vacationShare: number;
  departmentData: Array<{
    department: string;
    total: number;
    colorIdx: number;
    absences: EmployeeAbsence[];
  }>;
}

export const useAbsenceKPIData = (
  context: BusinessAppContextProps, 
  filters?: AbsenceFilters
) => {
  const { accessToken, userInfo } = context;
  const [data, setData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const graphQLClient = useGraphQLClient(accessToken);
  const catalogClient = useCatalogManagerClient(accessToken);

  // Memoize the filters to prevent unnecessary re-renders
  const memoizedFilters = useMemo(() => filters, [
    filters?.search,
    filters?.statuses?.join(','),
    filters?.types?.join(','),
    filters?.groups?.join(','),
    filters?.startDate,
    filters?.endDate
  ]);

  const getMonthName = (date: string): string => {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    return monthNames[new Date(date).getMonth()];
  };

  const processData = useCallback((absences: EmployeeAbsence[], groupsMap: { [key: string]: string }): KPIData => {
    // Define the desired order for absence groups (same as in AbsenceColorsManager)
    const groupOrder = ['Vacation', 'Sick Leave', 'Special Leave', 'Work Leave'];
    
    // Enrich absences with group names
    const enrichedAbsences = absences.map((absence) => ({
      ...absence,
      type: {
        ...absence.type,
        groupName: groupsMap[absence.type.parentEntryId] || "Unknown",
      },
    }));

    // Organize by month and type
    const organizedAbsences: { [month: string]: { [type: string]: number } } = {};
    enrichedAbsences.forEach((absence) => {
      const month = getMonthName(absence.startDate);
      const type = absence.type.groupName || "Unknown";
      if (!organizedAbsences[month]) organizedAbsences[month] = {};
      if (!organizedAbsences[month][type]) organizedAbsences[month][type] = 0;
      organizedAbsences[month][type] += 1;
    });

    // All months in order
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    // Get all unique groups that appear in the data
    const allGroupsInData = new Set<string>();
    Object.values(organizedAbsences).forEach(monthData => {
      Object.keys(monthData).forEach(group => allGroupsInData.add(group));
    });

    // Sort groups according to desired order, with unknown groups at the end
    const sortedGroups = Array.from(allGroupsInData).sort((a, b) => {
      const aIndex = groupOrder.findIndex(orderGroup => 
        a.toLowerCase().includes(orderGroup.toLowerCase())
      );
      const bIndex = groupOrder.findIndex(orderGroup => 
        b.toLowerCase().includes(orderGroup.toLowerCase())
      );
      
      // If both found, sort by index; if not found, put at end
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

  

    // Create bar chart data for ALL months with groups in the correct order
    const barChartData = monthNames.map((month) => {
      const monthData: any = { month };
      // Add groups in the desired order
      sortedGroups.forEach((group) => {
        monthData[group] = organizedAbsences[month]?.[group] || 0;
      });
      return monthData;
    });

    // Calculate total absence days
    const totalAbsenceDays = enrichedAbsences.reduce(
      (total, absence) => total + (absence.calendarDays || 0),
      0
    );

    // Filter absences for current year only (for pie chart)
    const currentYear = new Date().getFullYear();
    const currentYearAbsences = enrichedAbsences.filter(absence => {
      const absenceYear = new Date(absence.startDate).getFullYear();
      return absenceYear === currentYear;
    });

    // Create pie chart data with current year absences only
    const groupTotals: { [key: string]: number } = {};
    currentYearAbsences.forEach((absence) => {
      const groupName = absence.type.groupName || "Unknown";
      if (!groupTotals[groupName]) groupTotals[groupName] = 0;
      groupTotals[groupName] += absence.calendarDays || 0;
    });

    // Calculate current year total for vacation share
    const currentYearTotalDays = currentYearAbsences.reduce(
      (total, absence) => total + (absence.calendarDays || 0),
      0
    );

    // Sort pie chart data by the same group order
    const sortedPieEntries = Object.entries(groupTotals).sort(([a], [b]) => {
      const aIndex = groupOrder.findIndex(orderGroup => 
        a.toLowerCase().includes(orderGroup.toLowerCase())
      );
      const bIndex = groupOrder.findIndex(orderGroup => 
        b.toLowerCase().includes(orderGroup.toLowerCase())
      );
      
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    const pieChartData = sortedPieEntries.map(([name, value]) => ({
      name,
      value,
    }));

    // Calculate top absentees - exclude work leave
    const employeeAbsences: { [key: string]: { employee: EmployeeAbsence['employee']; totalDays: number; absenceCount: number; absences: EmployeeAbsence[] } } = {};
    enrichedAbsences.forEach((absence) => {
      // Skip work leave absences
      const groupName = absence.type.groupName || '';
      if (groupName.toLowerCase().includes('work leave')) {
        return;
      }
      
      const employeeId = absence.employee.id;
      if (!employeeAbsences[employeeId]) {
        employeeAbsences[employeeId] = {
          employee: absence.employee,
          totalDays: 0,
          absenceCount: 0,
          absences: [],
        };
      }
      employeeAbsences[employeeId].totalDays += absence.calendarDays || 0;
      employeeAbsences[employeeId].absenceCount += 1;
      employeeAbsences[employeeId].absences.push(absence);
    });

    const topAbsenteesRaw = Object.values(employeeAbsences)
      .sort((a, b) => b.totalDays - a.totalDays)
      .slice(0, 5);

    // Transform to match TopAbsenteesList interface
    const topAbsentees = topAbsenteesRaw.map((emp, index) => ({
      name: `${emp.employee.firstName} ${emp.employee.lastName}`,
      department: emp.employee.employeePosition.organizationalUnit.name,
      total: emp.totalDays,
      colorIdx: index,
      absences: emp.absences,
    }));

    const maxAbsenceDays = Math.max(...topAbsentees.map(ta => ta.total), 0);

    // Calculate vacation share for current year
    const vacationDays = groupTotals["Vacation"] || 0;
    const vacationShare = currentYearTotalDays > 0 ? (vacationDays / currentYearTotalDays) * 100 : 0;

    // Department data
    const departmentTotals: { [key: string]: EmployeeAbsence[] } = {};
    enrichedAbsences.forEach((absence) => {
      const department = absence.employee.employeePosition.organizationalUnit.name;
      if (!departmentTotals[department]) departmentTotals[department] = [];
      departmentTotals[department].push(absence);
    });

    const departmentData = Object.entries(departmentTotals).map(([department, absences], index) => ({
      department,
      total: absences.reduce((sum, absence) => sum + (absence.calendarDays || 0), 0),
      colorIdx: index,
      absences,
    }));

    return {
      barChartData,
      pieChartData,
      topAbsentees,
      totalAbsenceDays,
      maxAbsenceDays,
      vacationShare,
      departmentData,
    };
  }, []);

  const loadData = useCallback(async () => {
    if (!userInfo?.employeeDetails?.employeeId) {
      setError("Employee ID not found");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch absence groups (catalogs)
      const catalogResponse = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: "AbsenceGroup", version: "v1" },
        { limit: 100, offset: 0, returnTotalRecords: true }
      );

      const groupsMap: { [key: string]: string } = {};
      catalogResponse.data.forEach((group: CatalogEntry) => {
        groupsMap[group.id] = group.value;
      });

      // Fetch absence data using working query
      const result = await graphQLClient.request<{
        EmployeeAbsence: EmployeeAbsence[];
      }>(GET_EMPLOYEE_ABSENCES_FOR_KPI, { 
        supervisorId: userInfo.employeeDetails.employeeId
      });

      // Process the data
      const processedData = processData(result.EmployeeAbsence, groupsMap);
      setData(processedData);
    } catch (err) {
      console.error('Error fetching KPI data:', err);
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [userInfo?.employeeDetails?.employeeId, graphQLClient, catalogClient, processData]);

  useEffect(() => {
    if (accessToken && userInfo?.employeeDetails?.employeeId) {
      loadData();
    }
  }, [loadData, accessToken, userInfo?.employeeDetails?.employeeId]);

  return {
    data,
    loading,
    error,
    refetch: loadData,
  };
}; 