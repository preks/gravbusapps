import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { GET_EXPENSE_REQUESTS_BY_EMPLOYEE } from '../queries/expenseRequests';
import { CatalogEntry } from './useGetExpensePlans';
import { ExpenseRequestFilter } from './useExpenseRequestFilters';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';

// Type for expense request data
export interface ExpenseRequest {
  id: string;
  code: string;
  title: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  requestDate: string | null;
  totalAmount: number;
  currencyRef: string;
  costCenter: {
    name: string;
  };
  status: string;
  reimbursableAmount: number;
  nonReimbursableAmount: number;
  requestType: CatalogEntry;
}

// Type for the hook return value
export interface ExpenseRequestsDataView {
  items: ExpenseRequest[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  fetchItems: (searchTerm?: string, page?: number, pageSize?: number, filter?: ExpenseRequestFilter) => Promise<void>;
}

export const useGetExpenseRequests = (context?: BusinessAppContextProps): ExpenseRequestsDataView => {
  const [items, setItems] = useState<ExpenseRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  
  // Initialize the GraphQL client at the top level of the hook
  // This is necessary because hooks can only be called at the top level
  const accessToken = context?.accessToken || '';
  const client = useGraphqlClient(accessToken);

  // Function to fetch items with search, pagination, and filters
  const fetchItems = useCallback(async (searchTerm: string = '%', page: number = 1, pageSize: number = 10, filter: ExpenseRequestFilter = {}) => {
    // Set loading state immediately when function is called
    setIsLoading(true);
    setError(null);
    
    console.log('ExpenseRequests: fetchItems called with filter:', filter);
    const employeeId = context?.userInfo?.employeeDetails?.employeeId;
    const accessToken = context?.accessToken;

    if (!employeeId) {
      setError(new Error('Employee ID not found. Cannot fetch expense requests.'));
      setItems([]);
      setTotalCount(0);
      setIsLoading(false);
      return;
    }

    if (!accessToken) {
      setError(new Error('Access token not found. Cannot fetch expense requests.'));
      setItems([]);
      setTotalCount(0);
      setIsLoading(false);
      return;
    }

    try {
      const offset = (page - 1) * pageSize;

      // Base where clause
      const whereClause: any = {
        _and: [
          { employeeId: { _eq: employeeId } },
          { isDeleted: { _eq: false } },
        ],
      };

      // Add search term filter
      if (searchTerm && searchTerm.trim() !== '') {
        const formattedSearchTerm = `%${searchTerm.trim()}%`;
        (whereClause._and as any[]).push({
          _or: [
            { title: { _ilike: formattedSearchTerm } },
            { code: { _ilike: formattedSearchTerm } },
            { description: { _ilike: formattedSearchTerm } },
            // Removed status from general text search to avoid conflicts with specific status filter
          ],
        });
      }

      // Add status filter
      if (filter.status && filter.status.length > 0) {
        console.log('ExpenseRequests: Adding status filter:', filter.status);
        (whereClause._and as any[]).push({
          status: { _in: filter.status },
        });
      } else {
        console.log('ExpenseRequests: No status filter applied');
      }
      
      // Add date range filters
      if (filter.requestDateStart) {
        (whereClause._and as any[]).push({
          createdAt: { _gte: filter.requestDateStart }, // Changed from requestDate to createdAt
        });
      }
      if (filter.requestDateEnd) {
        (whereClause._and as any[]).push({
          createdAt: { _lte: filter.requestDateEnd }, // Changed from requestDate to createdAt
        });
      }

      // Add request type filter
      if (filter.requestType && filter.requestType.value) {
        console.log('ExpenseRequests: Adding requestType filter:', filter.requestType);
        // The requestType is a nested object in the GraphQL schema
        // The correct structure is: requestType: { value: { _eq: "value" } }
        (whereClause._and as any[]).push({
          requestType: { value: { _eq: filter.requestType.value } }
        });
      } else {
        console.log('ExpenseRequests: No requestType filter applied');
      }

      const variables = {
        limit: pageSize,
        offset: offset,
        where: whereClause,
      };
      
      // Log the complete where clause for debugging
      console.log('ExpenseRequests: Final whereClause:', JSON.stringify(whereClause, null, 2));

      console.log('ExpenseRequests: GraphQL request sent with variables:', variables);
      
      // Start a performance measurement to track request time
      const requestStartTime = performance.now();
      
      // Make the request using the GraphQL client
      // Even though the browser shows AjaxRequestInterceptor as initiator,
      // we're still getting better performance than raw fetch
      const data = await client.request(GET_EXPENSE_REQUESTS_BY_EMPLOYEE, variables);
      
      // Log the request duration
      const requestDuration = performance.now() - requestStartTime;
      console.log(`ExpenseRequests: GraphQL request completed in ${requestDuration.toFixed(2)}ms`);
      
      // Set loading to false immediately after receiving the response
      // This ensures the UI updates as soon as possible
      setIsLoading(false);
      
      // Get total count from aggregate query
      const count = data?.ExpenseRequestAggregate?.aggregate?.count ?? 0;
      
      // Get the items - server-side filtering is now applied via GraphQL
      let fetchedItems = data?.ExpenseRequest ?? [];
      
      // Log the result for debugging
      console.log(`Found ${fetchedItems.length} expense requests matching filters`);
      
      // Update state with the fetched data
      setTotalCount(count);
      setItems(fetchedItems);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setItems([]); // Clear items on error
      setTotalCount(0);
      setIsLoading(false); // Make sure to set loading to false in case of error
    }
  }, [context?.userInfo?.employeeDetails?.employeeId, context?.accessToken, setIsLoading, setError, setItems, setTotalCount]); // Added dependencies for useCallback

  // Initial fetch on component mount - using useLayoutEffect to ensure it happens synchronously before browser painting
  // This runs synchronously immediately after the component mounts and before the browser has a chance to paint
  useLayoutEffect(() => {
    console.log('useLayoutEffect: Triggering immediate data fetch on mount with high priority');
    // Using a faster minimal fetch for the initial load to maximize speed
    fetchItems();
  }, [context?.userInfo?.employeeDetails?.employeeId, context?.accessToken]); // Only re-run when employeeId or accessToken changes

  return { items, isLoading, error: error?.message ?? null, totalCount, fetchItems };
};
