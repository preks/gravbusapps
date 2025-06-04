import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { 
  GET_EXPENSE_REQUESTS_BY_MANAGER, 
  GET_TEAM_MEMBERS_BY_MANAGER,
  APPROVE_EXPENSE_REQUEST,
  REJECT_EXPENSE_REQUEST
} from '../queries/expenseRequests';

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

export interface TeamMember {
  id: string;
  fullName: string;
  department?: string;
  jobTitle?: string;
}

export interface ExpenseRequestsResult {
  requests: ExpenseRequest[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  teamMembers: TeamMember[];
  fetchRequests: (
    searchTerm?: string, 
    page?: number, 
    pageSize?: number, 
    employeeId?: string,
    status?: string
  ) => Promise<void>;
  approveRequest: (requestId: string) => Promise<boolean>;
  rejectRequest: (requestId: string, rejectionReason?: string) => Promise<boolean>;
}

/**
 * Hook to fetch expense requests for team members with pagination, search, and filtering support
 * @param context Business app context containing user info and access token
 * @returns Object containing expense requests, loading state, error, total count, and fetch function
 */
export const useGetExpenseRequests = (context?: BusinessAppContextProps): ExpenseRequestsResult => {
  const [requests, setRequests] = useState<ExpenseRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

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
  
  // Function to fetch team members
  const fetchTeamMembers = useCallback(async () => {
    const managerId = context?.userInfo?.employeeDetails?.employeeId;
    const accessToken = context?.accessToken;

    if (!managerId || !accessToken) {
      return;
    }

    try {
      const response = await fetch('https://newwork-dev.newwork.com/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          query: GET_TEAM_MEMBERS_BY_MANAGER,
          variables: { managerId },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (result.errors && result.errors.length > 0) {
        throw new Error(result.errors.map((e: any) => e.message).join(', '));
      }
      
      const fetchedTeamMembers = result.data?.Employee ?? [];
      setTeamMembers(fetchedTeamMembers);
    } catch (err) {
      console.error('Error fetching team members:', err);
    }
  }, [context?.accessToken, context?.userInfo?.employeeDetails?.employeeId]);
  
  // Function to fetch requests with search, pagination, and filtering
  const fetchRequests = useCallback(async (
    searchTerm: string = '', 
    page: number = 1, 
    pageSize: number = 10,
    employeeId: string = 'all',
    status: string = 'all'
  ) => {
    const managerId = context?.userInfo?.employeeDetails?.employeeId;
    const accessToken = context?.accessToken;

    if (!managerId) {
      setError('Manager ID not found. Cannot fetch expense requests.');
      setRequests([]);
      setTotalCount(0);
      setIsLoading(false);
      return;
    }

    if (!accessToken) {
      setError('Access token not found. Cannot fetch expense requests.');
      setRequests([]);
      setTotalCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Build query variables with helper function
      const variables = buildQueryVariables(managerId, searchTerm, page, pageSize, employeeId, status);
      
      const response = await fetch('https://newwork-dev.newwork.com/v1/graphql', {
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

      if (result.errors && result.errors.length > 0) {
        throw new Error(result.errors.map((e: any) => e.message).join(', '));
      }
      
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
  }, [context?.accessToken, context?.userInfo?.employeeDetails?.employeeId]);

  // Function to approve an expense request
  const approveRequest = useCallback(async (requestId: string): Promise<boolean> => {
    const accessToken = context?.accessToken;

    if (!accessToken) {
      setError('Access token not found. Cannot approve expense request.');
      return false;
    }

    try {
      const response = await fetch('https://newwork-dev.newwork.com/v1/graphql', {
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
  }, [context?.accessToken]);

  // Function to reject an expense request
  const rejectRequest = useCallback(async (requestId: string, rejectionReason?: string): Promise<boolean> => {
    const accessToken = context?.accessToken;

    if (!accessToken) {
      setError('Access token not found. Cannot reject expense request.');
      return false;
    }

    try {
      const response = await fetch('https://newwork-dev.newwork.com/v1/graphql', {
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
  }, [context?.accessToken]);

  // Fetch team members on initial load
  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  // Initial fetch of requests
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return {
    requests,
    isLoading,
    error,
    totalCount,
    teamMembers,
    fetchRequests,
    approveRequest,
    rejectRequest
  };
};
