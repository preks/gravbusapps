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
  GET_SICK_ABSENCES_BY_MONTH,
} from '../queries/DashboardQueries';
import {
  GET_PLANNED_VS_UNPLANNED_2025,
  GET_AVERAGE_DAYS_PER_REQUEST,
  GET_USAGE_TRENDS_DATA,
  GET_YEAR_OVER_YEAR_DATA,
  GET_AVERAGE_WORK_STREAK,
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
  averageWorkStreak: string;
  sickAbsencesByMonth: {
    month: string;
    count: number;
  };

  plannedAbsences: number;
  plannedAbsencesDays: number;
  unplannedAbsences: number;
  unplannedAbsencesDays: number;
  absences: any[];
  yearOverYearData: any[];
}

interface UseAbsenceStatisticsSimpleReturn {
  statistics: AbsenceStatistics;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useAbsenceStatisticsSimple = (
  context: BusinessAppContextProps,
): UseAbsenceStatisticsSimpleReturn => {
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
    sickAbsencesByMonth: {
      month: 'None',
      count: 0,
    },
    plannedAbsences: 0,
    plannedAbsencesDays: 0,
    unplannedAbsences: 0,
    unplannedAbsencesDays: 0,
    absences: [],
    yearOverYearData: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const graphqlClient = useGraphQLClient(accessToken);
  const catalogClient = useCatalogManagerClient(accessToken);

  const fetchStatistics = useCallback(async () => {
    if (!supervisorId) {
      setError('Supervisor ID is required');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const currentYear = new Date().getFullYear();
      const previousYear = currentYear - 1;
      const currentYearStart = `${currentYear}-01-01 00:00:00+00`;
      const currentYearEnd = `${currentYear}-12-31 23:59:59+00`;
      const previousYearStart = `${previousYear}-01-01 00:00:00+00`;

      const groupsResponse = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: 'AbsenceGroup',
          version: 'v1',
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
        },
      );

      const groupsMap: { [key: string]: string } = {};
      groupsResponse.data.forEach((group: any) => {
        groupsMap[group.id] = group.value;
      });

      const approvedAbsencesQuery = GET_APPROVED_ABSENCES_2025(currentYearStart, currentYearEnd);
      const pendingRequestsQuery = GET_PENDING_REQUESTS(currentYearStart, currentYearEnd);
      const teamMembersAwayQuery = GET_TEAM_MEMBERS_AWAY();
      const upcomingAbsencesQuery = GET_UPCOMING_ABSENCES(currentYearStart, currentYearEnd);
      const vacationAbsencesQuery = GET_VACATION_ABSENCES(currentYearStart, currentYearEnd);
      const sickLeaveAbsencesQuery = GET_SICK_ABSENCES(currentYearStart, currentYearEnd);

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
        averageWorkStreakResult,
      ] = await Promise.all([
        graphqlClient.request<{ EmployeeAbsenceAggregate: { aggregate: { count: number } } }>(
          approvedAbsencesQuery,
          { supervisorId, currentYearStart, currentYearEnd },
        ),
        graphqlClient.request<{ EmployeeAbsenceAggregate: { aggregate: { count: number } } }>(
          pendingRequestsQuery,
          { supervisorId, currentYearStart, currentYearEnd },
        ),
        graphqlClient.request<{ EmployeeAbsenceAggregate: { aggregate: { count: number } } }>(
          teamMembersAwayQuery,
          { supervisorId },
        ),
        graphqlClient.request<{ EmployeeAbsenceAggregate: { aggregate: { count: number } } }>(
          upcomingAbsencesQuery,
          { supervisorId, currentYearStart, currentYearEnd },
        ),
        graphqlClient.request<{ EmployeeAbsenceAggregate: { aggregate: { count: number } } }>(
          vacationAbsencesQuery,
          { supervisorId, currentYearStart, currentYearEnd },
        ),
        graphqlClient.request<{ EmployeeAbsenceAggregate: { aggregate: { count: number } } }>(
          sickLeaveAbsencesQuery,
          { supervisorId, currentYearStart, currentYearEnd },
        ),
        graphqlClient.request<{
          allApprovedAbsences: { aggregate: { count: number } };
          vacationAbsences: { aggregate: { count: number } };
          sickLeaveAbsences: { aggregate: { count: number } };
        }>(GET_PLANNED_VS_UNPLANNED_2025, { supervisorId, currentYearStart, currentYearEnd }),
        graphqlClient.request<{
          approvedAbsencesWithDays: {
            aggregate: { count: number; sum: { effectiveDays: number | null } };
          };
        }>(GET_AVERAGE_DAYS_PER_REQUEST, { supervisorId, currentYearStart, currentYearEnd }),
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
        }>(GET_USAGE_TRENDS_DATA, { supervisorId, currentYearStart, currentYearEnd }),
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
        }>(GET_YEAR_OVER_YEAR_DATA, { supervisorId, previousYearStart, currentYearEnd }),
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
        }>(GET_AVERAGE_WORK_STREAK, { supervisorId, currentYearStart, currentYearEnd }),
      ]);

      const approvedAbsencesCount =
        approvedAbsencesResult.EmployeeAbsenceAggregate?.aggregate?.count || 0;
      const pendingRequests = pendingRequestsResult.EmployeeAbsenceAggregate?.aggregate?.count || 0;
      const teamMembersAway = teamMembersAwayResult.EmployeeAbsenceAggregate?.aggregate?.count || 0;
      const upcomingAbsences =
        upcomingAbsencesResult.EmployeeAbsenceAggregate?.aggregate?.count || 0;
      const vacationCount = vacationAbsencesResult.EmployeeAbsenceAggregate?.aggregate?.count || 0;
      const sickLeaveCount =
        sickLeaveAbsencesResult.EmployeeAbsenceAggregate?.aggregate?.count || 0;

      const allApprovedCount = plannedVsUnplannedResult.allApprovedAbsences?.aggregate?.count || 0;
      const vacationCountFromStats =
        plannedVsUnplannedResult.vacationAbsences?.aggregate?.count || 0;

      const plannedAbsences = vacationCountFromStats;
      const plannedAbsencesDays = 0;

      const unplannedAbsences = allApprovedCount - plannedAbsences;
      const unplannedAbsencesDays = 0;

      const approvedAbsencesCountForAvg =
        averageDaysResult.approvedAbsencesWithDays?.aggregate?.count || 0;
      const totalEffectiveDays =
        averageDaysResult.approvedAbsencesWithDays?.aggregate?.sum?.effectiveDays || 0;

      const averageDaysPerRequest =
        approvedAbsencesCountForAvg > 0
          ? (Math.round((totalEffectiveDays / approvedAbsencesCountForAvg) * 10) / 10).toFixed(1)
          : '0.0';

      const totalRequests = approvedAbsencesCount + pendingRequests;
      const approvalRate =
        totalRequests > 0 ? Math.round((approvedAbsencesCount / totalRequests) * 100) : 0;

      const absencesForTrends = usageTrendsResult.approvedAbsencesForTrends || [];

      const yearOverYearRawData = yearOverYearResult.yearOverYearData || [];

      const getMonthlyUsage = (absences: any[], year: number) => {
        const monthlyCounts = new Array(12).fill(0);

        absences.forEach((absence) => {
          const startDate = dayjs(absence.startDate);
          const endDate = dayjs(absence.endDate);

          const isActiveInYear =
            (startDate.year() === year && startDate.month() >= 0 && startDate.month() < 12) ||
            (endDate.year() === year && endDate.month() >= 0 && endDate.month() < 12) ||
            (startDate.year() < year && endDate.year() > year);

          if (isActiveInYear) {
            let currentDate = startDate.isBefore(dayjs().year(year).startOf('year'))
              ? dayjs().year(year).startOf('year')
              : startDate;
            const yearEnd = dayjs().year(year).endOf('year');

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

      const yearOverYearChartData = [
        {
          month: 'Jan',
          [previousYear]: previousYearMonthly[0],
          [currentYear]: currentYearMonthly[0],
        },
        {
          month: 'Feb',
          [previousYear]: previousYearMonthly[1],
          [currentYear]: currentYearMonthly[1],
        },
        {
          month: 'Mar',
          [previousYear]: previousYearMonthly[2],
          [currentYear]: currentYearMonthly[2],
        },
        {
          month: 'Apr',
          [previousYear]: previousYearMonthly[3],
          [currentYear]: currentYearMonthly[3],
        },
        {
          month: 'May',
          [previousYear]: previousYearMonthly[4],
          [currentYear]: currentYearMonthly[4],
        },
        {
          month: 'Jun',
          [previousYear]: previousYearMonthly[5],
          [currentYear]: currentYearMonthly[5],
        },
        {
          month: 'Jul',
          [previousYear]: previousYearMonthly[6],
          [currentYear]: currentYearMonthly[6],
        },
        {
          month: 'Aug',
          [previousYear]: previousYearMonthly[7],
          [currentYear]: currentYearMonthly[7],
        },
        {
          month: 'Sep',
          [previousYear]: previousYearMonthly[8],
          [currentYear]: currentYearMonthly[8],
        },
        {
          month: 'Oct',
          [previousYear]: previousYearMonthly[9],
          [currentYear]: currentYearMonthly[9],
        },
        {
          month: 'Nov',
          [previousYear]: previousYearMonthly[10],
          [currentYear]: currentYearMonthly[10],
        },
        {
          month: 'Dec',
          [previousYear]: previousYearMonthly[11],
          [currentYear]: currentYearMonthly[11],
        },
      ];

      const absencesForStreak = averageWorkStreakResult.approvedAbsencesForStreak || [];

      const employeeAbsences: { [key: string]: any[] } = {};
      absencesForStreak.forEach((absence) => {
        const employeeId = absence.employee.id;
        if (!employeeAbsences[employeeId]) {
          employeeAbsences[employeeId] = [];
        }
        employeeAbsences[employeeId].push(absence);
      });

      const workStreaks: number[] = [];
      const currentDate = dayjs();
      const yearStart = dayjs().startOf('year');

      Object.keys(employeeAbsences).forEach((employeeId) => {
        const employeeAbsenceList = employeeAbsences[employeeId].sort((a, b) =>
          dayjs(a.startDate).diff(dayjs(b.startDate)),
        );

        let currentStreak = 0;
        let lastAbsenceEnd = yearStart;

        employeeAbsenceList.forEach((absence) => {
          const absenceStart = dayjs(absence.startDate);
          const absenceEnd = dayjs(absence.endDate);

          if (absenceStart.isAfter(lastAbsenceEnd)) {
            const workDays = absenceStart.diff(lastAbsenceEnd, 'day');
            currentStreak += workDays;
          }

          if (absenceEnd.isAfter(lastAbsenceEnd)) {
            lastAbsenceEnd = absenceEnd;
          }
        });

        if (currentDate.isAfter(lastAbsenceEnd)) {
          const finalWorkDays = currentDate.diff(lastAbsenceEnd, 'day');
          currentStreak += finalWorkDays;
        }

        workStreaks.push(currentStreak);
      });

      const averageWorkStreak =
        workStreaks.length > 0
          ? (
              Math.round(
                (workStreaks.reduce((sum, streak) => sum + streak, 0) / workStreaks.length) * 10,
              ) / 10
            ).toFixed(1)
          : '0.0';

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

      const monthlySickAbsences: { [key: string]: number } = {};
      sickAbsences.forEach((absence) => {
        const month = dayjs(absence.startDate).format('MMMM');
        monthlySickAbsences[month] = (monthlySickAbsences[month] || 0) + 1;
      });

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
        sickAbsencesByMonth: {
          month: maxSickMonth,
          count: maxSickCount,
        },
        plannedAbsences,
        plannedAbsencesDays,
        unplannedAbsences,
        unplannedAbsencesDays,
        absences: absencesForTrends,
        yearOverYearData: yearOverYearChartData,
      };

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
    refetch: fetchStatistics,
  };
};
