/**
 * Hook for fetching and managing all dashboard statistics.
 * This is the single source of truth for all data displayed on the expense dashboard.
 */

import { useState, useEffect, useCallback } from 'react';
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
  refetch: () => void;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const client = useGraphqlClient(accessToken);

  const fetchDashboardStats = useCallback(async () => {
    if (!accessToken || !client) {
      setError(new Error('Access token and GraphQL client are required.'));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const currentYear = new Date().getFullYear();
      const currentDate = new Date();
      
      // Calculate date ranges for queries
      const startOfYear = new Date(currentYear, 0, 1).toISOString().split('T')[0];
      const endOfYear = new Date(currentYear, 11, 31).toISOString().split('T')[0];
      const startOfYearTs = new Date(currentYear, 0, 1).toISOString();
      const endOfYearTs = new Date(currentYear, 11, 31, 23, 59, 59).toISOString();
      
      const currentYearStart = startOfYear;
      const currentYTD = currentDate.toISOString().split('T')[0];
      
      const previousYear = currentYear - 1;
      const previousYearStart = new Date(previousYear, 0, 1).toISOString().split('T')[0];
      const previousYTD = new Date(previousYear, currentDate.getMonth(), currentDate.getDate()).toISOString().split('T')[0];
      
      // Current and previous month dates
      const currentMonthStart = new Date(currentYear, currentDate.getMonth(), 1).toISOString().split('T')[0];
      const currentMonthEnd = new Date(currentYear, currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString().split('T')[0];
      const previousMonthStart = new Date(currentYear, currentDate.getMonth() - 1, 1).toISOString().split('T')[0];
      const previousMonthEnd = new Date(currentYear, currentDate.getMonth(), 0, 23, 59, 59).toISOString().split('T')[0];

      // Execute all queries in parallel with correct variables
      const [
        expensePlanResponse,
        monthlyStatsResponse,
        ytdStatsResponse,
        monthlyTrendsResponse,
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
        Promise.all(Array.from({ length: 12 }).map((_, monthIndex) => {
          const monthStart = new Date(currentYear, monthIndex, 1).toISOString();
          const monthEnd = new Date(currentYear, monthIndex + 1, 0, 23, 59, 59).toISOString();
          return client.request(GET_MONTHLY_EXPENSE_TRENDS, {
            startDate: monthStart,
            endDate: monthEnd,
          });
        })),
        client.request(GET_ADDITIONAL_DASHBOARD_METRICS, {}),
      ]);

      // Process the responses
      const processedStats: DashboardStats = {
        expensePlanYearly: {
          totalAmount: expensePlanResponse?.ExpensePlanAggregate?.aggregate?.sum?.totalAmount || 0,
          count: expensePlanResponse?.ExpensePlan?.length || 0,
        },
        ytdStats: {
          totalAmount: ytdStatsResponse?.currentYearExpenses?.aggregate?.sum?.totalAmount || 0,
          count: ytdStatsResponse?.currentYearExpenses?.aggregate?.count || 0,
          previousTotalAmount: ytdStatsResponse?.previousYearExpenses?.aggregate?.sum?.totalAmount || 0,
          previousCount: ytdStatsResponse?.previousYearExpenses?.aggregate?.count || 0,
        },
        monthlyTrends: monthlyTrendsResponse.map((response: any, index: number) => ({
          month: index + 1,
          monthName: new Date(currentYear, index).toLocaleString('default', { month: 'short' }),
          totalAmount: response?.ExpenseRequestAggregate?.aggregate?.sum?.totalAmount || 0,
          count: response?.ExpenseRequestAggregate?.aggregate?.count || 0,
        })),
        monthlySpendComparison: {
          currentMonthTotal: monthlyStatsResponse?.currentMonthExpenses?.reduce((sum: number, expense: any) => sum + (expense.totalAmount || 0), 0) || 0,
          previousMonthTotal: monthlyStatsResponse?.previousMonthExpenses?.reduce((sum: number, expense: any) => sum + (expense.totalAmount || 0), 0) || 0,
          currentMonthCount: monthlyStatsResponse?.currentMonthExpenses?.length || 0,
          previousMonthCount: monthlyStatsResponse?.previousMonthExpenses?.length || 0,
          percentChange: 0, // Will be calculated below
          isIncrease: false, // Will be calculated below
        },
        transferRequired: additionalMetricsResponse?.transferRequired?.aggregate?.sum?.totalAmount || 0,
        pendingRequestsCount: additionalMetricsResponse?.pendingRequests?.aggregate?.count || 0,
        avgSpendPerTrip: 0, // Not available in current query
        travelExpensesCount: 0, // Not available in current query
      };

      // Calculate monthly comparison percentage
      const currentTotal = processedStats.monthlySpendComparison.currentMonthTotal;
      const previousTotal = processedStats.monthlySpendComparison.previousMonthTotal;
      if (previousTotal > 0) {
        processedStats.monthlySpendComparison.percentChange = 
          ((currentTotal - previousTotal) / previousTotal) * 100;
        processedStats.monthlySpendComparison.isIncrease = currentTotal > previousTotal;
      }

      setStats(processedStats);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch dashboard stats'));
    } finally {
      setLoading(false);
    }
  }, [accessToken, client]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  return { stats, loading, error, refetch: fetchDashboardStats };
};

export default useDashboardStats;
