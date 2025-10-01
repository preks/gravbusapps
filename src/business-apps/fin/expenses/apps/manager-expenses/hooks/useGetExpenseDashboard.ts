import { useState, useEffect, useCallback } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { GET_EXPENSE_DASHBOARD_BY_MANAGER } from "../queries/expenseDashboard";
import { useGraphqlClient } from "@/common/network/graphql/useGraphQLClient";
import dayjs from "dayjs";

/**
 * Process raw expense data into monthly trends
 * @param data Raw expense request data from GraphQL
 * @returns Array of monthly expense trends with month name and total amount
 */
const processMonthlyTrends = (data: any[]): { month: string; amount: number }[] => {
  // Initialize an object to hold monthly totals
  const monthlyTotals: Record<string, number> = {};

  // Process each expense request
  data.forEach((item) => {
    if (item.requestDate && item.totalAmount) {
      // Format the month (e.g., 'Jan', 'Feb')
      const monthKey = dayjs(item.requestDate).format("MMM");

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
    const month = dayjs().year(currentYear).month(i).format("MMM");
    months.push(month);
  }

  // Convert to array format required for the chart
  return months.map((month) => ({
    month,
    amount: monthlyTotals[month] || 0,
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
export const useGetExpenseDashboard = (
  context?: BusinessAppContextProps,
  currencyFilter?: string,
): ExpenseDashboardResult => {
  const managerId =
    context?.userInfo?.employeeDetails?.employeeId ||
    context?.userInfo?.id ||
    "00000000-0000-0000-0000-000000000000";
  const [dashboardData, setDashboardData] = useState<ExpenseDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize the GraphQL client
  const accessToken = context?.accessToken || "";
  const graphQLClient = useGraphqlClient(accessToken);

  // Function to fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!accessToken) {
      setError("Access token not found. Cannot fetch dashboard data.");
      setDashboardData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (!graphQLClient) {
        throw new Error("GraphQL client not initialized");
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
      // Always use the dashboard filter (required)
      const formattedCurrencyRef = `Currency:v1:${currencyFilter || ''}`;

      // Make the request using the GraphQL client
      const result = await graphQLClient.request(GET_EXPENSE_DASHBOARD_BY_MANAGER, {
        managerId,
        startDate,
        yearStart,
        currencyRef: formattedCurrencyRef,
      });

      const data = result;

      // Process monthly expense trends data from the API
      const monthlyTrendsData = data?.MonthlyExpenseTrends ?? [];
      const monthlyTrends = processMonthlyTrends(monthlyTrendsData);

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

      // Create the dashboard data object with the correct values from the API response
      const mappedDashboardData: ExpenseDashboardData = {
        teamMembersCount: data?.TeamMembersAggregate?.aggregate?.count ?? 0, // Should be 3
        pendingApprovalsCount: data?.PendingApprovalsAggregate?.aggregate?.count ?? 0, // Should be 173
        monthlyExpensesAmount: data?.MonthlyExpensesAggregate?.aggregate?.sum?.totalAmount ?? 0, // Should be 402.50
        expenseCategoriesCount: distinctCategoryRefs.size, // Should be 7 (excluding null)
        recentRequests: (data?.RecentExpenseRequests ?? []).map((request: any) => ({
          id: request.id,
          title: request.title ?? "Untitled Request",
          totalAmount: request.totalAmount ?? 0,
          status: request.status ?? "PENDING",
          requestDate: request.requestDate
            ? new Date(request.requestDate).toISOString().split("T")[0]
            : "N/A",
          employeeName: request.employee?.firstName + " " + request.employee?.lastName,
        })),
        // Using hardcoded values for team budget (TeamBudget query commented out)
        teamBudget: {
          used:
            data?.ExpenseRequestsUsedAggregate?.aggregate?.sum?.totalAmount ??
            data?.MonthlyExpensesAggregate?.aggregate?.sum?.totalAmount ??
            0,
          total: data?.ExpensePlansTotalAggregate?.aggregate?.sum?.totalAmount ?? 0,
        },
        // Monthly expense trends data
        monthlyTrends,
      };

      setDashboardData(mappedDashboardData);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(err instanceof Error ? err.message : String(err));
      setDashboardData(null);
    } finally {
      setIsLoading(false);
    }
  }, [managerId, graphQLClient, currencyFilter]);

  // Initial fetch of dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    dashboardData,
    isLoading,
    error,
    refreshDashboard: fetchDashboardData,
  };
};
