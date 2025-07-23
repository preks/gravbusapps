import { useCallback, useState } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { env } from '@/common/env/EnvUtils';
import { 
  buildAdvancePaymentsQuery,
  validateFilters,
  AdvancePaymentFilters
} from '../queries/advancePayments';

export interface AdvancePayment {
  id: string;
  code: string;
  description: string | null;
  amount: number;
  currencyRef: string;
  currency: {
    code: string;
  };
  costCenter: {
    name: string;
  };
  status: string;
  paymentMethod: string;
  expensePlan: {
    code: string;
    title: string;
    totalAmount: number;
    currency: {
      code: string;
    };
  } | null;
  expensePlanId: string;
}

export interface AdvancePaymentsDataView {
  items: AdvancePayment[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  fetchItems: (searchTerm?: string, page?: number, pageSize?: number, statusFilter?: string[], amountRange?: { min?: number; max?: number } | null, advanceRange?: { min?: number; max?: number } | null) => Promise<void>;
}

export const useGetAdvancePayments = (context?: BusinessAppContextProps): AdvancePaymentsDataView => {
  const [items, setItems] = useState<AdvancePayment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchItems = useCallback(async (
    searchTerm: string = '',
    page: number = 1,
    pageSize: number = 20,
    statusFilter: string[] = [],
    amountRange: { min?: number; max?: number } | null = null,
    advanceRange: { min?: number; max?: number } | null = null
  ) => {
    const employeeId = context?.userInfo?.employeeDetails?.employeeId;
    const accessToken = context?.accessToken;

    if (!employeeId || !accessToken) {
      console.warn('Missing employeeId or accessToken for advance payments query');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Add % wildcard for LIKE query if not already present
      const formattedSearchTerm = searchTerm === '' ? '%' : `%${searchTerm}%`;
      const offset = (page - 1) * pageSize;
      
      // Create filters object
      const filters: AdvancePaymentFilters = {
        statusFilter: statusFilter.length > 0 ? statusFilter : undefined,
        amountRange: amountRange || undefined,
        advanceRange: advanceRange || undefined
      };
      
      // Get active filters using utility function
      const filterState = validateFilters(filters);
      
      // Use dynamic query builder for better error handling
      const query = buildAdvancePaymentsQuery(filters);
      
      let variables: any = {
        employeeId,
        searchTerm: formattedSearchTerm,
        limit: pageSize,
        offset: offset,
      };

      // Add filter variables only if they exist
      if (filterState.hasStatusFilter && filters.statusFilter) {
        variables.statusFilter = filters.statusFilter;
      }
      
      if (filterState.hasAmountRange && filters.amountRange) {
        const { min, max } = filters.amountRange;
        if (min !== undefined) {
          variables.amountMin = min;
        }
        if (max !== undefined) {
          variables.amountMax = max;
        }
      }
      
      if (filterState.hasAdvanceRange && filters.advanceRange) {
        const { min, max } = filters.advanceRange;
        if (min !== undefined) {
          variables.advanceMin = min;
        }
        if (max !== undefined) {
          variables.advanceMax = max;
        }
      }
      
      console.log('GraphQL Variables:', variables);
      
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
        console.error('GraphQL Errors:', result.errors);
        throw new Error(result.errors.map((e: any) => e.message).join(', '));
      }
      
      // Get the items and count
      let fetchedItems = result.data?.AdvancePayment ?? [];
      let count = result.data?.AdvancePaymentAggregate?.aggregate?.count ?? 0;
      
      setTotalCount(count);
      setItems(fetchedItems);
    } catch (err) {
      console.error('Error fetching advance payments:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setItems([]); // Clear items on error
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [context?.userInfo?.employeeDetails?.employeeId, context?.accessToken]);

  return {
    items,
    isLoading,
    error: error?.message || null,
    totalCount,
    fetchItems,
  };
};
