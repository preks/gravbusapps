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
  startDate?: string;
  endDate?: string;
  amount: number;
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
    employeeId?: string,
    status?: string
  ) => Promise<void>;
  approveRequest: (requestId: string) => Promise<boolean>;
  rejectRequest: (requestId: string, rejectionReason?: string) => Promise<boolean>;
  requestStats: ExpenseRequestStatisticsData | null;
  requestStatsLoading: boolean;
  requestStatsError: string | null;
  fetchRequestStatistics: () => Promise<void>;
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

  // Use the real manager ID from userInfo with a fallback UUID for development
  const supervisorEmployeeId = userInfo?.employeeDetails?.employeeId || userInfo?.id || '00000000-0000-0000-0000-000000000000';

  /**
   * Helper function to build GraphQL variables for the query
   */
  const buildQueryVariables = (
    managerId: string, 
    searchTerm: string, 
    page: number, 
    pageSize: number,
    employeeId?: string,
    status?: string
  ) => {
    const formattedSearchTerm = searchTerm === '' ? '%' : `%${searchTerm}%`;
    const offset = (page - 1) * pageSize;
    
    // Build variables object dynamically based on provided filters
    const variables: Record<string, any> = {
      managerId,
      searchTerm: formattedSearchTerm,
      limit: pageSize,
      offset: offset,
    };
    
    // Only include filter variables if they are provided
    if (status && status !== 'all') {
      variables.status = status;
    }
    
    if (employeeId && employeeId !== 'all') {
      variables.employeeId = employeeId;
    }
    
    return variables;
  };

  /**
   * Helper function to map API response to ExpenseRequest objects
   */
  const mapResponseToRequests = (data: any): ExpenseRequest[] => {
    const fetchedRequests = data?.ExpenseRequest ?? [];
    return fetchedRequests.map((request: any) => ({
      id: request.id,
      code: request.code,
      title: request.title ?? 'Untitled Request',
      description: request.description,
      requestDate: request.requestDate ? new Date(request.requestDate).toISOString().split('T')[0] : 'N/A',
      totalAmount: request.totalAmount ?? 0,
      status: request.status ?? 'PENDING',
      attachments: request.attachments,
      employee: request.employee,
      startDate: request.startDate,
      endDate: request.endDate,
    }));
  };
  
  // Function to fetch requests with search, pagination, and filtering
  const fetchRequests = useCallback(async (
    searchTerm: string = '',
    page: number = 1,
    pageSize: number = 10,
    employeeId: string = 'all', // This is a filter parameter, distinct from supervisor's ID
    status: string = 'all'
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
      employeeId,
      status
    });
    

    setIsLoading(true);
    setError(null);
    
    try {
      // Build query variables with helper function
      const variables = buildQueryVariables(supervisorEmployeeId, searchTerm, page, pageSize, employeeId, status);
      
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
        totalCount: result.data.ExpenseRequestAggregate?.aggregate?.count,
        variables: variables
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

  const fetchRequestStatistics = useCallback(async () => {
    if (!accessToken) {
      setRequestStatsError('Access token not available for statistics.');
      setRequestStats(null);
      setRequestStatsLoading(false);
      return;
    }
    
    console.log('Fetching expense request statistics for manager:', supervisorEmployeeId);
    setRequestStatsLoading(true);
    setRequestStatsError(null);
    try {
      const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          query: GET_EXPENSE_REQUEST_STATISTICS,
          variables: { employeeId: supervisorEmployeeId },
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
  }, [accessToken, setRequestStats, setRequestStatsLoading, setRequestStatsError]);

  // Initial data fetch (requests, and statistics)
  useEffect(() => {
    if (accessToken) {
      fetchRequests(); // Fetches the first page of requests
      fetchRequestStatistics();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, fetchRequests, fetchRequestStatistics]);

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
