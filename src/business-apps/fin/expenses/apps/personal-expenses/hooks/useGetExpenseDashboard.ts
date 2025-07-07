import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
dayjs.extend(quarterOfYear);
import { useState, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { GET_EXPENSE_DASHBOARD_BY_EMPLOYEE } from '../queries/expenseDashboard';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';

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
  const graphqlClient = useGraphqlClient(context?.accessToken ?? '');

  useEffect(() => {
    const employeeId = context?.userInfo?.employeeDetails?.employeeId;

    if (!employeeId || !context?.accessToken) {
      setError(new Error('Employee ID or Access Token not found.'));
      setIsLoading(false);
      return;
    }

    const fetchStats = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const now = dayjs();
        const variables = {
          employeeId,
          currency: 'Currency:v1:EUR',
          currentDate: now.toISOString(),
          currentMonthStart: now.startOf('month').toISOString(),
          currentMonthEnd: now.endOf('month').toISOString(),
          previousMonthStart: now.subtract(1, 'month').startOf('month').toISOString(),
          previousMonthEnd: now.subtract(1, 'month').endOf('month').toISOString(),
          currentQuarterStart: now.startOf('quarter').toISOString(),
          currentQuarterEnd: now.endOf('quarter').toISOString(),
          previousQuarterStart: now.subtract(1, 'quarter').startOf('quarter').toISOString(),
          previousQuarterEnd: now.subtract(1, 'quarter').endOf('quarter').toISOString(),
          currentYearStart: now.startOf('year').toISOString(),
          currentYearEnd: now.endOf('year').toISOString(),
          previousYearStart: now.subtract(1, 'year').startOf('year').toISOString(),
          previousYearEnd: now.subtract(1, 'year').endOf('year').toISOString(),
          currentMonthStartTz: now.startOf('month').toISOString(),
          currentMonthEndTz: now.endOf('month').toISOString(),
          currentQuarterStartTz: now.startOf('quarter').toISOString(),
          currentQuarterEndTz: now.endOf('quarter').toISOString(),
          currentYearStartTz: now.startOf('year').toISOString(),
          currentYearEndTz: now.endOf('year').toISOString(),
        };

        const data = await graphqlClient.request(GET_EXPENSE_DASHBOARD_BY_EMPLOYEE, variables);

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
        
        setStats(expenseDashboard);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setStats(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [graphqlClient, context?.accessToken, context?.userInfo?.employeeDetails?.employeeId]);

  return { stats, isLoading, error: error?.message ?? null };
};
