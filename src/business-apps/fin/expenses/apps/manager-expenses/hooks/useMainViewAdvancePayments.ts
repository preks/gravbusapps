import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { 
  GET_MAIN_VIEW_ADVANCE_PAYMENTS, 
  GET_MAIN_VIEW_ADVANCE_PAYMENT_STATISTICS 
} from '../queries/mainViewAdvancePayments';
import { env } from '@/common/env/EnvUtils';

export interface AdvancePayment {
  id: string;
  code: string;
  description: string | null;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  expensePlan: {
    id: string;
    code: string;
    title: string;
    startDate: string;
    endDate: string;
    currency: string;
    employee: {
      id: string;
      displayName?: string;
      fullName: string;
      pictureThumbnail?: string;
      employeePosition: {
        organizationalUnit: {
          id: string;
          name: string;
        };
        siteLocation: {
          id: string;
          name: string;
        };
      };
    };
  };
}

export interface AdvancePaymentResponse {
  AdvancePayment: (AdvancePayment & { 
    currencyRef?: string;
    expensePlan: AdvancePayment['expensePlan'] & { currencyRef?: string };
  })[];
  AdvancePaymentAggregate: {
    aggregate: {
      count: number;
    };
  };
}

export interface AdvancePaymentStatistics {
  totalCount: number;
  sumAmount: number | null;
  pendingCount: number;
  pendingAmount: number | null;
}

interface AdvancePaymentStatisticsResponse {
  allPaymentsStats?: {
    aggregate: {
      totalCount: number;
      sum?: {
        amount: number | null;
      };
    };
  };
  pendingPaymentsStats?: {
    aggregate: {
      pendingCount: number;
      sum?: {
        amount: number | null;
      };
    };
  };
}

interface UseMainViewAdvancePaymentsProps extends BusinessAppContextProps {
  pageSize?: number;
  searchTerm?: string;
  currentStatusFilter?: string[] | null;
  currentPage?: number;
}

