import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { GET_EXPENSE_REQUESTS_BY_EMPLOYEE } from '../queries/expenseRequests';
import { CatalogEntry } from './useGetExpensePlans';
import { ExpenseRequestFilter } from './useExpenseRequestFilters';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { ExpenseStatus } from '../utils';

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
  fetchItems: (filters: any, page?: number, pageSize?: number) => Promise<void>;
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
  const fetchItems = useCallback(async (filters: any = {}, page: number = 1, pageSize: number = 10) => {
    // Set loading state immediately when function is called
    setIsLoading(true);
    setError(null);
    
    console.log('ExpenseRequests: fetchItems called with filters:', filters);
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

      // Build the where clause by combining employee filter with the provided filters
      const whereClause = {
        _and: [
          { employeeId: { _eq: employeeId } },
          { isDeleted: { _eq: false } },
          filters // This is the GraphQL where clause from getFilters()
        ]
      };

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
      const data = await client.request(GET_EXPENSE_REQUESTS_BY_EMPLOYEE, variables);
      
      // Log the request duration
      const requestDuration = performance.now() - requestStartTime;
      console.log(`ExpenseRequests: GraphQL request completed in ${requestDuration.toFixed(2)}ms`);
      
      // Set loading to false immediately after receiving the response
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
  }, [context?.userInfo?.employeeDetails?.employeeId, context?.accessToken, setIsLoading, setError, setItems, setTotalCount]);

  return { items, isLoading, error: error?.message ?? null, totalCount, fetchItems };
};
