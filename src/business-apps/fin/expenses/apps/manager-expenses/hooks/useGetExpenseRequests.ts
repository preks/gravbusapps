import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { 
  GET_EXPENSE_REQUESTS_BY_MANAGER, 
  APPROVE_EXPENSE_REQUEST,
  REJECT_EXPENSE_REQUEST,
  GET_EXPENSE_REQUEST_STATISTICS 
} from '../queries/expenseRequests';
import { env } from '@/common/env/EnvUtils';

// Props for the hook, ensuring accessToken and userInfo are provided
export interface UseGetExpenseRequestsProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {}

// Define types for the hook
export interface ExpenseRequest {
  id: string;
  code?: string;
  title: string;
  description?: string;
  requestDate?: string;
  startDate?: string | null;
  endDate?: string | null;
  amount: number;
  currency: string;
  status: string;
  attachments?: {
    fileUrl: string;
    fileName: string;
  }[];
  employee?: {
    id: string;
    displayName?: string;
    fullName: string;
    department?: string;
    pictureThumbnail?: string;
    additionalProperties?: Record<string, any>;
  };
}


export interface ExpenseRequestStatisticsData {
  pendingCount: number;
  pendingAmount: number | null;
  approvedCount: number;
  approvedAmount: number | null;
  rejectedCount: number;
  rejectedAmount: number | null;
  totalSubmittedAmount: number | null;
}

