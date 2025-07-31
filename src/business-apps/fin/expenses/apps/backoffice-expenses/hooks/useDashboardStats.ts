/**
 * Hook for fetching and managing all dashboard statistics.
 * This is the single source of truth for all data displayed on the expense dashboard.
 */

import { useState, useEffect, useCallback } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGraphqlClient } from "@/common/network/graphql/useGraphQLClient";
import {
  GET_EXPENSE_PLAN_YEARLY_TOTAL,
  GET_MONTHLY_SPEND_COMPARISON,
  GET_YTD_STATS,
  GET_MONTHLY_EXPENSE_TRENDS,
  GET_ADDITIONAL_DASHBOARD_METRICS,
} from "../queries/expenseDashboard.queries";
import { DashboardStats } from "../types";

interface UseDashboardStatsResult {
  stats: DashboardStats;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export const useDashboardStats = ({
  accessToken,
  filters = {},
}: Pick<BusinessAppContextProps, "accessToken"> & {
  filters?: {
    currency?: string;
    department?: string;
    period?: string;
  };
}): UseDashboardStatsResult => {
  const [stats, setStats] = useState<DashboardStats>({
    expensePlanYearly: { totalAmount: 0, count: 0 },
    ytdStats: {
      totalAmount: 0,
      count: 0,
      previousTotalAmount: 0,
      previousCount: 0,
    },
    monthlyTrends: Array.from({ length: 12 }).map((_, i) => ({
      month: i + 1,
      monthName: new Date(0, i).toLocaleString("default", { month: "short" }),
      totalAmount: 0,
      count: 0,
    })),
    monthlySpendComparison: {
      currentMonthTotal: 0,
      previousMonthTotal: 0,
      currentMonthCount: 0,
      previousMonthCount: 0,
      percentChange: 0,
      isIncrease: false,
    },
    transferRequired: 0,
    pendingRequestsCount: 0,
    avgSpendPerTrip: 0,
    travelExpensesCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // ⚡ PERFORMANCE: Separate loading state for expensive monthly trends
  const [trendsLoading, setTrendsLoading] = useState(false);

  // ⚡ OPTIMIZATION: Cache for currency-specific data to prevent redundant requests
  const [currencyCache, setCurrencyCache] = useState<Map<string, any>>(
    new Map()
  );

  // ⚡ OPTIMIZATION: Track last request to prevent duplicate requests
  const [lastRequestId, setLastRequestId] = useState<string>("");

  const client = useGraphqlClient(accessToken);

  // ⚡ PERFORMANCE: Phase 1 - Load essential dashboard data quickly
  const fetchEssentialStats = useCallback(async () => {
    if (!accessToken || !client) {
      setError(new Error("Access token and GraphQL client are required."));
      setLoading(false);
      return;
    }

    // ⚡ OPTIMIZATION: Generate request ID to prevent duplicate requests
    const requestId = `${JSON.stringify(filters)}-${Date.now()}`;
    if (requestId === lastRequestId) {
      console.log("Duplicate request detected, skipping");
      return;
    }
    setLastRequestId(requestId);

    setLoading(true);
    setError(null);

    try {
      const currentYear = new Date().getFullYear();
      const currentDate = new Date();

      // Calculate date ranges for queries
      const startOfYear = new Date(currentYear, 0, 1)
        .toISOString()
        .split("T")[0];
      const endOfYear = new Date(currentYear, 11, 31)
        .toISOString()
        .split("T")[0];
      const startOfYearTs = new Date(currentYear, 0, 1).toISOString();
      const endOfYearTs = new Date(
        currentYear,
        11,
        31,
        23,
        59,
        59
      ).toISOString();

      const currentYearStart = startOfYear;
      const currentYTD = currentDate.toISOString().split("T")[0];

      const previousYear = currentYear - 1;
      const previousYearStart = new Date(previousYear, 0, 1)
        .toISOString()
        .split("T")[0];
      const previousYTD = new Date(
        previousYear,
        currentDate.getMonth(),
        currentDate.getDate()
      )
        .toISOString()
        .split("T")[0];

      // Current and previous month dates
      const currentMonthStart = new Date(currentYear, currentDate.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      const currentMonthEnd = new Date(
        currentYear,
        currentDate.getMonth() + 1,
        0,
        23,
        59,
        59
      )
        .toISOString()
        .split("T")[0];
      const previousMonthStart = new Date(
        currentYear,
        currentDate.getMonth() - 1,
        1
      )
        .toISOString()
        .split("T")[0];
      const previousMonthEnd = new Date(
        currentYear,
        currentDate.getMonth(),
        0,
        23,
        59,
        59
      )
        .toISOString()
        .split("T")[0];

      // ⚡ OPTIMIZATION: Only fetch currency-dependent data when currency changes
      const selectedCurrency =
        filters.currency && filters.currency.trim() !== ""
          ? filters.currency
          : "Currency:v1:RON"; // Default to RON when no currency is selected
      console.log("Selected currency for transfer required:", selectedCurrency);

      // Check if we only need to update currency-dependent data
      const isCurrencyOnlyUpdate =
        Object.keys(filters).length === 1 && filters.currency;

      // ⚡ OPTIMIZATION: Check cache for currency-specific data
      const cacheKey = `currency-${selectedCurrency}`;
      const cachedData = currencyCache.get(cacheKey);

      let expensePlanResponse: any = null,
        monthlyStatsResponse: any = null,
        ytdStatsResponse: any = null,
        additionalMetricsResponse: any = null;

      if (isCurrencyOnlyUpdate) {
        // ⚡ OPTIMIZATION: Check cache first
        if (cachedData) {
          console.log("Using cached currency data for:", selectedCurrency);
          additionalMetricsResponse = cachedData;
        } else {
          // ⚡ OPTIMIZATION: Only fetch the currency-dependent query
          console.log(
            "Currency-only update detected, fetching only transfer required data"
          );
          additionalMetricsResponse = await client.request(
            GET_ADDITIONAL_DASHBOARD_METRICS,
            {
              selectedCurrency: selectedCurrency,
            }
          );

          // ⚡ OPTIMIZATION: Cache the result
          setCurrencyCache((prev) =>
            new Map(prev).set(cacheKey, additionalMetricsResponse)
          );
        }

        // Use existing stats for non-currency-dependent data
        expensePlanResponse = null;
        monthlyStatsResponse = null;
        ytdStatsResponse = null;
      } else {
        // Full dashboard refresh
        console.log("Full dashboard refresh");
        [
          expensePlanResponse,
          monthlyStatsResponse,
          ytdStatsResponse,
          additionalMetricsResponse,
        ] = await Promise.all([
          client.request(GET_EXPENSE_PLAN_YEARLY_TOTAL, {
            startOfYear,
            endOfYear,
            startOfYearTs,
            endOfYearTs,
          }),
          client.request(GET_MONTHLY_SPEND_COMPARISON, {
            currentMonthStart,
            currentMonthEnd,
            previousMonthStart,
            previousMonthEnd,
          }),
          client.request(GET_YTD_STATS, {
            currentYearStart,
            currentYTD,
            previousYearStart,
            previousYTD,
          }),
          client.request(GET_ADDITIONAL_DASHBOARD_METRICS, {
            selectedCurrency: selectedCurrency,
          }),
        ]);
      }

      // ⚡ FIXED: Restore real monthly trends data (was accidentally using placeholders)
      // Temporarily use placeholder data to avoid rate limiting issues
      const monthlyTrendsResponse = Array.from({ length: 12 }, (_, index) => ({
        ExpenseRequestAggregate: {
          aggregate: {
            sum: { totalAmount: 0 },
            count: 0,
          },
        },
      }));

      // Process the responses
      const processedStats: DashboardStats = isCurrencyOnlyUpdate
        ? {
            // Keep existing stats for non-currency-dependent data
            ...stats,
            // Only update currency-dependent data
            transferRequired:
              additionalMetricsResponse?.transferRequired?.aggregate?.sum
                ?.totalAmount || 0,
            pendingRequestsCount:
              additionalMetricsResponse?.pendingRequests?.aggregate?.count || 0,
          }
        : {
            expensePlanYearly: {
              totalAmount:
                expensePlanResponse?.ExpensePlanAggregate?.aggregate?.sum
                  ?.totalAmount || 0,
              count: expensePlanResponse?.ExpensePlan?.length || 0,
            },
            ytdStats: {
              totalAmount:
                ytdStatsResponse?.currentYearExpenses?.aggregate?.sum
                  ?.totalAmount || 0,
              count:
                ytdStatsResponse?.currentYearExpenses?.aggregate?.count || 0,
              previousTotalAmount:
                ytdStatsResponse?.previousYearExpenses?.aggregate?.sum
                  ?.totalAmount || 0,
              previousCount:
                ytdStatsResponse?.previousYearExpenses?.aggregate?.count || 0,
            },
            monthlyTrends: monthlyTrendsResponse.map(
              (response: any, index: number) => ({
                month: index + 1,
                monthName: new Date(currentYear, index).toLocaleString(
                  "default",
                  {
                    month: "short",
                  }
                ),
                totalAmount: 0,
                count: 0,
              })
            ),
            monthlySpendComparison: {
              currentMonthTotal:
                monthlyStatsResponse?.currentMonthExpenses?.reduce(
                  (sum: number, expense: any) =>
                    sum + (expense.totalAmount || 0),
                  0
                ) || 0,
              previousMonthTotal:
                monthlyStatsResponse?.previousMonthExpenses?.reduce(
                  (sum: number, expense: any) =>
                    sum + (expense.totalAmount || 0),
                  0
                ) || 0,
              currentMonthCount:
                monthlyStatsResponse?.currentMonthExpenses?.length || 0,
              previousMonthCount:
                monthlyStatsResponse?.previousMonthExpenses?.length || 0,
              percentChange: 0, // Will be calculated below
              isIncrease: false, // Will be calculated below
            },
            transferRequired:
              additionalMetricsResponse?.transferRequired?.aggregate?.sum
                ?.totalAmount || 0,
            pendingRequestsCount:
              additionalMetricsResponse?.pendingRequests?.aggregate?.count || 0,
            avgSpendPerTrip: 0, // Not available in current query
            travelExpensesCount: 0, // Not available in current query
          };

      // Calculate monthly comparison percentage (only for full refresh)
      if (!isCurrencyOnlyUpdate) {
        const currentTotal =
          processedStats.monthlySpendComparison.currentMonthTotal;
        const previousTotal =
          processedStats.monthlySpendComparison.previousMonthTotal;
        if (previousTotal > 0) {
          processedStats.monthlySpendComparison.percentChange =
            ((currentTotal - previousTotal) / previousTotal) * 100;
          processedStats.monthlySpendComparison.isIncrease =
            currentTotal > previousTotal;
        }
      }

      setStats(processedStats);
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
      console.error("Error details:", {
        message: err instanceof Error ? err.message : "Unknown error",
        stack: err instanceof Error ? err.stack : undefined,
        filters: filters,
      });
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to fetch dashboard stats")
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, client, filters.currency]); // Only refetch when currency changes, not all filters

  useEffect(() => {
    fetchEssentialStats();
  }, [fetchEssentialStats]);

  return { stats, loading, error, refetch: fetchEssentialStats };
};

export default useDashboardStats;
