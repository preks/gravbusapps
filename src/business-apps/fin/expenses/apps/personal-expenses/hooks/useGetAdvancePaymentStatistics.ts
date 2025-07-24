import { useState, useCallback, useEffect } from 'react';
import dayjs from 'dayjs';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { GET_ADVANCE_PAYMENT_STATISTICS } from '../queries/advancePayments';
import { env } from '@/common/env/EnvUtils';

export interface AdvancePaymentStatisticsData {
  currentMonthPayments: number;
  previousMonthPayments: number;
  currentMonthAmount: number;
  previousMonthAmount: number;
  pendingPayments: number;
  approvedPayments: number;
}

export interface AdvancePaymentStatisticsDataView {
  statistics: AdvancePaymentStatisticsData;
  isLoading: boolean;
  error: string | null;
  fetchStatistics: () => Promise<void>;
}

export const useGetAdvancePaymentStatistics = (context?: BusinessAppContextProps): AdvancePaymentStatisticsDataView => {
  const accessToken = context?.accessToken;
  const employeeId = context?.userInfo?.employeeDetails?.employeeId;
  const [statistics, setStatistics] = useState<AdvancePaymentStatisticsData>({ 
    currentMonthPayments: 0, 
    previousMonthPayments: 0, 
    currentMonthAmount: 0, 
    previousMonthAmount: 0, 
    pendingPayments: 0, 
    approvedPayments: 0 
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatistics = useCallback(async () => {
    if (!employeeId || !accessToken) {
      setError('Employee ID or Access Token not found.');
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

      const fetchMonthData = async (startDate: string, endDate: string) => {
        const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            query: GET_ADVANCE_PAYMENT_STATISTICS,
            variables: { 
              employeeId, 
              startDate, 
              endDate
            },
          }),
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        if (result.errors) throw new Error(result.errors.map((e: any) => e.message).join(', '));
        
        const count = result.data?.AdvancePaymentAggregate?.aggregate?.count ?? 0;
        const totalAmount = result.data?.AdvancePaymentAggregate?.aggregate?.sum?.amount ?? 0;
        const pendingCount = result.data?.PendingAdvancePayments?.aggregate?.count ?? 0;
        const approvedCount = result.data?.ApprovedAdvancePayments?.aggregate?.count ?? 0;

        return { count, totalAmount, pendingCount, approvedCount };
      };

      // Fetch current and previous month data in parallel
      const [currentMonthData, previousMonthData] = await Promise.all([
        fetchMonthData(currentMonthStart, currentMonthEnd),
        fetchMonthData(previousMonthStart, previousMonthEnd),
      ]);

      setStatistics({ 
        currentMonthPayments: currentMonthData.count,
        previousMonthPayments: previousMonthData.count,
        currentMonthAmount: currentMonthData.totalAmount,
        previousMonthAmount: previousMonthData.totalAmount,
        pendingPayments: currentMonthData.pendingCount,
        approvedPayments: currentMonthData.approvedCount
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatistics({ 
        currentMonthPayments: 0, 
        previousMonthPayments: 0, 
        currentMonthAmount: 0, 
        previousMonthAmount: 0, 
        pendingPayments: 0, 
        approvedPayments: 0 
      });
    } finally {
      setIsLoading(false);
    }
  }, [employeeId, accessToken]);

  // Automatically fetch statistics when the hook is initialized
  useEffect(() => {
    if (employeeId && accessToken) {
      fetchStatistics();
    }
  }, [employeeId, accessToken, fetchStatistics]);

  // Add a timeout to prevent infinite loading
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        setIsLoading(false);
      }, 10000); // 10 second timeout

      return () => clearTimeout(timeout);
    }
  }, [isLoading]);

  return { statistics, isLoading, error, fetchStatistics };
}; 