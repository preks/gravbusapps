import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import dayjs from 'dayjs';
import {
  GET_APPROVED_ABSENCES_2025,
  GET_PENDING_REQUESTS,
  GET_TEAM_MEMBERS_AWAY,
  GET_UPCOMING_ABSENCES,
  GET_VACATION_ABSENCES,
  GET_SICK_ABSENCES,
  GET_SICK_ABSENCES_BY_MONTH
} from '../queries/DashboardQueries';
import {
  GET_PLANNED_VS_UNPLANNED_2025,
  GET_AVERAGE_DAYS_PER_REQUEST,
  GET_USAGE_TRENDS_DATA,
  GET_YEAR_OVER_YEAR_DATA,
  GET_AVERAGE_WORK_STREAK
} from '../queries/StatisticsQueries';

interface AbsenceStatistics {
  pendingRequests: number;
  approvedAbsences: number;
  teamMembersAway: number;
  upcomingAbsences: number;
  vacationCount: number;
  sickLeaveCount: number;
  averageDaysPerRequest: string;
  approvalRate: number;
  averageWorkStreak: string; // Add average work streak
  // New field for sick absences by month
  sickAbsencesByMonth: {
    month: string;
    count: number;
  };
  // Statistics tab data
  plannedAbsences: number;
  plannedAbsencesDays: number;
  unplannedAbsences: number;
  unplannedAbsencesDays: number;
  absences: any[]; // Add actual absence data for trends analysis
  yearOverYearData: any[]; // Add year-over-year comparison data
}

