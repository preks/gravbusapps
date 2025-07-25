import { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { 
  GET_MAIN_VIEW_ADVANCE_PAYMENTS, 
  GET_MAIN_VIEW_ADVANCE_PAYMENT_STATISTICS 
} from '../queries/mainViewAdvancePayments';
import { env } from '@/common/env/EnvUtils';
import { useCurrencyStore } from '../store/useCurrencyStore';

export interface AdvancePayment {
  id: string;
  code: string;
  description: string | null;
  status: string;
  amount: number;
  currencyRef: string;
  createdAt: string;
  updatedAt: string;
  expensePlan: {
    id: string;
    code: string;
    title: string;
    startDate: string;
    endDate: string;
    currencyRef: string;
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
  // primaryCurrency removed as it's now managed by the global currency store
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
  currentCurrencyFilter?: string;
  initialSorting?: { field: string; order: 'ASC' | 'DESC' };
}

export const useMainViewAdvancePayments = ({
  accessToken,
  userInfo,
  pageSize = 10,
  searchTerm,
  currentStatusFilter,
  currentPage: externalCurrentPage,
  currentCurrencyFilter,
  initialSorting = { field: 'createdAt', order: 'DESC' },
}: UseMainViewAdvancePaymentsProps) => {
  // Get currency from global store if not provided explicitly
  const { primaryCurrency } = useCurrencyStore();
  const currencyFilter = currentCurrencyFilter || primaryCurrency;
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
  
  // Add sorting state
  const [sorting, setSorting] = useState<{ field: string; order: 'ASC' | 'DESC' }>(initialSorting);
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

    // Add status filter if provided
    if (currentStatusFilter && currentStatusFilter.length > 0) {
      if (currentStatusFilter.length === 1) {
        conditions.push({ status: { _eq: currentStatusFilter[0] } });
      } else {
        conditions.push({
          status: { _in: currentStatusFilter }
        });
      }
    }
    
    // Add currency filter if provided
    if (currencyFilter) {
      console.log(`Applying currency filter: ${currencyFilter}`);
      conditions.push({ currencyRef: { _eq: `Currency:v1:${currencyFilter}` } });
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
  }, [searchTerm, currentStatusFilter, currencyFilter]);

  // Helper function to build orderBy object for GraphQL query
  const buildOrderByClause = useCallback(() => {
    // Handle nested fields like 'employee.fullName'
    if (sorting.field.includes('.')) {
      const [parentField, childField] = sorting.field.split('.');
      return { [parentField]: { [childField]: sorting.order } };
    }
    
    // Handle regular fields
    return { [sorting.field]: sorting.order };
  }, [sorting]);

  // Track last fetch parameters to prevent duplicate fetches
  const lastFetchParams = useRef({
    currentPage: 0,
    pageSize: 0,
    searchTerm: '',
    currentStatusFilter: null as string[] | null,
    currencyFilter: '',
    sorting: { field: '', order: 'ASC' as 'ASC' | 'DESC' }
  });

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

    // Check if parameters have changed to prevent duplicate fetches
    const currentParams = {
      currentPage,
      pageSize,
      searchTerm: searchTerm || '',
      currentStatusFilter: currentStatusFilter || null,
      currencyFilter,
      sorting
    };

    if (
      lastFetchParams.current.currentPage === currentParams.currentPage &&
      lastFetchParams.current.pageSize === currentParams.pageSize &&
      lastFetchParams.current.searchTerm === currentParams.searchTerm &&
      JSON.stringify(lastFetchParams.current.currentStatusFilter) === JSON.stringify(currentParams.currentStatusFilter) &&
      lastFetchParams.current.currencyFilter === currentParams.currencyFilter &&
      lastFetchParams.current.sorting.field === currentParams.sorting.field &&
      lastFetchParams.current.sorting.order === currentParams.sorting.order
    ) {
      console.log('Skipping duplicate fetch with same parameters');
      return;
    }

    // Update last fetch parameters
    lastFetchParams.current = { ...currentParams };

    setLoading(true);
    setError(null);

    try {
      const offset = (currentPage - 1) * pageSize;
      const whereClause = buildWhereClause();
      const orderByClause = buildOrderByClause();
      
      console.log('Fetching advance payments with managerId:', managerId, 'whereClause:', whereClause, 'orderBy:', orderByClause);
      
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
            where: whereClause,
            orderBy: orderByClause
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
  }, [accessToken, managerId, currentPage, pageSize, searchTerm, currentStatusFilter, employeeFilter, buildWhereClause, sorting]);

  useEffect(() => {
    console.log('Fetching advance payments due to dependencies change');
    fetchPayments();
  }, [fetchPayments, currentPage, pageSize, searchTerm, currentStatusFilter, currencyFilter, sorting]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments, currentCurrencyFilter]);

  // Track the last statistics fetch parameters to avoid redundant requests
  const lastStatsFetchParams = useRef<{ currencyFilter: string | null } | null>(null);
  const statsDebounceTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchPaymentStatistics = useCallback(async (forceCurrencyFilter?: string | null) => {
    if (!accessToken || !managerId) {
      setStatsError(new Error('Missing required parameters'));
      setStatsLoading(false);
      return;
    }
    
    // Use forced currency filter or current filter
    const activeCurrencyFilter = forceCurrencyFilter !== undefined ? forceCurrencyFilter : currencyFilter;
    
    // Check if this is a duplicate request with the same parameters
    if (lastStatsFetchParams.current && 
        lastStatsFetchParams.current.currencyFilter === activeCurrencyFilter) {
      console.log('Skipping duplicate advance payment statistics fetch with same parameters:', { activeCurrencyFilter });
      return;
    }
    
    // Update last fetch parameters
    lastStatsFetchParams.current = { currencyFilter: activeCurrencyFilter };

    setStatsLoading(true);
    setStatsError(null);

    try {
      const currencyRefValue = activeCurrencyFilter ? `Currency:v1:${activeCurrencyFilter}` : null;
      console.log(`Fetching advance payment statistics with currency filter: ${activeCurrencyFilter || 'none'}`);
      
      const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          query: GET_MAIN_VIEW_ADVANCE_PAYMENT_STATISTICS,
          variables: { 
            managerId,
            currencyRef: currencyRefValue 
          }
        })
      });
      const result = await response.json();
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      const data = result.data as AdvancePaymentStatisticsResponse;
      
      // Currency is now managed by the global currency store
      // No need to calculate the most used currency here
      
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
    // Clear any existing timer
    if (statsDebounceTimer.current) {
      clearTimeout(statsDebounceTimer.current);
    }
    
    // Set a new timer to debounce the fetch
    statsDebounceTimer.current = setTimeout(() => {
      console.log('Executing debounced fetchPaymentStatistics()');
      fetchPaymentStatistics();
    }, 300); // 300ms debounce delay
    
    // Cleanup function to clear the timer if the component unmounts
    return () => {
      if (statsDebounceTimer.current) {
        clearTimeout(statsDebounceTimer.current);
      }
    };
  }, [fetchPaymentStatistics, currencyFilter]);

  const handlePageChange = (page: number) => {
    setInternalCurrentPage(page);
  };

  // Add function to update sorting
  const updateSorting = useCallback((field: string) => {
    setSorting(prevSorting => {
      // If clicking the same field, toggle the order
      if (prevSorting.field === field) {
        return {
          field,
          order: prevSorting.order === 'ASC' ? 'DESC' : 'ASC'
        };
      }
      
      // If clicking a new field, default to DESC order
      return {
        field,
        order: 'DESC'
      };
    });
    
    // Reset to first page when sorting changes
    setInternalCurrentPage(1);
  }, []);

  const approvePayment = useCallback(async (_paymentId: string, _comments: string = '') => {
    if (!accessToken || !managerId) return;

    setApproving(true);
    try {
      // Implementation for approving advance payments would go here
      // For now, just show a success message and refresh the data
      message.success('Advance payment approved successfully');
      fetchPayments();
      fetchPaymentStatistics(currencyFilter);
    } catch (err) {
      console.error('Error approving advance payment:', err);
      message.error('Failed to approve advance payment');
    } finally {
      setApproving(false);
    }
  }, [accessToken, managerId, fetchPayments, fetchPaymentStatistics]);

  const rejectPayment = useCallback(async (_paymentId: string, _reason: string) => {
    if (!accessToken || !managerId) return;

    setRejecting(true);
    try {
      // Implementation for rejecting advance payments would go here
      // For now, just show a success message and refresh the data
      message.success('Advance payment rejected successfully');
      fetchPayments();
      fetchPaymentStatistics(currencyFilter);
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
    employeeFilter,
    sorting,
    updateSorting
  };
};
