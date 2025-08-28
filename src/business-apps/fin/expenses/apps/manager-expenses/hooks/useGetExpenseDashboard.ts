import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { GET_EXPENSE_DASHBOARD_BY_MANAGER } from '../queries/expenseDashboard';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import dayjs from 'dayjs';

/**
 * Process raw expense data into monthly trends
 * @param data Raw expense request data from GraphQL
 * @returns Array of monthly expense trends with month name and total amount
 * @note Currently unused - will be used when real data queries are re-enabled
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const processMonthlyTrends = (data: any[]): { month: string; amount: number }[] => {
  // Initialize an object to hold monthly totals
  const monthlyTotals: Record<string, number> = {};
  
  // Process each expense request
  data.forEach((item) => {
    if (item.requestDate && item.totalAmount) {
      // Format the month (e.g., 'Jan', 'Feb')
      const monthKey = dayjs(item.requestDate).format('MMM');
      
      // Add to the monthly total
      if (!monthlyTotals[monthKey]) {
        monthlyTotals[monthKey] = 0;
      }
      monthlyTotals[monthKey] += Number(item.totalAmount);
    }
  });
  
  // Get all months of the current year
  const currentYear = dayjs().year();
  const months = [];
  for (let i = 0; i < 12; i++) {
    const month = dayjs().year(currentYear).month(i).format('MMM');
    months.push(month);
  }
  
  // Convert to array format required for the chart
  return months.map(month => ({
    month,
    amount: monthlyTotals[month] || 0
  }));
};

// Monthly trends are now fetched from the backend

// Define types for the dashboard data
export interface ExpenseDashboardData {
  teamMembersCount: number;
  pendingApprovalsCount: number;
  monthlyExpensesAmount: number;
  expenseCategoriesCount: number;
  recentRequests: {
    id: string;
    title: string;
    totalAmount: number; 
    status: string;
    requestDate: string;
    employeeName: string;
  }[];
  teamBudget: {
    used: number;
    total: number;
  };
  monthlyTrends: {
    month: string;
    amount: number;
  }[];
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
export const useGetExpenseDashboard = (context?: BusinessAppContextProps, currencyFilter?: string): ExpenseDashboardResult => {
  const [dashboardData, setDashboardData] = useState<ExpenseDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize the GraphQL client
  const accessToken = context?.accessToken || '';
  const graphQLClient = useGraphqlClient(accessToken);

  // Function to fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    // Use the real manager ID from userInfo with a fallback UUID for development
    const managerId = context?.userInfo?.employeeDetails?.employeeId || context?.userInfo?.id || '00000000-0000-0000-0000-000000000000';
    const accessToken = context?.accessToken;

    // Skip the managerId check since we're using a hardcoded value for testing
    // if (!managerId) {
    //   setError('Manager ID not found. Cannot fetch dashboard data.');
    //   setDashboardData(null);
    //   setIsLoading(false);
    //   return;
    // }

    if (!accessToken) {
      setError('Access token not found. Cannot fetch dashboard data.');
      setDashboardData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching dashboard data with:', {
        managerId,
        accessToken: !!accessToken
      });
      
      if (!graphQLClient) {
        throw new Error('GraphQL client not initialized');
      }
      
      // Prepare the dates for the query
      const now = new Date();
      
      // Start date for recent requests (30 days ago)
      const startDate = (() => {
        const date = new Date(now);
        date.setDate(date.getDate() - 30);
        date.setUTCHours(0, 0, 0, 0); // Set time to midnight UTC
        return date.toISOString();
      })();
      
      // Start date for yearly trends (beginning of current year)
      const yearStart = (() => {
        const date = new Date(now.getFullYear(), 0, 1); // January 1st of current year
        date.setUTCHours(0, 0, 0, 0);
        return date.toISOString();
      })();
      
      // Format the currency reference for the database query (Currency:v1:CODE format)
      const formattedCurrencyRef = currencyFilter ? `Currency:v1:${currencyFilter}` : undefined;
      
      // Make the request using the GraphQL client
      const result = await graphQLClient.request(
        GET_EXPENSE_DASHBOARD_BY_MANAGER,
        { managerId, startDate, yearStart, currencyRef: formattedCurrencyRef }
      );
      
      const data = result;
      
      console.log('Raw GraphQL response:', result);
      
      // Commented out due to external GraphQL API issues
      // Get distinct expense categories count from the ExpensePositions query
      // const expensePositions = data?.ExpensePositions ?? [];
      // const uniqueExpenseGroupRefs = new Set<string>();
      // 
      // expensePositions.forEach((position: any) => {
      //   if (position.expensegroupRef) {
      //     uniqueExpenseGroupRefs.add(position.expensegroupRef);
      //   }
      // });
      
      // Process monthly expense trends data from the API
      const monthlyTrendsData = data?.MonthlyExpenseTrends ?? [];
      const monthlyTrends = processMonthlyTrends(monthlyTrendsData);
      
      // Log the data for debugging
      console.log('Dashboard data received:', {
        teamMembers: data?.TeamMembers?.length,
        teamMembersCount: data?.TeamMembersAggregate?.aggregate?.count,
        pendingApprovalsCount: data?.PendingApprovalsAggregate?.aggregate?.count,
        monthlyExpensesAmount: data?.MonthlyExpensesAggregate?.aggregate?.sum?.totalAmount,
        expenseCategories: data?.ExpenseCategories?.length,
        distinctCategories: data?.DistinctExpenseCategories?.length,
        recentRequestsCount: data?.RecentExpenseRequests?.length,
        monthlyTrendsCount: data?.MonthlyExpenseTrends?.length
      });
      
      // Map the response to our dashboard data structure
      // Calculate the values from the API response
      const teamMembersCount = data?.TeamMembersAggregate?.aggregate?.count ?? 0;
      const pendingApprovalsCount = data?.PendingApprovalsAggregate?.aggregate?.count ?? 0;
      const monthlyExpensesAmount = data?.MonthlyExpensesAggregate?.aggregate?.sum?.totalAmount ?? 0;
      
      // Count distinct expense categories (excluding null values)
      const distinctCategoryRefs = new Set();
      if (data?.DistinctExpenseCategories && Array.isArray(data.DistinctExpenseCategories)) {
        data.DistinctExpenseCategories.forEach((category: any) => {
          if (category.expenseGroupRef) {
            distinctCategoryRefs.add(category.expenseGroupRef);
          }
        });
      }
      // There should be 7 distinct categories (excluding null)
      const expenseCategoriesCount = distinctCategoryRefs.size;
      
      console.log('Final dashboard values (calculated):', {
        teamMembersCount,
        pendingApprovalsCount,
        monthlyExpensesAmount,
        expenseCategoriesCount,
        distinctCategoryRefs: Array.from(distinctCategoryRefs)
      });
      
      // Verify against expected values from the provided GraphQL response
      console.log('Verification against expected values:', {
        teamMembersCount: {
          expected: 3,
          actual: teamMembersCount,
          matches: teamMembersCount === 3
        },
        pendingApprovalsCount: {
          expected: 173,
          actual: pendingApprovalsCount,
          matches: pendingApprovalsCount === 173
        },
        monthlyExpensesAmount: {
          expected: 402.50,
          actual: monthlyExpensesAmount,
          matches: Math.abs(monthlyExpensesAmount - 402.50) < 0.01
        },
        expenseCategoriesCount: {
          expected: 7,
          actual: expenseCategoriesCount,
          matches: expenseCategoriesCount === 7
        }
      });
      
      // Create the dashboard data object with the correct values from the API response
      const mappedDashboardData: ExpenseDashboardData = {
        teamMembersCount: data?.TeamMembersAggregate?.aggregate?.count ?? 0, // Should be 3
        pendingApprovalsCount: data?.PendingApprovalsAggregate?.aggregate?.count ?? 0, // Should be 173
        monthlyExpensesAmount: data?.MonthlyExpensesAggregate?.aggregate?.sum?.totalAmount ?? 0, // Should be 402.50
        expenseCategoriesCount: distinctCategoryRefs.size, // Should be 7 (excluding null)
        recentRequests: (data?.RecentExpenseRequests ?? []).map((request: any) => ({
          id: request.id,
          title: request.title ?? 'Untitled Request',
          totalAmount: request.totalAmount ?? 0,
          status: request.status ?? 'PENDING',
          requestDate: request.requestDate ? new Date(request.requestDate).toISOString().split('T')[0] : 'N/A',
          employeeName: request.employee?.fullName ?? 'Unknown Employee',
        })),
        // Using hardcoded values for team budget (TeamBudget query commented out)
        teamBudget: {
          used: data?.MonthlyExpensesAggregate?.aggregate?.sum?.totalAmount ?? 0,
          total: 10000 // Default budget value
        },
        // Monthly expense trends data
        monthlyTrends
      };
      
      // Log the final mapped dashboard data
      console.log('Final mapped dashboard data:', mappedDashboardData);
      
      setDashboardData(mappedDashboardData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : String(err));
      setDashboardData(null);
    } finally {
      setIsLoading(false);
    }
  }, [context?.userInfo?.employeeDetails?.employeeId, graphQLClient]);

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
