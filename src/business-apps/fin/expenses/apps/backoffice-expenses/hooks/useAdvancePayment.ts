import { useState, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { GET_ADVANCE_PAYMENTS, GET_ADVANCE_PAYMENT_STATISTICS } from '../queries/advancePayment.queries';
import { AdvancePaymentItem, AdvancePaymentStatisticsData } from '../types';

// ⚡ BEST PRACTICE: Query limit enforcement for safety (like leads)
const MAX_QUERY_LIMIT = 1000;
const enforceQueryLimit = (limit: number): number => {
  return Math.min(limit, MAX_QUERY_LIMIT);
};

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

  // ⚡ OPTIMIZED: Build proper where clause for better performance
  const buildQueryVariables = (
    searchTerm: string,
    page: number,
    pageSize: number,
    status?: string
  ) => {
    const offset = (page - 1) * pageSize;
    
    // Build conditions array like expense requests
    const conditions: any[] = [];
    
    // Base conditions
    conditions.push({ isDeleted: { _eq: false } });
    conditions.push({ status: { _nin: ["CREATED", "PREPARED", "RETURNED", "REJECTED", "DISCARDED"] } });
    
    // Add status filter if provided
    if (status && status !== 'all' && status !== '') {
      conditions.push({ status: { _eq: status } });
    }
    
    // Add search conditions if provided
    if (searchTerm && searchTerm.trim() !== '') {
      const searchValue = `%${searchTerm.trim()}%`;
      conditions.push({
        _or: [
          { code: { _ilike: searchValue } },
          { description: { _ilike: searchValue } },
          { expensePlan: { code: { _ilike: searchValue } } },
          { expensePlan: { title: { _ilike: searchValue } } },
          { expensePlan: { employee: { firstName: { _ilike: searchValue } } } },
          { expensePlan: { employee: { lastName: { _ilike: searchValue } } } },
        ]
      });
    }
    
    // Build final where clause
    const where = conditions.length === 1 ? conditions[0] : { _and: conditions };

    // ⚡ BEST PRACTICE: Enforce query limit for safety (like leads)
    const safePageSize = enforceQueryLimit(pageSize);
    
    return {
      where,
      limit: safePageSize,
      offset: offset,
    };
  };

  const mapResponseToPayments = (data: any): AdvancePaymentItem[] => {
    const fetchedPayments = data?.AdvancePayment ?? [];
    return fetchedPayments.map((payment: any) => ({
      id: payment.id,
      code: payment.expensePlan?.code || payment.code, // Use expense plan code first, fallback to payment code
      description: payment.description,
      status: payment.status ?? 'PENDING',
      title: payment.expensePlan?.title,
      employeeDisplayName: payment.expensePlan?.employee 
        ? `${payment.expensePlan.employee.firstName || ''} ${payment.expensePlan.employee.lastName || ''}`.trim()
        : 'N/A',
      employeeFullName: payment.expensePlan?.employee 
        ? `${payment.expensePlan.employee.firstName || ''} ${payment.expensePlan.employee.lastName || ''}`.trim()
        : 'N/A',
      amount: payment.amount,
      startDate: payment.expensePlan?.startDate,
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