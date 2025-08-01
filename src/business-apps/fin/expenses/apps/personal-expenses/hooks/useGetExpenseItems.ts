import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { GET_EXPENSE_ITEMS_BY_EMPLOYEE, GET_EXPENSE_ITEM_BY_ID } from '../queries/expenseItems';
import { env } from '@/common/env/EnvUtils';

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
  currency?: {
    code: string;
  };
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
    id: string;
    fileUrl: string;
    fileName: string;
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
  noReceipt?: boolean;
  currencyRef?: string;
}

export interface ExpenseItemsResult {
  items: ExpenseItem[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  fetchItems: (searchTerm?: string, page?: number, pageSize?: number, filter?: ExpenseFilter, sortField?: string | null, sortOrder?: 'ascend' | 'descend' | null) => Promise<void>;
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
  const buildQueryVariables = useCallback((employeeId: string, searchTerm: string, page: number, pageSize: number, filter?: ExpenseFilter, sortField?: string | null, sortOrder?: 'ascend' | 'descend' | null) => {
    const formattedSearchTerm = searchTerm === '' ? '%' : `%${searchTerm}%`;
    const offset = (page - 1) * pageSize;
    
    // Build variables object dynamically based on provided filters
    const variables: Record<string, any> = {
      employeeId,
      searchTerm: formattedSearchTerm,
      limit: pageSize,
      offset: offset,
      currencyRef: filter?.currencyRef ?? null,
    };
    
    // Add orderBy for server-side sorting
    if (sortField && sortOrder) {
      // Map UI sort field to GraphQL field names
      const fieldMap: Record<string, string> = {
        title: 'title',
        expenseDate: 'expenseDate',
        status: 'status',
        reimbursableAmount: 'reimbursableAmount',
        totalAmount: 'totalAmount',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        code: 'code',
        description: 'description'
      };
      const gqlField = fieldMap[sortField] || sortField;
      const direction = sortOrder === 'ascend' ? 'ASC' : 'DESC';
      variables.orderBy = [{ [gqlField]: direction }];
    } else {
      // Default sorting by expense date descending
      variables.orderBy = [{ expenseDate: 'DESC' }];
    }
    
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
      reimbursableAmount: item.reimbursableAmount,
      nonReimbursableAmount: (item.totalAmount ?? 0) - (item.deductibleAmount ?? 0),
      deductibleAmount: item.deductibleAmount,
      currency: item.currency,
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
    pageSize = 20,
    filter?: ExpenseFilter,
    sortField?: string | null,
    sortOrder?: 'ascend' | 'descend' | null
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
      const variables = buildQueryVariables(employeeId, searchTerm, page, pageSize, filter, sortField, sortOrder);
      
      // Debug the filter for no receipt items
      if (filter?.noReceipt) {
        console.log('No Receipt filter is active!');
      }
      console.log('Query variables:', JSON.stringify(variables));
      
      const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
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
        console.log('After filtering by expense class:', mappedItems.length, 'items remain');
      }
      
      // Apply client-side filtering for items with no receipts
      if (filter?.noReceipt) {
        console.log('Applying client-side filtering for items without receipts');
        
        // Detailed inspection of the first few items
        console.log('DATA INSPECTION:');
        mappedItems.slice(0, 3).forEach(item => {
          console.log(`Item ${item.id} - expenseItemFile:`, 
            item.expenseItemFile, 
            'type:', typeof item.expenseItemFile, 
            'is array:', Array.isArray(item.expenseItemFile), 
            'length:', item.expenseItemFile?.length);
        });
        
        // Log counts before filtering
        const withAttachments = mappedItems.filter(item => {
          const hasAttachment = Array.isArray(item.expenseItemFile) && item.expenseItemFile.length > 0;
          if (hasAttachment) console.log(`Item ${item.id} HAS attachments:`, item.expenseItemFile);
          return hasAttachment;
        }).length;
        
        const withoutAttachments = mappedItems.filter(item => {
          const hasNoAttachment = !Array.isArray(item.expenseItemFile) || item.expenseItemFile.length === 0;
          if (hasNoAttachment) console.log(`Item ${item.id} has NO attachments:`, item.expenseItemFile);
          return hasNoAttachment;
        }).length;
        
        console.log(`Before filtering: ${withAttachments} items with attachments, ${withoutAttachments} without attachments`);
        
        // Apply the filter with stronger type checking
        mappedItems = mappedItems.filter(item => {
          // More robust check for no attachments
          const hasNoAttachments = !Array.isArray(item.expenseItemFile) || item.expenseItemFile.length === 0;
          return hasNoAttachments;
        });
        
        console.log('After filtering for no receipts:', mappedItems.length, 'items remain');
      }
      
      // Update total count based on filtered results if any client-side filtering was applied
      if (filter?.expenseClass || filter?.noReceipt) {
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
      const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
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
