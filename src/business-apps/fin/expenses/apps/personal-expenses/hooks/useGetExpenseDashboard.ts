import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
dayjs.extend(quarterOfYear);
import { useState, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { GET_EXPENSE_DASHBOARD_BY_EMPLOYEE } from '../queries/expenseDashboard';
import { env } from '@/common/env/EnvUtils';

export interface ExpenseDashboard {
  pendingPayouts: number;
  bookedExpenseRequests: number;
  pendingAdvancePayments: number;
  currentMonthExpenses: {
    total: number;
    count: number;
  };
  previousMonthExpenses: {
    total: number;
    count: number;
  };
  currentQuarterExpenses: {
    total: number;
    count: number;
  };
  previousQuarterExpenses: {
    total: number;
    count: number;
  };
  currentYearExpenses: {
    total: number;
    count: number;
  };
  previousYearExpenses: {
    total: number;
    count: number;
  };
  flaggedItems: number;
  upcomingTrips: number;
  recentActivity: Array<{
    id: string;
    title: string;
    status: string;
    updatedAt: string;
    totalAmount: number;
    expenseType?: string;
    expenseDate?: string;
  }>;
  expensesByTypeMonth: Record<string, number>;
  expensesByTypeQuarter: Record<string, number>;
  expensesByTypeYear: Record<string, number>;
  expenseItemsWithoutReceipts: number;
}

export interface ExpenseDashboardDataView {
  stats: ExpenseDashboard | null;
  isLoading: boolean;
  error: string | null;
}

export const useGetExpenseDashboard = (context?: BusinessAppContextProps): ExpenseDashboardDataView => {
  const [stats, setStats] = useState<ExpenseDashboard | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    console.log('useGetExpenseDashboard: useEffect triggered.');
    const employeeId = context?.userInfo?.employeeDetails?.employeeId;
    const accessToken = context?.accessToken;
    console.log('useGetExpenseDashboard: employeeId:', employeeId);
    console.log('useGetExpenseDashboard: accessToken:', !!accessToken);

    if (!employeeId) {
      console.error('useGetExpenseDashboard: Employee ID not found.');
      setError(new Error('Employee ID not found. Cannot fetch dashboard statistics.'));
      setStats(null);
      setIsLoading(false);
      return;
    }

    if (!accessToken) {
      console.error('useGetExpenseDashboard: Access token not found.');
      setError(new Error('Access token not found. Cannot fetch dashboard statistics.'));
      setStats(null);
      setIsLoading(false);
      return;
    }

    const fetchStats = async () => {
      console.log('useGetExpenseDashboard: fetchStats called.');
      setIsLoading(true);
      setError(null);
      try {
        console.log('useGetExpenseDashboard: Starting fetch...');
        const now = dayjs();

        // Define date range objects
        const currentMonth = { start: now.startOf('month'), end: now.endOf('month') };
        const previousMonth = { start: now.subtract(1, 'month').startOf('month'), end: now.subtract(1, 'month').endOf('month') };
        const currentQuarter = { start: now.startOf('quarter'), end: now.endOf('quarter') };
        const previousQuarter = { start: now.subtract(1, 'quarter').startOf('quarter'), end: now.subtract(1, 'quarter').endOf('quarter') };
        const currentYear = { start: now.startOf('year'), end: now.endOf('year') };
        const previousYear = { start: now.subtract(1, 'year').startOf('year'), end: now.subtract(1, 'year').endOf('year') };

        const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            query: GET_EXPENSE_DASHBOARD_BY_EMPLOYEE,
            variables: {
              employeeId,
              currency: 'Currency:v1:EUR',

              // timestamp variables
              currentDate: now.toISOString(),
              currentMonthStart: currentMonth.start.toISOString(),
              currentMonthEnd: currentMonth.end.toISOString(),
              previousMonthStart: previousMonth.start.toISOString(),
              previousMonthEnd: previousMonth.end.toISOString(),
              currentQuarterStart: currentQuarter.start.toISOString(),
              currentQuarterEnd: currentQuarter.end.toISOString(),
              previousQuarterStart: previousQuarter.start.toISOString(),
              previousQuarterEnd: previousQuarter.end.toISOString(),
              currentYearStart: currentYear.start.toISOString(),
              currentYearEnd: currentYear.end.toISOString(),
              previousYearStart: previousYear.start.toISOString(),
              previousYearEnd: previousYear.end.toISOString(),

              // timestamptz variables
              currentMonthStartTz: currentMonth.start.toISOString(),
              currentMonthEndTz: currentMonth.end.toISOString(),
              currentQuarterStartTz: currentQuarter.start.toISOString(),
              currentQuarterEndTz: currentQuarter.end.toISOString(),
              currentYearStartTz: currentYear.start.toISOString(),
              currentYearEndTz: currentYear.end.toISOString(),
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        if (result.errors && result.errors.length > 0) {
          throw new Error(result.errors.map((e: any) => e.message).join(', '));
        }
        
        const data = result.data;
        const processExpensesByType = (expenseData: any[]): Record<string, number> => {
          const expenseTypes: Record<string, number> = {};
          expenseData?.forEach((item: any) => {
            const type = item.expenseGroup?.value || 'Other';
            if (!expenseTypes[type]) {
              expenseTypes[type] = 0;
            }
            expenseTypes[type] += item.totalAmount || 0;
          });
          return expenseTypes;
        };

        const expensesByTypeMonth = processExpensesByType(data?.expensesByTypeMonth);
        const expensesByTypeQuarter = processExpensesByType(data?.expensesByTypeQuarter);
        const expensesByTypeYear = processExpensesByType(data?.expensesByTypeYear);

        const bookedExpenseRequests = data?.bookedExpenseRequests?.aggregate?.sum?.totalAmount ?? 0;
        const pendingAdvancePayments = data?.pendingAdvancePayments?.aggregate?.sum?.amount ?? 0;

        const expenseDashboard: ExpenseDashboard = {
          pendingPayouts: bookedExpenseRequests + pendingAdvancePayments,
          bookedExpenseRequests: bookedExpenseRequests,
          pendingAdvancePayments: pendingAdvancePayments,
          currentMonthExpenses: {
            total: data?.currentMonthExpenses?.aggregate?.sum?.totalAmount ?? 0,
            count: data?.currentMonthExpenses?.aggregate?.count ?? 0,
          },
          previousMonthExpenses: {
            total: data?.previousMonthExpenses?.aggregate?.sum?.totalAmount ?? 0,
            count: data?.previousMonthExpenses?.aggregate?.count ?? 0,
          },
          currentQuarterExpenses: {
            total: data?.currentQuarterExpenses?.aggregate?.sum?.totalAmount ?? 0,
            count: data?.currentQuarterExpenses?.aggregate?.count ?? 0,
          },
          previousQuarterExpenses: {
            total: data?.previousQuarterExpenses?.aggregate?.sum?.totalAmount ?? 0,
            count: data?.previousQuarterExpenses?.aggregate?.count ?? 0,
          },
          currentYearExpenses: {
            total: data?.currentYearExpenses?.aggregate?.sum?.totalAmount ?? 0,
            count: data?.currentYearExpenses?.aggregate?.count ?? 0,
          },
          previousYearExpenses: {
            total: data?.previousYearExpenses?.aggregate?.sum?.totalAmount ?? 0,
            count: data?.previousYearExpenses?.aggregate?.count ?? 0,
          },
          flaggedItems: data?.flaggedItems?.aggregate?.count ?? 0,
          upcomingTrips: data?.upcomingTrips?.aggregate?.count ?? 0,
          recentActivity: data?.recentActivity?.map((item: any) => ({
            id: item.id,
            title: item.title ?? 'Unnamed Item',
            status: item.status ?? 'Unknown',
            updatedAt: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'N/A',
            totalAmount: item.totalAmount ?? 0,
            expenseType: item.expenseClass?.value ?? 'General',
            expenseDate: item.expenseDate ? new Date(item.expenseDate).toLocaleDateString() : 'N/A',
          })) ?? [],
          expensesByTypeMonth,
          expensesByTypeQuarter,
          expensesByTypeYear,
          expenseItemsWithoutReceipts: data?.itemsWithoutReceipts?.aggregate?.count ?? 0,
        };
        
        console.log('useGetExpenseDashboard: Fetch successful, data processed.');
        setStats(expenseDashboard);
      } catch (err) {
        console.error('useGetExpenseDashboard: Fetch error:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setStats(null);
      } finally {
        console.log('useGetExpenseDashboard: Fetch finished.');
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [context?.accessToken, context?.userInfo?.employeeDetails?.employeeId]);

  return { stats, isLoading, error: error?.message ?? null };
};
