/**
 * Hook for fetching and managing all dashboard statistics.
 * This is the single source of truth for all data displayed on the expense dashboard.
 */

import { useState, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import {
  GET_EXPENSE_PLAN_YEARLY_TOTAL,
  GET_MONTHLY_SPEND_COMPARISON,
  GET_YTD_STATS,
  GET_MONTHLY_EXPENSE_TRENDS,
  GET_ADDITIONAL_DASHBOARD_METRICS,
} from '../queries/expenseDashboard.queries';
import { DashboardStats } from '../types';

interface UseDashboardStatsResult {
  stats: DashboardStats;
  loading: boolean;
  error: Error | null;
}

export const useDashboardStats = ({ accessToken }: Pick<BusinessAppContextProps, 'accessToken'>): UseDashboardStatsResult => {
  const [stats, setStats] = useState<DashboardStats>({
    expensePlanYearly: { totalAmount: 0, count: 0 },
    ytdStats: { totalAmount: 0, count: 0, previousTotalAmount: 0, previousCount: 0 },
    monthlyTrends: Array.from({ length: 12 }).map((_, i) => ({
      month: i + 1,
      monthName: new Date(0, i).toLocaleString('default', { month: 'short' }),
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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const client = useGraphqlClient(accessToken);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      if (!accessToken || !client) {
        setError(new Error('Access token and GraphQL client are required.'));
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        // Date ranges
        const startOfYear = new Date(currentYear, 0, 1).toISOString();
        const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999).toISOString();
        const currentMonthStart = new Date(currentYear, currentMonth, 1).toISOString();
        const previousMonthDate = new Date(now);
        previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
        const previousMonthStart = new Date(previousMonthDate.getFullYear(), previousMonthDate.getMonth(), 1).toISOString();
        const previousMonthEnd = new Date(currentYear, currentMonth, 1).toISOString();

        const previousYear = currentYear - 1;
        const previousYearStart = new Date(previousYear, 0, 1).toISOString();
        const previousYTDDate = new Date(now);
        previousYTDDate.setFullYear(previousYear);
        const previousYTD = previousYTDDate.toISOString();

        // Fetch all data in parallel
        const [
          expensePlanYearlyResponse,
          monthlySpendComparisonResponse,
          ytdStatsResponse,
          monthlyTrendsResponse,
          additionalMetricsResponse,
        ] = await Promise.all([
          client.request(GET_EXPENSE_PLAN_YEARLY_TOTAL, { startOfYear, endOfYear, startOfYearTs: startOfYear, endOfYearTs: endOfYear }),
          client.request(GET_MONTHLY_SPEND_COMPARISON, { currentMonthStart, currentMonthEnd: now.toISOString(), previousMonthStart, previousMonthEnd }),
          client.request(GET_YTD_STATS, { currentYearStart: startOfYear, currentYTD: now.toISOString(), previousYearStart, previousYTD }),
          Promise.all(Array.from({ length: 12 }).map((_, monthIndex) => {
            const startDate = new Date(currentYear, monthIndex, 1).toISOString();
            const endDate = new Date(currentYear, monthIndex + 1, 1).toISOString();
            return client.request(GET_MONTHLY_EXPENSE_TRENDS, { startDate, endDate });
          })),
          client.request(GET_ADDITIONAL_DASHBOARD_METRICS),
        ]);

        // Process expense plan yearly
        const expensePlanYearly = {
          totalAmount: expensePlanYearlyResponse?.ExpensePlanAggregate?.aggregate?.sum?.totalAmount ?? 0,
          count: expensePlanYearlyResponse?.ExpensePlan?.length ?? 0,
        };

        // Process monthly spend comparison
        const currentMonthData = monthlySpendComparisonResponse?.currentMonthExpenses?.aggregate;
        const previousMonthData = monthlySpendComparisonResponse?.previousMonthExpenses?.aggregate;
        const currentMonthTotal = currentMonthData?.sum?.totalAmount ?? 0;
        const previousMonthTotal = previousMonthData?.sum?.totalAmount ?? 0;
        let percentChange = 0;
        if (previousMonthTotal > 0) {
          percentChange = ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100;
        } else if (currentMonthTotal > 0) {
          percentChange = 100;
        }
        const monthlySpendComparison = {
          currentMonthTotal,
          previousMonthTotal,
          currentMonthCount: currentMonthData?.count ?? 0,
          previousMonthCount: previousMonthData?.count ?? 0,
          percentChange,
          isIncrease: currentMonthTotal > previousMonthTotal,
        };

        // Process YTD stats
        const ytdStats = {
          totalAmount: ytdStatsResponse?.currentYearExpenses?.aggregate?.sum?.totalAmount ?? 0,
          count: ytdStatsResponse?.currentYearExpenses?.aggregate?.count ?? 0,
          previousTotalAmount: ytdStatsResponse?.previousYearExpenses?.aggregate?.sum?.totalAmount ?? 0,
          previousCount: ytdStatsResponse?.previousYearExpenses?.aggregate?.count ?? 0,
        };

        // Process monthly trends
        const monthlyTrends = monthlyTrendsResponse.map((result: any, index: number) => {
          const aggregate = result?.ExpenseRequestAggregate?.aggregate;
          return {
            month: index + 1,
            monthName: new Date(currentYear, index).toLocaleString('default', { month: 'short' }),
            totalAmount: aggregate?.sum?.totalAmount ?? 0,
            count: aggregate?.count ?? 0,
          };
        });

                // Process additional metrics
        const transferRequired = additionalMetricsResponse?.transferRequired?.aggregate?.sum?.totalAmount ?? 0;
        const pendingRequestsCount = additionalMetricsResponse?.pendingRequests?.aggregate?.count ?? 0;

        setStats({
          expensePlanYearly,
          ytdStats,
          monthlyTrends,
          monthlySpendComparison,
          transferRequired,
          pendingRequestsCount,
          avgSpendPerTrip: 0, // Resetting to 0 as data is not available
          travelExpensesCount: 0, // Resetting to 0 as data is not available
        });

      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch dashboard stats'));
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, [client, accessToken]);

  return { stats, loading, error };
};

export default useDashboardStats;
