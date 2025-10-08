import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
dayjs.extend(quarterOfYear);
import { useState, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { GET_EXPENSE_DASHBOARD_BY_EMPLOYEE } from '../queries/expenseDashboard';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { buildDashboardVariables } from '../../personal-expenses/utils/dateRanges';
import { transformDashboardResponse } from '../../personal-expenses/utils/transformExpenseDashboard';

export interface ExpenseDashboard {
  pendingPayouts: number;
  bookedExpenseRequests: number;
  pendingAdvancePayments: number;
  bookedAndPendingCount: number;
  pendingItems: number;
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
    expenseRequest?: {
      id: string;
      title: string;
      status: string;
    };
    expensePlan?: {
      id: string;
      title: string;
      status: string;
    };
    status: string;
    updatedAt: string;
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

export const useGetExpenseDashboard = (
  context?: BusinessAppContextProps,
  filters?: { currency?: string; period?: 'monthly' | 'quarterly' | 'yearly' }
): ExpenseDashboardDataView => {
  const [stats, setStats] = useState<ExpenseDashboard | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const graphqlClient = useGraphQLClient(context?.accessToken || '');

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
        const selectedCurrency = filters?.currency || 'Currency:v1:EUR';
        const selectedPeriod: 'monthly' | 'quarterly' | 'yearly' = filters?.period || 'monthly';

        const variables = buildDashboardVariables(employeeId, selectedCurrency, now, selectedPeriod);

        const data = await graphqlClient.request(GET_EXPENSE_DASHBOARD_BY_EMPLOYEE, variables);
        const expenseDashboard = transformDashboardResponse(data, selectedPeriod);
        setStats(expenseDashboard as ExpenseDashboard);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setStats(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [graphqlClient, context?.accessToken, context?.userInfo?.employeeDetails?.employeeId, filters?.currency, filters?.period]);

  return { stats, isLoading, error: error?.message ?? null };
};
