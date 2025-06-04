import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { GET_EXPENSE_PLANS_BY_MANAGER, APPROVE_EXPENSE_PLAN, REJECT_EXPENSE_PLAN } from '../queries/expensePlans';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface ExpensePlan {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    displayName?: string;
    fullName: string;
    email: string;
    pictureThumbnail?: string;
    department: {
      id: string;
      name: string;
    };
  };
  approvedBy: string | null;
  approvedDate: string | null;
  approvalComments: string | null;
  rejectedBy: string | null;
  rejectedDate: string | null;
  rejectionReason: string | null;
}

export interface ExpensePlanResponse {
  ExpensePlan: ExpensePlan[];
  ExpensePlanAggregate: {
    aggregate: {
      count: number;
    };
  };
}

interface UseGetExpensePlansProps extends BusinessAppContextProps {
  pageSize?: number;
  employeeId?: string;
}

export const useGetExpensePlans = ({ accessToken, userInfo, pageSize = 10 }: UseGetExpensePlansProps) => {
  // Get the supervisor employee ID from user info
  const employeeId = userInfo?.employeeDetails?.employeeId;
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [plans, setPlans] = useState<ExpensePlan[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [employeeFilter, setEmployeeFilter] = useState<string | null>(null);
  const [approving, setApproving] = useState<boolean>(false);
  const [rejecting, setRejecting] = useState<boolean>(false);

  const fetchPlans = useCallback(async () => {
    console.log('fetchPlans called with accessToken:', !!accessToken, 'employeeId:', employeeId);
    
    if (!accessToken) {
      setError(new Error('Access token not found. Cannot fetch expense plans.'));
      setLoading(false);
      return;
    }
    
    if (!employeeId) {
      setError(new Error('Employee ID not found. Cannot fetch expense plans.'));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const searchValue = search ? `%${search}%` : '%%';
      const offset = (currentPage - 1) * pageSize;
      
      console.log('Fetching expense plans with employeeId:', employeeId);
      
      const response = await fetch('https://newwork-dev.newwork.com/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          query: GET_EXPENSE_PLANS_BY_MANAGER,
          variables: {
            employeeId,
            limit: pageSize,
            offset,
            searchTerm: searchValue
          }
        })
      });

      const result = await response.json();
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      const data = result.data as ExpensePlanResponse;
      console.log('Expense plans data received:', data);
      
      // Apply client-side filtering for status and employee
      let filteredPlans = data.ExpensePlan;
      
      // Filter by status if statusFilter is set
      if (statusFilter) {
        filteredPlans = filteredPlans.filter(plan => plan.status === statusFilter);
      }
      
      // Filter by employee if employeeFilter is set
      if (employeeFilter) {
        filteredPlans = filteredPlans.filter(plan => plan.employee.id === employeeFilter);
      }
      
      // Update state with filtered data
      setPlans(filteredPlans);
      setTotalCount(data.ExpensePlanAggregate.aggregate.count);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch expense plans'));
      console.error('Error fetching expense plans:', err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, employeeId, currentPage, pageSize, search, statusFilter, employeeFilter]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (status: string | null) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleEmployeeFilter = (empId: string | null) => {
    setEmployeeFilter(empId);
    setCurrentPage(1);
  };

  // Fetch plans when component mounts or when dependencies change
  useEffect(() => {
    console.log('useEffect triggered with employeeId:', employeeId);
    fetchPlans();
  }, [accessToken, employeeId, currentPage, search, statusFilter, employeeFilter, fetchPlans]);

  const approvePlan = async (planId: string, comments?: string) => {
    if (!accessToken || !employeeId) return;

    setApproving(true);
    try {
      const response = await fetch('https://newwork-dev.newwork.com/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          query: APPROVE_EXPENSE_PLAN,
          variables: {
            planId,
            approverEmployeeId: employeeId,
            comments: comments ?? null
          }
        })
      });

      const result = await response.json();
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      message.success('Expense plan approved successfully');
      fetchPlans();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to approve expense plan'));
      message.error('Failed to approve expense plan');
      console.error('Error approving expense plan:', err);
    } finally {
      setApproving(false);
    }
  };

  const rejectPlan = async (planId: string, reason: string) => {
    if (!accessToken || !employeeId) return;

    setRejecting(true);
    try {
      const response = await fetch('https://newwork-dev.newwork.com/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          query: REJECT_EXPENSE_PLAN,
          variables: {
            planId,
            rejectorEmployeeId: employeeId,
            reason
          }
        })
      });

      const result = await response.json();
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      message.success('Expense plan rejected successfully');
      fetchPlans();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to reject expense plan'));
      message.error('Failed to reject expense plan');
      console.error('Error rejecting expense plan:', err);
    } finally {
      setRejecting(false);
    }
  };

  return {
    loading,
    error,
    plans,
    totalCount,
    currentPage,
    search,
    statusFilter,
    employeeFilter,
    approving,
    rejecting,
    handlePageChange,
    handleSearch,
    handleStatusFilter,
    handleEmployeeFilter,
    approvePlan,
    rejectPlan,
    fetchPlans
  };
};

export default useGetExpensePlans;
