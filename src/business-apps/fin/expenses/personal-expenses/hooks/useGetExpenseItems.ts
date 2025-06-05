import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { GET_EXPENSE_ITEMS_BY_EMPLOYEE, GET_EXPENSE_ITEM_BY_ID } from '../queries/expenseItems';

// Define types for the hook
export interface ExpenseItem {
  id: string;
  code?: string;
  title: string;
  description?: string;
  invoiceDate?: string;
  expenseDate?: string;
  status: string;
  totalAmount: number;
  reimbursableAmount?: number;
  nonReimbursableAmount?: number;
  deductibleAmount?: number;
  currencyRef?: string;
  costCenter?: {
    name: string;
  };
  expenseClass?: {
    value: string;
    translations?: {
      value: string;
      localeCode: string;
    }[];
  };
  additionalProperties?: Record<string, any>;
  expenseItemFile?: {
    fileUrl: string;
  }[];
  employee?: {
    fullName: string;
    additionalProperties?: Record<string, any>;
  };
}

export interface ExpenseFilter {
  status?: string | string[];
  expenseDateStart?: string;
  expenseDateEnd?: string;
  expenseClass?: { value: string };
  totalAmountMin?: number;
  totalAmountMax?: number;
}

export interface ExpenseItemsResult {
  items: ExpenseItem[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  fetchItems: (searchTerm?: string, page?: number, pageSize?: number, filter?: ExpenseFilter) => Promise<void>;
}

export interface ExpenseItemResult {
  item: ExpenseItem | null;
  isLoading: boolean;
  error: string | null;
  fetchItem: (id: string) => Promise<void>;
}

/**
 * Hook to fetch expense items for the current employee with pagination, search, and filtering support
 * @param context Business app context containing user info and access token
 * @returns Object containing expense items, loading state, error, total count, and fetch function
 */
export const useGetExpenseItems = (context?: BusinessAppContextProps): ExpenseItemsResult => {
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);

  /**
   * Helper function to build GraphQL variables for the query
   */
  const buildQueryVariables = useCallback((employeeId: string, searchTerm: string, page: number, pageSize: number, filter?: ExpenseFilter) => {
    const formattedSearchTerm = searchTerm === '' ? '%' : `%${searchTerm}%`;
    const offset = (page - 1) * pageSize;
    
    // Build variables object dynamically based on provided filters
    const variables: Record<string, any> = {
      employeeId,
      searchTerm: formattedSearchTerm,
      limit: pageSize,
      offset: offset,
    };
    
    // Only include filter variables if they are provided
    if (filter?.status) {
      variables.status = filter.status;
    }
    
    if (filter?.expenseDateStart) {
      variables.expenseDateStart = filter.expenseDateStart;
    }
    
    if (filter?.expenseDateEnd) {
      variables.expenseDateEnd = filter.expenseDateEnd;
    }
    
    if (filter?.totalAmountMin !== undefined && filter?.totalAmountMin !== null) {
      variables.totalAmountMin = filter.totalAmountMin;
    }
    
    if (filter?.totalAmountMax !== undefined && filter?.totalAmountMax !== null) {
      variables.totalAmountMax = filter.totalAmountMax;
    }
    
    // We don't have a direct expenseClass filter in the GraphQL query
    // We'll do client-side filtering for the expense class after fetching
    
    return variables;
  }, []);

  /**
   * Helper function to map API response to ExpenseItem objects
   */
  const mapResponseToItems = useCallback((data: any): ExpenseItem[] => {
    const fetchedItems = data?.ExpenseItem ?? [];
    return fetchedItems.map((item: any) => ({
      id: item.id,
      code: item.code,
      title: item.title ?? item.description ?? 'N/A',
      description: item.description,
      invoiceDate: item.expenseDate ? new Date(item.expenseDate).toISOString().split('T')[0] : 'N/A',
      expenseDate: item.expenseDate,
      status: item.status ?? 'PENDING',
      totalAmount: item.totalAmount ?? 0,
      reimbursableAmount: item.deductibleAmount ?? 0,
      nonReimbursableAmount: (item.totalAmount ?? 0) - (item.deductibleAmount ?? 0),
      deductibleAmount: item.deductibleAmount,
      currencyRef: item.currencyRef,
      costCenter: item.costCenter,
      expenseClass: item.expenseClass,
      additionalProperties: item.additionalProperties,
      expenseItemFile: item.expenseItemFile,
      employee: item.employee,
    }));
  }, []);
  
