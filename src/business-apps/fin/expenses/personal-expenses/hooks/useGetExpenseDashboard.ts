import { useState, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { GET_EXPENSE_DASHBOARD_BY_EMPLOYEE } from '../queries/expenseDashboard';

export interface ExpenseDashboard {
  pendingPayouts: number;
  currentMonthExpenses: {
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
  }>;
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
        const response = await fetch('https://newwork-dev.newwork.com/v1/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            query: GET_EXPENSE_DASHBOARD_BY_EMPLOYEE,
            variables: { employeeId },
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
        
        const expenseDashboard: ExpenseDashboard = {
          pendingPayouts: data?.pendingPayouts?.aggregate?.sum?.totalAmount ?? 0,
          currentMonthExpenses: {
            total: data?.currentMonthExpenses?.aggregate?.sum?.totalAmount ?? 0,
            count: data?.currentMonthExpenses?.aggregate?.count ?? 0,
          },
          flaggedItems: data?.flaggedItems?.aggregate?.count ?? 0,
          upcomingTrips: data?.upcomingTrips?.aggregate?.count ?? 0,
          recentActivity: data?.recentActivity?.map((item: any) => ({
            id: item.id,
            title: item.title ?? 'Unnamed Item',
            status: item.status ?? 'Unknown',
            updatedAt: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'N/A',
            totalAmount: item.totalAmount ?? 0,
          })) ?? [],
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
