import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { GET_ADVANCE_PAYMENTS_BY_EMPLOYEE, GET_ADVANCE_PAYMENTS_BY_EMPLOYEE_WITH_STATUS } from '../queries/advancePayments';
import { env } from '@/common/env/EnvUtils';

// Type for advance payment data
export interface AdvancePayment {
  id: string;
  code: string;
  description: string;
  amount: number;
  advance: number;
  currencyRef: string;
  currency: {
    code: string;
  };
  costCenter: {
    name: string;
  };
  status: string; 
  paymentMethod: string | null;
  expensePlan: {
    code: string;
    title: string;  
    totalAmount: number;
    currency: {
      code: string;
    };
  };
  expensePlanId: string;
}

// Type for the hook return value
export interface AdvancePaymentsDataView {
  items: AdvancePayment[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  fetchItems: (searchTerm?: string, page?: number, pageSize?: number, statusFilter?: string[]) => Promise<void>;
}

export const useGetAdvancePayments = (context?: BusinessAppContextProps): AdvancePaymentsDataView => {
  const [items, setItems] = useState<AdvancePayment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Function to fetch items with search, pagination, and status filtering
  const fetchItems = useCallback(async (searchTerm: string = '%', page: number = 1, pageSize: number = 10, statusFilter?: string[]) => {
    const employeeId = context?.userInfo?.employeeDetails?.employeeId;
    const accessToken = context?.accessToken;

    if (!employeeId) {
      setError(new Error('Employee ID not found. Cannot fetch advance payments.'));
      setItems([]);
      setTotalCount(0);
      setIsLoading(false);
      return;
    }

    if (!accessToken) {
      setError(new Error('Access token not found. Cannot fetch advance payments.'));
      setItems([]);
      setTotalCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Add % wildcard for LIKE query if not already present
      const formattedSearchTerm = searchTerm === '' ? '%' : `%${searchTerm}%`;
      const offset = (page - 1) * pageSize;
      
      // Choose the appropriate query based on whether status filtering is needed
      const hasStatusFilter = Boolean(statusFilter && statusFilter.length > 0);
      const query = hasStatusFilter ? GET_ADVANCE_PAYMENTS_BY_EMPLOYEE_WITH_STATUS : GET_ADVANCE_PAYMENTS_BY_EMPLOYEE;
      
      const variables: any = {
        employeeId,
        searchTerm: formattedSearchTerm,
        limit: pageSize,
        offset: offset,
      };

      // Add status filter only when there are active filters
      if (hasStatusFilter) {
        variables.statusFilter = statusFilter;
      }
      
      const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (result.errors && result.errors.length > 0) {
        throw new Error(result.errors.map((e: any) => e.message).join(', '));
      }
      
      // Get total count from aggregate query
      const count = result.data?.AdvancePaymentAggregate?.aggregate?.count ?? 0;
      setTotalCount(count);
      
      // Get the items
      const fetchedItems = result.data?.AdvancePayment ?? [];
      setItems(fetchedItems);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setItems([]); // Clear items on error
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [context?.userInfo?.employeeDetails?.employeeId, context?.accessToken]);

  // Initial fetch on component mount
  useEffect(() => {
    if (context?.userInfo?.employeeDetails?.employeeId && context?.accessToken) {
      fetchItems();
    }
  }, [context?.userInfo?.employeeDetails?.employeeId, context?.accessToken]); // Only re-run when employeeId or accessToken changes

  return { items, isLoading, error: error?.message ?? null, totalCount, fetchItems };
};