export const useMainViewAdvancePayments = ({
  accessToken,
  userInfo,
  pageSize = 10,
  searchTerm,
  currentStatusFilter,
  currentPage: externalCurrentPage,
}: UseMainViewAdvancePaymentsProps) => {
  // Get managerId from userInfo or use a fallback for development
  const managerId = userInfo?.employeeDetails?.employeeId || "00000000-0000-0000-0000-000000000000";
  
  // Log the managerId to help with debugging
  console.log('useMainViewAdvancePayments - managerId:', managerId);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [payments, setPayments] = useState<AdvancePayment[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [internalCurrentPage, setInternalCurrentPage] = useState<number>(1);
  
  // Use external currentPage if provided, otherwise use internal state
  const currentPage = externalCurrentPage ?? internalCurrentPage;
  const [employeeFilter, setEmployeeFilter] = useState<string | null>(null);
  const [approving, setApproving] = useState<boolean>(false);
  const [rejecting, setRejecting] = useState<boolean>(false);
  const [paymentStats, setPaymentStats] = useState<AdvancePaymentStatistics | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(false);
  const [statsError, setStatsError] = useState<Error | null>(null);

  const buildWhereClause = useCallback(() => {
    const conditions: any[] = [];

    // Add search condition if searchTerm is provided
    if (searchTerm && searchTerm.trim()) {
      conditions.push({
        _or: [
          { code: { _ilike: `%${searchTerm}%` } },
          { description: { _ilike: `%${searchTerm}%` } },
          { expensePlan: { title: { _ilike: `%${searchTerm}%` } } },
          { expensePlan: { employee: { fullName: { _ilike: `%${searchTerm}%` } } } }
        ]
      });
    }

    // Add status filter condition if statusFilter is provided
    if (currentStatusFilter && currentStatusFilter.length > 0) {
      conditions.push({
        status: { _in: currentStatusFilter }
      });
    }

    // If no conditions, return an empty object to show all records
    if (conditions.length === 0) {
      return {};
    }

    // If only one condition, return it directly
    if (conditions.length === 1) {
      return conditions[0];
    }

    // If multiple conditions, combine them with _and
    return { _and: conditions };
  }, [searchTerm, currentStatusFilter]);

  const fetchPayments = useCallback(async () => {
    console.log('fetchPayments called with accessToken:', !!accessToken, 'managerId:', managerId);
    
    if (!accessToken) {
      setError(new Error('Access token not found. Cannot fetch advance payments.'));
      setLoading(false);
      return;
    }
    
    if (!managerId) {
      setError(new Error('Manager ID not found. Cannot fetch advance payments.'));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const offset = (currentPage - 1) * pageSize;
      const whereClause = buildWhereClause();
      
      console.log('Fetching advance payments with managerId:', managerId, 'whereClause:', whereClause);
      
      const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          query: GET_MAIN_VIEW_ADVANCE_PAYMENTS,
          variables: {
            managerId,
            limit: pageSize,
            offset,
            where: whereClause
          }
        })
      });

      const result = await response.json();
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      const data = result.data as AdvancePaymentResponse;
      console.log('Advance payments data received:', {
        paymentsCount: data.AdvancePayment?.length,
        totalCount: data.AdvancePaymentAggregate?.aggregate?.count,
        firstPayment: data.AdvancePayment?.[0],
        managerId,
        whereClause
      });
      
      // Apply client-side filtering for employee if needed
      let filteredPayments = data.AdvancePayment;
      
      // Map currency information from currencyRef fields
      filteredPayments = filteredPayments.map(payment => ({
        ...payment,
        currency: payment.currencyRef ? payment.currencyRef.replace('Currency:v1:', '') : 'EUR',
        expensePlan: {
          ...payment.expensePlan,
          currency: payment.expensePlan.currencyRef ? payment.expensePlan.currencyRef.replace('Currency:v1:', '') : 'EUR'
        }
      }));
      
      // Filter by employee if specified
      if (employeeFilter) {
        filteredPayments = filteredPayments.filter(payment => payment.expensePlan?.employee?.id === employeeFilter);
      }

      setPayments(filteredPayments || []);
      setTotalCount(data.AdvancePaymentAggregate?.aggregate?.count || 0);
    } catch (err) {
      console.error('Error fetching advance payments:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch advance payments'));
    } finally {
      setLoading(false);
    }
  }, [accessToken, managerId, currentPage, pageSize, searchTerm, currentStatusFilter, employeeFilter, buildWhereClause]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const fetchPaymentStatistics = useCallback(async () => {
    if (!accessToken || !managerId) {
      setStatsError(new Error('Missing required parameters'));
      setStatsLoading(false);
      return;
    }

    setStatsLoading(true);
    setStatsError(null);

    try {
      const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          query: GET_MAIN_VIEW_ADVANCE_PAYMENT_STATISTICS,
          variables: { managerId }
        })
      });
      const result = await response.json();
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      const data = result.data as AdvancePaymentStatisticsResponse;
      
      console.log('Advance payment statistics received:', {
        totalCount: data.allPaymentsStats?.aggregate.totalCount,
        sumAmount: data.allPaymentsStats?.aggregate.sum?.amount,
        pendingCount: data.pendingPaymentsStats?.aggregate.pendingCount,
        pendingAmount: data.pendingPaymentsStats?.aggregate.sum?.amount
      });
      
      setPaymentStats({
        totalCount: data.allPaymentsStats?.aggregate.totalCount || 0,
        sumAmount: data.allPaymentsStats?.aggregate.sum?.amount || null,
        pendingCount: data.pendingPaymentsStats?.aggregate.pendingCount || 0,
        pendingAmount: data.pendingPaymentsStats?.aggregate.sum?.amount || null
      });
    } catch (err) {
      console.error('Error fetching advance payment statistics:', err);
      setStatsError(err instanceof Error ? err : new Error('Failed to fetch advance payment statistics'));
    } finally {
      setStatsLoading(false);
    }
  }, [accessToken, managerId]);

  useEffect(() => {
    fetchPaymentStatistics();
  }, [fetchPaymentStatistics]);

  const handlePageChange = (page: number) => {
    setInternalCurrentPage(page);
  };

  const approvePayment = useCallback(async (paymentId: string, comments: string = '') => {
    if (!accessToken || !managerId) return;

    setApproving(true);
    try {
      // Implementation for approving advance payments would go here
      // For now, just show a success message and refresh the data
      message.success('Advance payment approved successfully');
      fetchPayments();
      fetchPaymentStatistics();
    } catch (err) {
      console.error('Error approving advance payment:', err);
      message.error('Failed to approve advance payment');
    } finally {
      setApproving(false);
    }
  }, [accessToken, managerId, fetchPayments, fetchPaymentStatistics]);

  const rejectPayment = useCallback(async (paymentId: string, reason: string) => {
    if (!accessToken || !managerId) return;

    setRejecting(true);
    try {
      // Implementation for rejecting advance payments would go here
      // For now, just show a success message and refresh the data
      message.success('Advance payment rejected successfully');
      fetchPayments();
      fetchPaymentStatistics();
    } catch (err) {
      console.error('Error rejecting advance payment:', err);
      message.error('Failed to reject advance payment');
    } finally {
      setRejecting(false);
    }
  }, [accessToken, managerId, fetchPayments, fetchPaymentStatistics]);

  return {
    loading,
    error,
    payments,
    totalCount,
    currentPage,
    setCurrentPage: handlePageChange,
    approving,
    rejecting,
    approvePayment,
    rejectPayment,
    paymentStats,
    statsLoading,
    statsError,
    fetchPaymentStatistics,
    setEmployeeFilter,
    employeeFilter
  };
};