  /**
   * Function to fetch expense items with search, pagination, and filtering
   */
  const fetchItems = useCallback(async (
    searchTerm = '%', 
    page = 1, 
    pageSize = 10,
    filter?: ExpenseFilter
  ): Promise<void> => {
    const employeeId = context?.userInfo?.employeeDetails?.employeeId;
    const accessToken = context?.accessToken;

    if (!employeeId) {
      setError(new Error('Employee ID not found. Cannot fetch expense items.'));
      setItems([]);
      setTotalCount(0);
      setIsLoading(false);
      return;
    }

    if (!accessToken) {
      setError(new Error('Access token not found. Cannot fetch expense items.'));
      setItems([]);
      setTotalCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Build query variables with helper function
      const variables = buildQueryVariables(employeeId, searchTerm, page, pageSize, filter);
      
      const response = await fetch('https://newwork-dev.newwork.com/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          query: GET_EXPENSE_ITEMS_BY_EMPLOYEE,
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
      const count = result.data?.ExpenseItemAggregate?.aggregate?.count ?? 0;
      setTotalCount(count);
      
      // Map the items using helper function
      let mappedItems = mapResponseToItems(result.data);
      
      // Apply client-side filtering for expenseClass
      if (filter?.expenseClass && filter.expenseClass.value) {
        console.log('Applying client-side filtering for expenseClass:', filter.expenseClass.value);
        mappedItems = mappedItems.filter(item => 
          item.expenseClass?.value === filter.expenseClass?.value
        );
        console.log('After filtering:', mappedItems.length, 'items remain');
        
        // Update total count based on filtered results
        setTotalCount(mappedItems.length);
      }
      
      setItems(mappedItems);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setItems([]); // Clear items on error
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [context?.userInfo?.employeeDetails?.employeeId, context?.accessToken, buildQueryVariables, mapResponseToItems]);

  // Initial fetch on component mount
  useEffect(() => {
    fetchItems(); // Initial fetch on component mount or when employee/token changes (via fetchItems dependencies)
  }, [fetchItems]); // Only re-run when employeeId or accessToken changes

  return { items, isLoading, error: error?.message ?? null, totalCount, fetchItems };
};


/**
 * Hook to fetch expense item data for a specific expense item
 * @param context Business app context containing user info and access token
 * @returns Object containing the expense item, loading state, error, and fetch function
 */

export const useGetExpenseItem = (context?: BusinessAppContextProps, initialId?: string): ExpenseItemResult => {
  const [item, setItem] = useState<ExpenseItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!initialId);
  const [error, setError] = useState<Error | null>(null);

  // Function to fetch a specific expense item by ID
  const fetchItem = async (itemId: string) => {
    const accessToken = context?.accessToken;

    if (!itemId) {
      setError(new Error('No expense item ID provided.'));
      setItem(null);
      setIsLoading(false);
      return;
    }

    if (!accessToken) {
      setError(new Error('Access token not found. Cannot fetch expense item.'));
      setItem(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('https://newwork-dev.newwork.com/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          query: GET_EXPENSE_ITEM_BY_ID,
          variables: {
            id: itemId
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
      
      // Get the item
      const fetchedItem = result.data?.ExpenseItem[0] ?? null;
      setItem(fetchedItem);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setItem(null); // Clear item on error
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch if initialId is provided
  useEffect(() => {
    if (initialId) {
      fetchItem(initialId);
    }
  }, [initialId, context?.accessToken]); // Re-run when initialId or accessToken changes

  return { item, isLoading, error: error?.message ?? null, fetchItem };
};
