import { useState, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { GET_ADVANCE_PAYMENTS, GET_ADVANCE_PAYMENT_STATISTICS } from '../queries/advancePayment.queries';
import { AdvancePaymentItem, AdvancePaymentStatisticsData } from '../types';

export interface AdvancePaymentsResult {
  payments: AdvancePaymentItem[];
  isLoading: boolean;
  error: any;
  totalCount: number;
  fetchPayments: (
    searchTerm?: string,
    page?: number,
    pageSize?: number,
    status?: string
  ) => Promise<void>;
  advancePaymentStats: AdvancePaymentStatisticsData | null;
  statsLoading: boolean;
  statsError: any;
  fetchAdvancePaymentStatistics: () => Promise<void>;
}

export const useAdvancePayments = (context?: BusinessAppContextProps): AdvancePaymentsResult => {
  const [payments, setPayments] = useState<AdvancePaymentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);
  const [totalCount, setTotalCount] = useState<number>(0);

  const [advancePaymentStats, setAdvancePaymentStats] = useState<AdvancePaymentStatisticsData | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(false);
  const [statsError, setStatsError] = useState<any>(null);

  const client = useGraphqlClient(context?.accessToken ?? '');

  const buildQueryVariables = (
    searchTerm: string,
    page: number,
    pageSize: number,
    status?: string
  ) => {
    const formattedSearchTerm = searchTerm === '' ? undefined : `%${searchTerm}%`;
    const offset = (page - 1) * pageSize;

    const variables: Record<string, any> = {
      limit: pageSize,
      offset: offset,
    };

    if (formattedSearchTerm) {
      variables.searchTerm = formattedSearchTerm;
    }

    if (status && status !== 'all') {
      variables.status = status;
    }
    return variables;
  };

  const mapResponseToPayments = (data: any): AdvancePaymentItem[] => {
    const fetchedPayments = data?.AdvancePayment ?? [];
    return fetchedPayments.map((payment: any) => ({
      id: payment.id,
      code: payment.code,
      description: payment.description,
      status: payment.status ?? 'PENDING',
      title: payment.expensePlan?.title,
      employeeDisplayName: payment.expensePlan?.employee?.displayName,
      employeeFullName: payment.expensePlan?.employee?.fullName,
      employeePictureThumbnail: payment.expensePlan?.employee?.pictureThumbnail,
      amount: payment.amount,
      startDate: payment.expensePlan?.startDate,
      endDate: payment.expensePlan?.endDate,
    }));
  };

  const fetchPayments = useCallback(async (
    searchTerm: string = '',
    page: number = 1,
    pageSize: number = 10,
    status?: string,
  ) => {
    if (!context?.accessToken) {
        setError(new Error('Access token not found.'));
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const variables = buildQueryVariables(searchTerm, page, pageSize, status);
      
      const data = await client.request(GET_ADVANCE_PAYMENTS, variables);

      const mappedPayments = mapResponseToPayments(data);
      setPayments(mappedPayments);
      setTotalCount(data.AdvancePaymentAggregate?.aggregate?.count ?? 0);

    } catch (err: any) {
      setError(err);
      setPayments([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [client, context?.accessToken]);

  const fetchAdvancePaymentStatistics = useCallback(async () => {
    if (!context?.accessToken) {
        setStatsError(new Error('Access token not found.'));
        setStatsLoading(false);
        return;
    }

    setStatsLoading(true);
    setStatsError(null);

    try {
      const data = await client.request(GET_ADVANCE_PAYMENT_STATISTICS, {});

      if (!data?.advancePaymentStats?.aggregate?.sum) {
        setAdvancePaymentStats({ totalAmount: null }); 
      } else {
         setAdvancePaymentStats({
           totalAmount: data.advancePaymentStats.aggregate.sum.amount,
         });
      }

    } catch (err: any) {
      setStatsError(err);
      setAdvancePaymentStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [client, context?.accessToken]);

  return {
    payments,
    isLoading,
    error,
    totalCount,
    fetchPayments,
    advancePaymentStats,
    statsLoading,
    statsError,
    fetchAdvancePaymentStatistics,
  };
};