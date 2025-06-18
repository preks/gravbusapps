import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { GET_EXPENSE_PLANS_BY_EMPLOYEE } from '../queries/expensePlans';

// Translation interface for catalog entries
export interface Translation {
  value: string;
  localeCode: string;
}

// Catalog entry interface for dropdown values
export interface CatalogEntry {
  value: string;
  translations: Translation[];
}

// Type for expense plan data
export interface ExpensePlan {
  id: string;
  code: string;
  title: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  planDate: string | null;
  totalAmount: number;
  advancePaymentPaidAmount: number;
  advancePaymentTotalAmount: number;
  costCenter: {
    name: string;
    id: string;
  };
  status: string;
  employee: {
    fullName: string;
  };
  additionalProperties?: Record<string, any> | null;
  requestType?: CatalogEntry;
  currency?: CatalogEntry;
}

// Type for the hook return value
export interface ExpensePlansDataView {
  items: ExpensePlan[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  fetchItems: (searchTerm?: string, page?: number, pageSize?: number) => Promise<void>;
}

export const useGetExpensePlans = (context?: BusinessAppContextProps): ExpensePlansDataView => {
  const [items, setItems] = useState<ExpensePlan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Function to fetch items with search and pagination
  const fetchItems = useCallback(async (searchTerm: string = '%', page: number = 1, pageSize: number = 10) => {
    const employeeId = context?.userInfo?.employeeDetails?.employeeId;
    const accessToken = context?.accessToken;

    if (!employeeId) {
      setError(new Error('Employee ID not found. Cannot fetch expense plans.'));
      setItems([]);
      setTotalCount(0);
      setIsLoading(false);
      return;
    }

    if (!accessToken) {
      setError(new Error('Access token not found. Cannot fetch expense plans.'));
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
      
      const response = await fetch('https://newwork-dev.newwork.com/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          query: GET_EXPENSE_PLANS_BY_EMPLOYEE,
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
      const count = result.data?.ExpensePlanAggregate?.aggregate?.count ?? 0;
      setTotalCount(count);
      
      // Get the items
      const fetchedItems = result.data?.ExpensePlan ?? [];
      setItems(fetchedItems);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setItems([]); // Clear items on error
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [context?.userInfo?.employeeDetails?.employeeId, context?.accessToken, setItems, setIsLoading, setError, setTotalCount]);

  // Initial fetch on component mount
  useEffect(() => {
    fetchItems();
  }, [fetchItems]); // Only re-run when employeeId or accessToken changes

  return { items, isLoading, error: error?.message ?? null, totalCount, fetchItems };
};