export interface ExpenseRequestsResult {
  requests: ExpenseRequest[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  fetchRequests: (
    searchTerm?: string, 
    page?: number, 
    pageSize?: number, 
    sortBy?: string,
    status?: string[],
    requestDateStart?: string,
    currencyFilter?: string | null
  ) => Promise<void>;
  approveRequest: (requestId: string) => Promise<boolean>;
  rejectRequest: (requestId: string, rejectionReason?: string) => Promise<boolean>;
  requestStats: ExpenseRequestStatisticsData | null;
  requestStatsLoading: boolean;
  requestStatsError: string | null;
  fetchRequestStatistics: (currencyFilter?: string | null) => Promise<void>;
}

/**
 * Hook to fetch expense requests for team members with pagination, search, and filtering support
 * @param context Business app context containing user info and access token
 * @returns Object containing expense requests, loading state, error, total count, and fetch function
 */
export const useGetExpenseRequests = ({ accessToken, userInfo }: UseGetExpenseRequestsProps): ExpenseRequestsResult => {
  const [requests, setRequests] = useState<ExpenseRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [requestStats, setRequestStats] = useState<ExpenseRequestStatisticsData | null>(null);
  const [requestStatsLoading, setRequestStatsLoading] = useState<boolean>(false);
  const [requestStatsError, setRequestStatsError] = useState<string | null>(null);

  // Get supervisor employee ID from user info
  const supervisorEmployeeId = userInfo?.employeeDetails?.employeeId || "00000000-0000-0000-0000-000000000000";
  


  /**
   * Helper function to map API response to ExpenseRequest objects
   */
  const mapResponseToRequests = (data: any): ExpenseRequest[] => {
    const fetchedRequests = data?.ExpenseRequest ?? [];
    
    return fetchedRequests.map((request: any) => {
      return {
        id: request.id,
        code: request.code,
        title: request.title ?? 'Untitled Request',
        description: request.description,
        requestDate: request.requestDate,
        amount: request.totalAmount ?? 0,
        currency: request.currencyRef ? request.currencyRef.replace('Currency:v1:', '') : 'EUR',
        status: request.status ?? 'PENDING',
        attachments: request.employeeDocument ? [{
          fileUrl: request.employeeDocument.file,
          fileName: request.employeeDocument.name
        }] : [],
        employee: request.employee ? {
          id: request.employee.id,
          displayName: request.employee.displayName,
          fullName: request.employee.fullName,
          department: request.employee.employeePosition?.organizationalUnit?.name,
          pictureThumbnail: request.employee.pictureThumbnail,
          additionalProperties: request.employee.additionalProperties
        } : undefined,
        startDate: request.startDate,
        endDate: request.endDate,
      };
    });
  };
  
  // Function to fetch requests with search, pagination, and filtering
  const fetchRequests = useCallback(async (
    searchTerm: string = '', 
    page: number = 1, 
    pageSize: number = 10, 
    sortBy: string = 'requestDate:desc', 
    status: string[] = [],
    requestDateStart?: string,
    currencyFilter?: string | null
  ) => {
    if (!accessToken) {
      setError('Access token not available.');
      setIsLoading(false);
      return;
    }
    
    console.log('Fetching expense requests with:', {
      managerId: supervisorEmployeeId,
      searchTerm,
      page,
      pageSize,
      sortBy,
      status,
      requestDateStart,
      currencyFilter,
      query: GET_EXPENSE_REQUESTS_BY_MANAGER.substring(0, 100) + '...' // Log first 100 chars of query
    });
    

    setIsLoading(true);
    setError(null);
    
    try {
      // Calculate pagination offset
      const offset = (page - 1) * pageSize;
      
      // Build the where clause for filtering
      const whereClause: Record<string, any> = {
        employee: {
          employeePosition: {
            supervisorEmployeeId: { _eq: supervisorEmployeeId }
          }
        },
        isDeleted: { _eq: false }
      };

      // Add currency filter if specified
      if (currencyFilter) {
        console.log(`Applying currency filter: ${currencyFilter}`);
        whereClause.currencyRef = { _eq: `Currency:v1:${currencyFilter}` };
      } else {
        // When no currency filter is specified, don't add any currency filter to the query
        // This ensures all currencies are included
        console.log('No currency filter applied');
      }

      // Add search functionality
      if (searchTerm && searchTerm.trim() !== '') {
        whereClause._or = [
          { title: { _ilike: `%${searchTerm}%` } },
          { description: { _ilike: `%${searchTerm}%` } }
        ];
      }

      // Add status filter
      if (status && status.length > 0) {
        // Map filter values to actual database status values
        const mappedStatuses = status.map(statusValue => {
          let actualStatus = statusValue;
          
          // If the status is already a valid ExpenseStatus enum value for expense requests, use it as is
          const validStatuses = [
            'CREATED', 'PENDING', 'APPROVED', 'VERIFIED', 'BOOKED', 
            'TRANSFERRED', 'PAID', 'CLOSED', 'RETURNED', 'REJECTED'
          ];
          
          if (validStatuses.includes(statusValue.toUpperCase())) {
            actualStatus = statusValue.toUpperCase();
          }
          
          return actualStatus;
        });
        
        console.log('Mapped statuses:', mappedStatuses);
        whereClause.status = { _in: mappedStatuses };
      }

      const variables = {
        where: whereClause,
        limit: pageSize,
        offset
      };
      
      console.log('GraphQL variables being sent:', variables);
      
      const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          query: GET_EXPENSE_REQUESTS_BY_MANAGER,
          variables,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (result.errors) {
        console.error('GraphQL errors in expense requests:', result.errors);
        throw new Error(result.errors.map((e: any) => e.message).join(', '));
      }
      
      console.log('Expense requests data received:', {
        requestsCount: result.data.ExpenseRequest?.length,
        totalCount: result.data.ExpenseRequestAggregate?.aggregate?.count
      });
      
      // Get total count from aggregate query
      const count = result.data?.ExpenseRequestAggregate?.aggregate?.count ?? 0;
      setTotalCount(count);
      
      // Map the requests using helper function
      const mappedRequests = mapResponseToRequests(result.data);
      
      setRequests(mappedRequests);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setRequests([]); // Clear requests on error
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, supervisorEmployeeId, setIsLoading, setError, setRequests, setTotalCount]);

  // Function to approve an expense request
  const approveRequest = useCallback(async (requestId: string): Promise<boolean> => {
    if (!accessToken) {
      setError('Access token not found. Cannot approve expense request.');
      return false;
    }

    try {
      const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          query: APPROVE_EXPENSE_REQUEST,
          variables: { id: requestId },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (result.errors && result.errors.length > 0) {
        throw new Error(result.errors.map((e: any) => e.message).join(', '));
      }
      
      // Update the local state
      setRequests(prevRequests => 
        prevRequests.map(request => 
          request.id === requestId 
            ? { ...request, status: 'APPROVED' } 
            : request
        )
      );
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    }
  }, [accessToken, setError, setRequests]);

  // Function to reject an expense request
  const rejectRequest = useCallback(async (requestId: string, rejectionReason?: string): Promise<boolean> => {
    if (!accessToken) {
      setError('Access token not found. Cannot reject expense request.');
      return false;
    }

    try {
      const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          query: REJECT_EXPENSE_REQUEST,
          variables: { 
            id: requestId,
            rejectionReason: rejectionReason ?? undefined,
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
      
      // Update the local state
      setRequests(prevRequests => 
        prevRequests.map(request => 
          request.id === requestId 
            ? { ...request, status: 'REJECTED' } 
            : request
        )
      );
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    }
  }, [accessToken, setError, setRequests]);

  const fetchRequestStatistics = useCallback(async (currencyFilter?: string | null) => {
    if (!accessToken) {
      setRequestStatsError('Access token not available for statistics.');
      return;
    }
    
    setRequestStatsLoading(true);
    setRequestStatsError(null);
    try {
      const currencyRefValue = currencyFilter ? `Currency:v1:${currencyFilter}` : null;
      console.log(`Fetching expense request statistics with currency filter: ${currencyFilter || 'none'}`);
      
      const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          query: GET_EXPENSE_REQUEST_STATISTICS,
          variables: { employeeId: supervisorEmployeeId, currencyRef: currencyRefValue }
        }),
      });
      const result = await response.json();
      if (result.errors) {
        console.error('GraphQL errors in expense request statistics:', result.errors);
        throw new Error(result.errors.map((e: any) => e.message).join(', '));
      }
      
      console.log('Expense request statistics received:', result.data);
      const data = result.data;
      setRequestStats({
        pendingCount: data.pendingRequests?.aggregate?.count ?? 0,
        pendingAmount: data.pendingRequests?.aggregate?.sum?.totalAmount ?? null,
        approvedCount: data.approvedRequests?.aggregate?.count ?? 0,
        approvedAmount: data.approvedRequests?.aggregate?.sum?.totalAmount ?? null,
        rejectedCount: data.rejectedRequests?.aggregate?.count ?? 0,
        rejectedAmount: data.rejectedRequests?.aggregate?.sum?.totalAmount ?? null,
        totalSubmittedAmount: data.allSubmittedRequests?.aggregate?.sum?.totalAmount ?? null,
      });
    } catch (err: any) {
      console.error('Error fetching expense request statistics:', err);
      setRequestStatsError(err.message ?? 'Failed to fetch expense request statistics.');
      setRequestStats(null);
    } finally {
      setRequestStatsLoading(false);
    }
  }, [accessToken, supervisorEmployeeId, setRequestStats, setRequestStatsLoading, setRequestStatsError]);

  // Initial data fetch (requests)
  useEffect(() => {
    if (accessToken) {
      fetchRequests(); // Fetches the first page of requests with default parameters
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    requests,
    isLoading,
    error,
    totalCount,
    fetchRequests,
    requestStats,
    requestStatsLoading,
    requestStatsError,
    fetchRequestStatistics,
    approveRequest,
    rejectRequest
  };
};
