import { useState, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { GET_ADVANCE_PAYMENTS_BY_EMPLOYEE } from '../queries/advancePayments';
import { env } from '@/common/env/EnvUtils';

// Type for advance payment data
export interface AdvancePayment {
  id: string;
  code: string;
  description: string;
  amount: number;
  currencyRef: string;
  costCenter: {
    name: string;
  };
  status: string;
  paymentMethod: string | null;
  expensePlan: {
    code: string;
    title: string;
  };
  expensePlanId: string;
}

// Type for the hook return value
export interface AdvancePaymentsDataView {
  items: AdvancePayment[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  fetchItems: (searchTerm?: string, page?: number, pageSize?: number) => Promise<void>;
}

export const useGetAdvancePayments = (context?: BusinessAppContextProps): AdvancePaymentsDataView => {
  const [items, setItems] = useState<AdvancePayment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Function to fetch items with search and pagination
  const fetchItems = async (searchTerm: string = '%', page: number = 1, pageSize: number = 10) => {
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
      
      const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          query: GET_ADVANCE_PAYMENTS_BY_EMPLOYEE,
          variables: { 
            employeeId,
            searchTerm: formattedSearchTerm,
            limit: pageSize,
            offset: offset
          },
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
  };

  // Initial fetch on component mount
  useEffect(() => {
    fetchItems();
  }, [context?.userInfo?.employeeDetails?.employeeId, context?.accessToken]); // Only re-run when employeeId or accessToken changes

  return { items, isLoading, error: error?.message ?? null, totalCount, fetchItems };
};
