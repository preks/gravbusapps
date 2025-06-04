import { useState, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { GET_ADVANCE_PAYMENTS_BY_MANAGER } from '../queries/advancePayments';

// Define types for the hook
export interface AdvancePaymentItem {
  id: string;
  code?: string;
  description?: string;
  status: string;
  title?: string; // From expensePlan.title
  employeeDisplayName?: string; // From expensePlan.employee.displayName
  employeeFullName?: string; // From expensePlan.employee.fullName
  employeePictureThumbnail?: string; // From expensePlan.employee.pictureThumbnail
  startDate?: string; // From expensePlan.startDate
  endDate?: string; // From expensePlan.endDate
  amount?: number; // From AdvancePayment.amount
  // Add other relevant fields from the query if needed for the UI
}

export interface AdvancePaymentsResult {
  payments: AdvancePaymentItem[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  fetchPayments: (
    searchTerm?: string,
    page?: number,
    pageSize?: number,
    status?: string
  ) => Promise<void>;
}

/**
 * Hook to fetch advance payments for team members managed by the current user.
 * Supports pagination, search, and status filtering.
 * @param context Business app context containing user info and access token
 * @returns Object containing advance payments, loading state, error, total count, and fetch function
 */
export const useGetAdvancePayments = (context?: BusinessAppContextProps): AdvancePaymentsResult => {
  const [payments, setPayments] = useState<AdvancePaymentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);

  const buildQueryVariables = (
    employeeId: string, // Changed from managerId to employeeId to match query
    searchTerm: string,
    page: number,
    pageSize: number,
    status?: string
  ) => {
    const formattedSearchTerm = searchTerm === '' ? undefined : `%${searchTerm}%`;
    const offset = (page - 1) * pageSize;

    const variables: Record<string, any> = {
      employeeId, // Use employeeId here
      limit: pageSize,
      offset: offset,
    };

    if (formattedSearchTerm) {
      variables.searchTerm = formattedSearchTerm;
    }

    if (status && status !== 'all') {
      variables.status = status;
    }
    return variables;
  };

  const mapResponseToPayments = (data: any): AdvancePaymentItem[] => {
    const fetchedPayments = data?.AdvancePayment ?? [];
    return fetchedPayments.map((payment: any) => ({
      id: payment.id,
      code: payment.code,
      description: payment.description,
      status: payment.status ?? 'PENDING',
      title: payment.expensePlan?.title,
      employeeDisplayName: payment.expensePlan?.employee?.displayName,
      employeeFullName: payment.expensePlan?.employee?.fullName,
      employeePictureThumbnail: payment.expensePlan?.employee?.pictureThumbnail,
      amount: payment.amount,
      startDate: payment.expensePlan?.startDate,
      endDate: payment.expensePlan?.endDate,
    }));
  };

  const fetchPayments = useCallback(async (
    searchTerm: string = '',
    page: number = 1,
    pageSize: number = 10,
    status?: string,
  ) => {
    const employeeId = context?.userInfo?.employeeDetails?.employeeId; // This is the manager's ID
    const accessToken = context?.accessToken;

    if (!employeeId) {
      setError('Employee ID (Manager ID) not found. Cannot fetch advance payments.');
      setPayments([]);
      setTotalCount(0);
      setIsLoading(false);
      return;
    }

    if (!accessToken) {
      setError('Access token not found. Cannot fetch advance payments.');
      setPayments([]);
      setTotalCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const variables = buildQueryVariables(employeeId, searchTerm, page, pageSize, status);
      
      const response = await fetch('https://newwork-dev.newwork.com/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          query: GET_ADVANCE_PAYMENTS_BY_MANAGER,
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
      
      if (!result.data) {
        console.error('No data returned from GraphQL query:', result);
        throw new Error('No data returned from query.');
      }

      const mappedPayments = mapResponseToPayments(result.data);
      setPayments(mappedPayments);
      setTotalCount(result.data.AdvancePaymentAggregate?.aggregate?.count ?? 0);

    } catch (err: any) {
      console.error('Error fetching advance payments by manager:', err);
      setError(err.message ?? 'Failed to fetch advance payments.');
      setPayments([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [context?.accessToken, context?.userInfo?.employeeDetails?.employeeId]);

  return {
    payments,
    isLoading,
    error,
    totalCount,
    fetchPayments,
  };
};
