import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { GET_EXPENSE_DASHBOARD_BY_MANAGER } from '../queries/expenseDashboard';

// Define types for the dashboard data
export interface ExpenseDashboardData {
  teamMembersCount: number;
  pendingApprovalsCount: number;
  monthlyExpensesTotal: number;
  expenseCategoriesCount: number;
  recentRequests: {
    id: string;
    title: string;
    totalAmount: number; // Changed from amount
    status: string;
    requestDate: string;
    employeeName: string;
  }[];
  teamBudget?: {
    used: number;
    total: number;
  };
}

export interface ExpenseDashboardResult {
  dashboardData: ExpenseDashboardData | null;
  isLoading: boolean;
  error: string | null;
  refreshDashboard: () => Promise<void>;
}

/**
 * Hook to fetch expense dashboard data for a manager
 * @param context Business app context containing user info and access token
 * @returns Object containing dashboard data, loading state, error, and refresh function
 */
export const useGetExpenseDashboard = (context?: BusinessAppContextProps): ExpenseDashboardResult => {
  const [dashboardData, setDashboardData] = useState<ExpenseDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    const managerId = context?.userInfo?.employeeDetails?.employeeId;
    const accessToken = context?.accessToken;

    if (!managerId) {
      setError('Manager ID not found. Cannot fetch dashboard data.');
      setDashboardData(null);
      setIsLoading(false);
      return;
    }

    if (!accessToken) {
      setError('Access token not found. Cannot fetch dashboard data.');
      setDashboardData(null);
      setIsLoading(false);
      return;
    }

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
          query: GET_EXPENSE_DASHBOARD_BY_MANAGER,
          variables: { 
            managerId,
            startDate: (() => {
              const date = new Date();
              date.setDate(date.getDate() - 30);
              date.setUTCHours(0, 0, 0, 0); // Set time to midnight UTC
              return date.toISOString();
            })()
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
      
      // Map the response to our dashboard data structure
      const mappedDashboardData: ExpenseDashboardData = {
        teamMembersCount: data?.TeamMembersAggregate?.aggregate?.count ?? 0,
        pendingApprovalsCount: data?.PendingApprovalsAggregate?.aggregate?.count ?? 0,
        monthlyExpensesTotal: data?.MonthlyExpensesAggregate?.aggregate?.sum?.totalAmount ?? 0, // Changed to totalAmount
        expenseCategoriesCount: 5, // Default value for now, can be updated with actual data later
        recentRequests: (data?.RecentExpenseRequests ?? []).map((request: any) => ({
          id: request.id,
          title: request.title ?? 'Untitled Request',
          totalAmount: request.totalAmount ?? 0, // Changed from amount to totalAmount
          status: request.status ?? 'PENDING',
          requestDate: request.requestDate ? new Date(request.requestDate).toISOString().split('T')[0] : 'N/A',
          employeeName: request.employee?.fullName ?? 'Unknown Employee',
        })),
        teamBudget: {
          used: data?.MonthlyExpensesAggregate?.aggregate?.sum?.totalAmount ?? 0,
          total: 5000 // Default budget value, should be replaced with actual budget data
        }
      };
      
      setDashboardData(mappedDashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setDashboardData(null);
    } finally {
      setIsLoading(false);
    }
  }, [context?.accessToken, context?.userInfo?.employeeDetails?.employeeId]);

  // Initial fetch of dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    dashboardData,
    isLoading,
    error,
    refreshDashboard: fetchDashboardData
  };
};
