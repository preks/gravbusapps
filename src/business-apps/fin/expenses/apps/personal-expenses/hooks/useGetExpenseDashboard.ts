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
  expensesByType: Record<string, number>;
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
    const employeeId = context?.userInfo?.employeeDetails?.employeeId;
    const accessToken = context?.accessToken;

    if (!employeeId) {
      setError(new Error('Employee ID not found. Cannot fetch dashboard statistics.'));
      setStats(null);
      setIsLoading(false);
      return;
    }

    if (!accessToken) {
      setError(new Error('Access token not found. Cannot fetch dashboard statistics.'));
      setStats(null);
      setIsLoading(false);
      return;
    }

    const fetchStats = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const currentMonthStart = dayjs().startOf('month').toISOString();
        const currentMonthEnd = dayjs().add(1, 'month').startOf('month').toISOString();
        const previousMonthStart = dayjs().subtract(1, 'month').startOf('month').toISOString();
        const previousMonthEnd = dayjs().startOf('month').toISOString();

        const currentQuarterStart = dayjs().startOf('quarter').toISOString();
        const currentQuarterEnd = dayjs().add(1, 'quarter').startOf('quarter').toISOString();
        const previousQuarterStart = dayjs().subtract(1, 'quarter').startOf('quarter').toISOString();
        const previousQuarterEnd = dayjs().startOf('quarter').toISOString();

        const currentYearStart = dayjs().startOf('year').toISOString();
        const currentYearEnd = dayjs().add(1, 'year').startOf('year').toISOString();
        const previousYearStart = dayjs().subtract(1, 'year').startOf('year').toISOString();
        const previousYearEnd = dayjs().startOf('year').toISOString();

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
              currentDate: dayjs().toISOString(),
              currentMonthStart,
              currentMonthEnd,
              previousMonthStart,
              previousMonthEnd,
              currentQuarterStart,
              currentQuarterEnd,
              previousQuarterStart,
              previousQuarterEnd,
              currentYearStart,
              currentYearEnd,
              previousYearStart,
              previousYearEnd,
              currency: 'Currency:v1:EUR',
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
        console.log('Full query data:', data);
        
        // Process expenses by type to create a summary object
        const expenseTypes: Record<string, number> = {};
        data?.expensesByType?.forEach((item: any) => {
          const type = item.expenseClass?.value || 'Other';
          if (!expenseTypes[type]) {
            expenseTypes[type] = 0;
          }
          expenseTypes[type] += item.totalAmount || 0;
        });
        
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
          expensesByType: expenseTypes,
          expenseItemsWithoutReceipts: data?.itemsWithoutReceipts?.aggregate?.count ?? 0,
        };
        
        setStats(expenseDashboard);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setStats(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [context]); // Re-run effect if context changes

  return { stats, isLoading, error: error?.message ?? null };
};