interface UseAbsenceStatisticsSimpleReturn {
  statistics: AbsenceStatistics;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useAbsenceStatisticsSimple = (context: BusinessAppContextProps): UseAbsenceStatisticsSimpleReturn => {
  const { accessToken, userInfo } = context;
  const supervisorId = userInfo?.employeeDetails?.employeeId;
  
  const [statistics, setStatistics] = useState<AbsenceStatistics>({
    pendingRequests: 0,
    approvedAbsences: 0,
    teamMembersAway: 0,
    upcomingAbsences: 0,
    vacationCount: 0,
    sickLeaveCount: 0,
    averageDaysPerRequest: '0.0',
    approvalRate: 0,
    averageWorkStreak: '0.0',
    // New field for sick absences by month
    sickAbsencesByMonth: {
      month: 'None',
      count: 0
    },
    // Statistics tab data
    plannedAbsences: 0,
    plannedAbsencesDays: 0,
    unplannedAbsences: 0,
    unplannedAbsencesDays: 0,
    absences: [],
    yearOverYearData: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const graphqlClient = useGraphQLClient(accessToken);
  const catalogClient = useCatalogManagerClient(accessToken);

  const fetchStatistics = useCallback(async () => {
    console.log('=== FETCH STATISTICS START ===');
    console.log('Supervisor ID:', supervisorId);
    console.log('Access token exists:', !!accessToken);
    
    if (!supervisorId) {
      setError('Supervisor ID is required');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get today's date in timestamp format (start of day)
      const today = new Date().toISOString().split('T')[0] + ' 00:00:00+00';
      
      // Get current year and previous year date ranges for statistics queries
      const currentYear = new Date().getFullYear();
      const previousYear = currentYear - 1;
      const currentYearStart = `${currentYear}-01-01 00:00:00+00`; // January 1st
      const currentYearEnd = `${currentYear}-12-31 23:59:59+00`; // December 31st
      const previousYearStart = `${previousYear}-01-01 00:00:00+00`; // Previous year January 1st
      
      console.log('Today\'s timestamp:', today);
      console.log('Current year range:', { currentYearStart, currentYearEnd });
      console.log('Fetching absence statistics with supervisorId:', supervisorId);
      
      // Fetch absence groups to map parentEntryId to group names
      const groupsResponse = await catalogClient.getCatalogEntriesList({
        catalogIdentifier: 'AbsenceGroup',
        version: 'v1'
      }, {
        limit: 100,
        offset: 0,
        returnTotalRecords: true
      });

      const groupsMap: { [key: string]: string } = {};
      groupsResponse.data.forEach((group: any) => {
        groupsMap[group.id] = group.value;
      });

      console.log('Absence groups map:', groupsMap);
      console.log('Looking for RECR group:', groupsMap['AbsenceGroup:v1:RECR']);
      console.log('Looking for HEALTH group:', groupsMap['AbsenceGroup:v1:HEALTH']);
      console.log('All absence group IDs:', Object.keys(groupsMap));
      
      console.log('About to execute separate GraphQL queries with supervisorId:', supervisorId);
      
      // Dashboard queries - now with current year date filters
      const approvedAbsencesQuery = GET_APPROVED_ABSENCES_2025(currentYearStart, currentYearEnd);
      const pendingRequestsQuery = GET_PENDING_REQUESTS(currentYearStart, currentYearEnd);
      const teamMembersAwayQuery = GET_TEAM_MEMBERS_AWAY();
      const upcomingAbsencesQuery = GET_UPCOMING_ABSENCES(currentYearStart, currentYearEnd);
      const vacationAbsencesQuery = GET_VACATION_ABSENCES(currentYearStart, currentYearEnd);
      const sickLeaveAbsencesQuery = GET_SICK_ABSENCES(currentYearStart, currentYearEnd);
      
      // Execute separate queries for each statistic
      const [
        approvedAbsencesResult,
        pendingRequestsResult,
        teamMembersAwayResult,
        upcomingAbsencesResult,
        vacationAbsencesResult,
        sickLeaveAbsencesResult,
        plannedVsUnplannedResult,
        averageDaysResult,
        usageTrendsResult,
        yearOverYearResult,
        averageWorkStreakResult
      ] = await Promise.all([
        graphqlClient.request<{ EmployeeAbsenceAggregate: { aggregate: { count: number } } }>(
          approvedAbsencesQuery, { supervisorId, currentYearStart, currentYearEnd }
        ),
        graphqlClient.request<{ EmployeeAbsenceAggregate: { aggregate: { count: number } } }>(
          pendingRequestsQuery, { supervisorId, currentYearStart, currentYearEnd }
        ),
        graphqlClient.request<{ EmployeeAbsenceAggregate: { aggregate: { count: number } } }>(
          teamMembersAwayQuery, { supervisorId }
        ),
        graphqlClient.request<{ EmployeeAbsenceAggregate: { aggregate: { count: number } } }>(
          upcomingAbsencesQuery, { supervisorId, currentYearStart, currentYearEnd }
        ),
        graphqlClient.request<{ EmployeeAbsenceAggregate: { aggregate: { count: number } } }>(
          vacationAbsencesQuery, { supervisorId, currentYearStart, currentYearEnd }
        ),
        graphqlClient.request<{ EmployeeAbsenceAggregate: { aggregate: { count: number } } }>(
          sickLeaveAbsencesQuery, { supervisorId, currentYearStart, currentYearEnd }
        ),
        graphqlClient.request<{ 
          allApprovedAbsences: { aggregate: { count: number } };
          vacationAbsences: { aggregate: { count: number } };
          sickLeaveAbsences: { aggregate: { count: number } };
        }>(
          GET_PLANNED_VS_UNPLANNED_2025, { supervisorId, currentYearStart, currentYearEnd }
        ),
        graphqlClient.request<{ 
          approvedAbsencesWithDays: { aggregate: { count: number; sum: { effectiveDays: number | null } } };
        }>(
          GET_AVERAGE_DAYS_PER_REQUEST, { supervisorId, currentYearStart, currentYearEnd }
        ),
        graphqlClient.request<{ 
          approvedAbsencesForTrends: Array<{
            id: string;
            startDate: string;
            endDate: string;
            status: string;
            type: {
              id: string;
              parentEntryId: string;
              value: string;
            };
            employee: {
              id: string;
              firstName: string;
              lastName: string;
            };
          }>;
        }>(
          GET_USAGE_TRENDS_DATA, { supervisorId, currentYearStart, currentYearEnd }
        ),
        graphqlClient.request<{ 
          yearOverYearData: Array<{
            id: string;
            startDate: string;
            endDate: string;
            status: string;
            type: {
              id: string;
              parentEntryId: string;
              value: string;
            };
            employee: {
              id: string;
              firstName: string;
              lastName: string;
            };
          }>;
        }>(
          GET_YEAR_OVER_YEAR_DATA, { supervisorId, previousYearStart, currentYearEnd }
        ),
        graphqlClient.request<{ 
          approvedAbsencesForStreak: Array<{
            id: string;
            startDate: string;
            endDate: string;
            status: string;
            employee: {
              id: string;
              firstName: string;
              lastName: string;
            };
          }>;
        }>(
          GET_AVERAGE_WORK_STREAK, { supervisorId, currentYearStart, currentYearEnd }
        )
      ]);



      // Extract statistics from separate queries
      const approvedAbsencesCount = approvedAbsencesResult.EmployeeAbsenceAggregate?.aggregate?.count || 0;
      const pendingRequests = pendingRequestsResult.EmployeeAbsenceAggregate?.aggregate?.count || 0;
      const teamMembersAway = teamMembersAwayResult.EmployeeAbsenceAggregate?.aggregate?.count || 0;
      const upcomingAbsences = upcomingAbsencesResult.EmployeeAbsenceAggregate?.aggregate?.count || 0;
      const vacationCount = vacationAbsencesResult.EmployeeAbsenceAggregate?.aggregate?.count || 0;
      const sickLeaveCount = sickLeaveAbsencesResult.EmployeeAbsenceAggregate?.aggregate?.count || 0;
      
      // Extract planned vs unplanned statistics
      const allApprovedCount = plannedVsUnplannedResult.allApprovedAbsences?.aggregate?.count || 0;
      const vacationCountFromStats = plannedVsUnplannedResult.vacationAbsences?.aggregate?.count || 0;
      const sickLeaveCountFromStats = plannedVsUnplannedResult.sickLeaveAbsences?.aggregate?.count || 0;
      
      // Calculate planned and unplanned
      // Planned = ONLY vacation (not vacation + sick leave)
      // Formula: plannedAbsences = vacation absences count
      const plannedAbsences = vacationCountFromStats;
      const plannedAbsencesDays = 0; // For now, set to 0
      
      // Unplanned = everything else (including sick leave)
      // Formula: unplannedAbsences = all approved absences - planned absences
      const unplannedAbsences = allApprovedCount - plannedAbsences;
      const unplannedAbsencesDays = 0; // For now, set to 0
      
      // Calculate average days per request from approved absences only
      // Formula: averageDaysPerRequest = totalEffectiveDays ÷ approvedAbsencesCount
      // Only considers approved absences (not pending or rejected)
      // Uses effective days (not calendar days)
      // Result rounded to 1 decimal place
      const approvedAbsencesCountForAvg = averageDaysResult.approvedAbsencesWithDays?.aggregate?.count || 0;
      const totalEffectiveDays = averageDaysResult.approvedAbsencesWithDays?.aggregate?.sum?.effectiveDays || 0;
      
      const averageDaysPerRequest = approvedAbsencesCountForAvg > 0 
        ? (Math.round((totalEffectiveDays / approvedAbsencesCountForAvg) * 10) / 10).toFixed(1)
        : '0.0';
      
      // Calculate approval rate from approved and pending requests (CURRENT YEAR ONLY)
      // Formula: approvalRate = (approvedAbsences ÷ totalRequests) × 100
      // Where totalRequests = approvedAbsences + pendingRequests
      // Data filtered by current year: ${currentYear} (${currentYearStart} to ${currentYearEnd})
      const totalRequests = approvedAbsencesCount + pendingRequests;
      const approvalRate = totalRequests > 0 ? Math.round((approvedAbsencesCount / totalRequests) * 100) : 0;
      
      console.log('=== APPROVAL RATE CALCULATION (CURRENT YEAR) ===');
      console.log('Current year:', currentYear);
      console.log('Date range:', { currentYearStart, currentYearEnd });
      console.log('Approved absences count (current year):', approvedAbsencesCount);
      console.log('Pending requests (current year):', pendingRequests);
      console.log('Total requests (current year):', totalRequests);
      console.log('Approval rate:', approvalRate + '%');
      
      console.log('=== AVERAGE DAYS CALCULATION (CURRENT YEAR) ===');
      console.log('Approved absences count (current year):', approvedAbsencesCountForAvg);
      console.log('Total effective days (current year):', totalEffectiveDays);
      console.log('Average days per request:', averageDaysPerRequest);
      
      console.log('=== PLANNED VS UNPLANNED (CURRENT YEAR) ===');
      console.log('All approved absences (current year):', allApprovedCount);
      console.log('Vacation absences (current year):', vacationCountFromStats);
      console.log('Sick leave absences (current year):', sickLeaveCountFromStats);
      console.log('Planned absences (vacation only):', plannedAbsences);
      console.log('Unplanned absences (everything else):', unplannedAbsences);
      
      console.log('=== DASHBOARD STATISTICS (CURRENT YEAR) ===');
      console.log('Approved absences count (current year):', approvedAbsencesCount);
      console.log('Pending requests (current year):', pendingRequests);
      console.log('Team members away today (', today, '):', teamMembersAway);
      console.log('Upcoming absences (current year):', upcomingAbsences);
      console.log('Vacation absences (current year):', vacationCount);
      console.log('Sick leave absences (current year):', sickLeaveCount);


      // Extract usage trends data
      const absencesForTrends = usageTrendsResult.approvedAbsencesForTrends || [];
      
      // ========================================
      // YEAR-OVER-YEAR COMPARISON CALCULATION
      // ========================================
      // 
      // PURPOSE: Compare absence patterns between current year and previous year
      // DATA: Fetches absences spanning both years (current year - 1 to current year)
      // OUTPUT: Monthly absence counts for both years for chart visualization
      //
      // CALCULATION METHOD:
      // 1. Fetch absences that span both years (to handle absences crossing year boundaries)
      // 2. For each year, count absences active in each month
      // 3. Handle absences that span multiple months within a year
      // 4. Handle absences that cross year boundaries (e.g., Dec 2024 - Jan 2025)
      // 5. Create chart data with monthly counts for both years
      //
      // EXAMPLE:
      // Absence: Dec 28, 2024 - Jan 5, 2025
      // - Counts in Dec 2024: 4 days (Dec 28-31)
      // - Counts in Jan 2025: 5 days (Jan 1-5)
      //
      const yearOverYearRawData = yearOverYearResult.yearOverYearData || [];
      
      // Calculate monthly usage for both years
      const getMonthlyUsage = (absences: any[], year: number) => {
        const monthlyCounts = new Array(12).fill(0);
        
        absences.forEach(absence => {
          const startDate = dayjs(absence.startDate);
          const endDate = dayjs(absence.endDate);
          
          // Check if absence is active in the specified year
          // This handles absences that:
          // - Start and end within the year
          // - Start before the year but end within it (cross-year absences)
          // - Start within the year but end after it (cross-year absences)
          const isActiveInYear = (startDate.year() === year && startDate.month() >= 0 && startDate.month() < 12) ||
                                (endDate.year() === year && endDate.month() >= 0 && endDate.month() < 12) ||
                                (startDate.year() < year && endDate.year() > year);
          
          if (isActiveInYear) {
            // Count this absence in each month it spans within the specified year
            // Start counting from either the year start or the absence start (whichever is later)
            let currentDate = startDate.isBefore(dayjs().year(year).startOf('year')) 
              ? dayjs().year(year).startOf('year') 
              : startDate;
            const yearEnd = dayjs().year(year).endOf('year');
            
            // Iterate through each day of the absence within the specified year
            while (currentDate.isBefore(endDate) && currentDate.isBefore(yearEnd)) {
              const month = currentDate.month();
              if (month >= 0 && month < 12) {
                monthlyCounts[month]++;
              }
              currentDate = currentDate.add(1, 'day');
            }
          }
        });
        
        return monthlyCounts;
      };
      
      const currentYearMonthly = getMonthlyUsage(yearOverYearRawData, currentYear);
      const previousYearMonthly = getMonthlyUsage(yearOverYearRawData, previousYear);
      
      // Create chart data for year-over-year comparison
      const yearOverYearChartData = [
        { month: 'Jan', [previousYear]: previousYearMonthly[0], [currentYear]: currentYearMonthly[0] },
        { month: 'Feb', [previousYear]: previousYearMonthly[1], [currentYear]: currentYearMonthly[1] },
        { month: 'Mar', [previousYear]: previousYearMonthly[2], [currentYear]: currentYearMonthly[2] },
        { month: 'Apr', [previousYear]: previousYearMonthly[3], [currentYear]: currentYearMonthly[3] },
        { month: 'May', [previousYear]: previousYearMonthly[4], [currentYear]: currentYearMonthly[4] },
        { month: 'Jun', [previousYear]: previousYearMonthly[5], [currentYear]: currentYearMonthly[5] },
        { month: 'Jul', [previousYear]: previousYearMonthly[6], [currentYear]: currentYearMonthly[6] },
        { month: 'Aug', [previousYear]: previousYearMonthly[7], [currentYear]: currentYearMonthly[7] },
        { month: 'Sep', [previousYear]: previousYearMonthly[8], [currentYear]: currentYearMonthly[8] },
        { month: 'Oct', [previousYear]: previousYearMonthly[9], [currentYear]: currentYearMonthly[9] },
        { month: 'Nov', [previousYear]: previousYearMonthly[10], [currentYear]: currentYearMonthly[10] },
        { month: 'Dec', [previousYear]: previousYearMonthly[11], [currentYear]: currentYearMonthly[11] }
      ];
      
      console.log('=== YEAR OVER YEAR CALCULATION ===');
      console.log('Previous year:', previousYear);
      console.log('Current year:', currentYear);
      console.log('Previous year monthly counts:', previousYearMonthly);
      console.log('Current year monthly counts:', currentYearMonthly);
      console.log('Year-over-year chart data:', yearOverYearChartData);
      
      // ========================================
      // AVERAGE WORK STREAK CALCULATION
      // ========================================
      // 
      // PURPOSE: Calculate how many days on average employees work without taking an absence
      // EXCLUSION: Work leave absences are excluded (filtered in GraphQL query)
      // SCOPE: Current year only (January 1st to current date)
      // 
      // CALCULATION METHOD:
      // 1. Group absences by employee
      // 2. For each employee, sort absences chronologically
      // 3. Calculate work days between absences (excluding absence days themselves)
      // 4. Sum all work periods for each employee
      // 5. Average across all employees
      //
      // EXAMPLE:
      // Employee A absences: Jan 15-17, Mar 10-12, Jun 5-9
      // Work periods: Jan 1-14 (14 days), Jan 18-Mar 9 (52 days), Mar 13-Jun 4 (84 days), Jun 10-current (ongoing)
      // Total work streak for Employee A: 14 + 52 + 84 + ongoing = 150+ days
      //
      const absencesForStreak = averageWorkStreakResult.approvedAbsencesForStreak || [];
      
      // STEP 1: Group absences by employee ID for individual calculation
      const employeeAbsences: { [key: string]: any[] } = {};
      absencesForStreak.forEach(absence => {
        const employeeId = absence.employee.id;
        if (!employeeAbsences[employeeId]) {
          employeeAbsences[employeeId] = [];
        }
        employeeAbsences[employeeId].push(absence);
      });
      
      // STEP 2: Calculate individual work streaks for each employee
      const workStreaks: number[] = [];
      const currentDate = dayjs();
      const yearStart = dayjs().startOf('year'); // January 1st of current year
      
      Object.keys(employeeAbsences).forEach(employeeId => {
        // Sort absences chronologically to process in date order
        const employeeAbsenceList = employeeAbsences[employeeId].sort((a, b) => 
          dayjs(a.startDate).diff(dayjs(b.startDate))
        );
        
        let currentStreak = 0; // Total work days for this employee
        let lastAbsenceEnd = yearStart; // Track the end of the last absence processed
        
        // STEP 3: Process each absence chronologically
        employeeAbsenceList.forEach(absence => {
          const absenceStart = dayjs(absence.startDate);
          const absenceEnd = dayjs(absence.endDate);
          
          // Calculate work days between last absence end and this absence start
          // This represents the "work streak" between absences
          if (absenceStart.isAfter(lastAbsenceEnd)) {
            const workDays = absenceStart.diff(lastAbsenceEnd, 'day');
            currentStreak += workDays;
          }
          
          // Update last absence end to the latest end date
          // This handles overlapping absences by using the later end date
          if (absenceEnd.isAfter(lastAbsenceEnd)) {
            lastAbsenceEnd = absenceEnd;
          }
        });
        
        // STEP 4: Add work days from last absence to current date
        // This includes the ongoing work streak if employee hasn't been absent recently
        if (currentDate.isAfter(lastAbsenceEnd)) {
          const finalWorkDays = currentDate.diff(lastAbsenceEnd, 'day');
          currentStreak += finalWorkDays;
        }
        
        workStreaks.push(currentStreak);
      });
      
      // STEP 5: Calculate average work streak across all employees
      // Formula: (Sum of all employee work streaks) / (Number of employees)
      // Result rounded to 1 decimal place
      const averageWorkStreak = workStreaks.length > 0 
        ? (Math.round((workStreaks.reduce((sum, streak) => sum + streak, 0) / workStreaks.length) * 10) / 10).toFixed(1)
        : '0.0';
      
      console.log('=== AVERAGE WORK STREAK CALCULATION ===');
      console.log('Employee absences:', employeeAbsences);
      console.log('Work streaks:', workStreaks);
      console.log('Average work streak:', averageWorkStreak + ' days');
      
      // Calculate month with most sick absences
      const sickAbsencesByMonthQuery = GET_SICK_ABSENCES_BY_MONTH(currentYearStart, currentYearEnd);
      const sickAbsencesByMonthResult = await graphqlClient.request<{
        EmployeeAbsence: Array<{
          id: string;
          startDate: string;
          endDate: string;
          effectiveDays: number;
          employee: {
            id: string;
            firstName: string;
            lastName: string;
          };
        }>;
      }>(sickAbsencesByMonthQuery, { supervisorId, currentYearStart, currentYearEnd });

      const sickAbsences = sickAbsencesByMonthResult.EmployeeAbsence || [];
      
      // Group sick absences by month
      const monthlySickAbsences: { [key: string]: number } = {};
      sickAbsences.forEach(absence => {
        const month = dayjs(absence.startDate).format('MMMM');
        monthlySickAbsences[month] = (monthlySickAbsences[month] || 0) + 1;
      });

      // Find month with most sick absences
      let maxSickMonth = 'None';
      let maxSickCount = 0;
      Object.entries(monthlySickAbsences).forEach(([month, count]) => {
        if (count > maxSickCount) {
          maxSickCount = count;
          maxSickMonth = month;
        }
      });

      const finalStatistics = {
        pendingRequests,
        approvedAbsences: approvedAbsencesCount,
        teamMembersAway,
        upcomingAbsences,
        vacationCount,
        sickLeaveCount,
        averageDaysPerRequest,
        approvalRate,
        averageWorkStreak,
        // New field for sick absences by month
        sickAbsencesByMonth: {
          month: maxSickMonth,
          count: maxSickCount
        },
        // Statistics tab data
        plannedAbsences,
        plannedAbsencesDays,
        unplannedAbsences,
        unplannedAbsencesDays,
        absences: absencesForTrends,
        yearOverYearData: yearOverYearChartData
      };

      console.log('Final statistics object:', finalStatistics);
      setStatistics(finalStatistics);

    } catch (err) {
      console.error('Error fetching absence statistics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch statistics');
    } finally {
      setIsLoading(false);
    }
  }, [supervisorId, accessToken, graphqlClient]);

  useEffect(() => {
    if (accessToken && supervisorId) {
      fetchStatistics();
    }
  }, [accessToken, supervisorId, fetchStatistics]);

  return {
    statistics,
    isLoading,
    error,
    refetch: fetchStatistics
  };
}; 