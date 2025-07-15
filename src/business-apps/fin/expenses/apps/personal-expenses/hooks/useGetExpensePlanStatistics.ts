import { useState, useCallback } from 'react';
import dayjs from 'dayjs';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils';
import { GET_EXPENSE_PLAN_STATISTICS } from '../queries/expensePlans';
import { env } from '@/common/env/EnvUtils';

export interface ExpensePlanStatisticsData {
  currentMonthTotal: number;
  previousMonthTotal: number;
  totalEstimated: number;
  pendingApproval: number;
  topDestination: string;
}

export interface ExpensePlanStatisticsDataView {
  statistics: ExpensePlanStatisticsData;
  isLoading: boolean;
  error: string | null;
  fetchStatistics: () => Promise<void>;
}

export const useGetExpensePlanStatistics = (context?: BusinessAppContextProps): ExpensePlanStatisticsDataView => {
  const accessToken = context?.accessToken;
  const employeeId = context?.userInfo?.employeeDetails?.employeeId;
  const [statistics, setStatistics] = useState<ExpensePlanStatisticsData>({ currentMonthTotal: 0, previousMonthTotal: 0, totalEstimated: 0, pendingApproval: 0, topDestination: 'N/A' });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStatistics = useCallback(async () => {
    if (!employeeId || !accessToken) {
      setError(new Error('Employee ID or Access Token not found.'));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const now = dayjs();
      const currentMonthStart = now.startOf('month').toISOString();
      const currentMonthEnd = now.endOf('month').toISOString();
      const previousMonthStart = now.subtract(1, 'month').startOf('month').toISOString();
      const previousMonthEnd = now.subtract(1, 'month').endOf('month').toISOString();

      const fetchCount = async (startDate: string, endDate: string) => {
        const activeUserLocale = getCurrentActiveUserLocale();
        const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            query: GET_EXPENSE_PLAN_STATISTICS,
            variables: { 
              employeeId, 
              startDate, 
              endDate,
              activeUserLocale
            },
          }),
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        if (result.errors) throw new Error(result.errors.map((e: any) => e.message).join(', '));
        const count = result.data?.ExpensePlanAggregate?.aggregate?.count ?? 0;
        const totalEstimated = result.data?.TotalEstimated?.aggregate?.sum?.totalAmount ?? 0;
        const pendingApproval = result.data?.PendingApproval?.aggregate?.count ?? 0;
        const destinationPlans = result.data?.Destinations ?? [];
        const allRegions = destinationPlans.flatMap((plan: any) => 
          plan.expenseRequestTrip.map((trip: any) => {
            const translation = trip.travelRegion?.translations[0]?.value;
            return translation || trip.travelRegion?.value;
          })
        ).filter(Boolean);

        let topDestination = 'N/A';
        if (allRegions.length > 0) {
          const frequencyMap = allRegions.reduce((acc: Record<string, number>, region: string) => {
            acc[region] = (acc[region] || 0) + 1;
            return acc;
          }, {});
          topDestination = Object.keys(frequencyMap).reduce((a, b) => 
            frequencyMap[a] > frequencyMap[b] ? a : b
          );
        }

        return { count, totalEstimated, pendingApproval, topDestination };
      };

      const [currentMonthData, previousMonthData] = await Promise.all([
        fetchCount(currentMonthStart, currentMonthEnd),
        fetchCount(previousMonthStart, previousMonthEnd),
      ]);

      setStatistics({ 
        currentMonthTotal: currentMonthData.count,
        previousMonthTotal: previousMonthData.count,
        totalEstimated: currentMonthData.totalEstimated,
        pendingApproval: currentMonthData.pendingApproval,
        topDestination: currentMonthData.topDestination
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setStatistics({ currentMonthTotal: 0, previousMonthTotal: 0, totalEstimated: 0, pendingApproval: 0, topDestination: 'N/A' });
    } finally {
      setIsLoading(false);
    }
  }, [employeeId, accessToken]);

  return { statistics, isLoading, error: error?.message ?? null, fetchStatistics };
};
