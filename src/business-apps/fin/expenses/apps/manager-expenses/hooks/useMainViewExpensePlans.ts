import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { 
  GET_MAIN_VIEW_EXPENSE_PLANS, 
  GET_MAIN_VIEW_EXPENSE_PLAN_STATISTICS 
} from '../queries/mainViewExpensePlans';
import { APPROVE_EXPENSE_PLAN, REJECT_EXPENSE_PLAN } from '../queries/expensePlans';
import { env } from '@/common/env/EnvUtils';

export interface ExpensePlan {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: string;
  startDate: string;
  endDate: string;
  planDate: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    displayName?: string;
    fullName: string;
    pictureThumbnail?: string;
    employeePosition: {
      organizationalUnit: {
        id: string;
        name: string;
      };
      siteLocation: {
        id: string;
        name: string;
      };
    };
  };
}

export interface ExpensePlanResponse {
  ExpensePlan: ExpensePlan[];
  ExpensePlanAggregate: {
    aggregate: {
      count: number;
    };
  };
}

export interface ExpensePlanStatistics {
  totalCount: number;
  sumTotalAmount: number | null;
  pendingCount: number;
  pendingAmount: number | null;
}

interface ExpensePlanStatisticsResponse {
  allPlansStats?: {
    aggregate: {
      totalCount: number;
      sum?: {
        totalAmount: number | null;
      };
    };
  };
  pendingPlansStats?: {
    aggregate: {
      pendingCount: number;
      sum?: {
        totalAmount: number | null;
      };
    };
  };
}

interface UseMainViewExpensePlansProps extends BusinessAppContextProps {
  pageSize?: number;
  searchTerm?: string;
  currentStatusFilter?: string | null;
}

export const useMainViewExpensePlans = ({
  accessToken,
  userInfo,
  pageSize = 10,
  searchTerm,
  currentStatusFilter,
}: UseMainViewExpensePlansProps) => {
  // Get managerId from userInfo or use a fallback for development
  const managerId = userInfo?.employeeDetails?.employeeId || "00000000-0000-0000-0000-000000000000";
  
  // Log the managerId to help with debugging
  console.log('useMainViewExpensePlans - managerId:', managerId);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [plans, setPlans] = useState<ExpensePlan[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [employeeFilter, setEmployeeFilter] = useState<string | null>(null); 
  const [approving, setApproving] = useState<boolean>(false);
  const [rejecting, setRejecting] = useState<boolean>(false);
  const [planStats, setPlanStats] = useState<ExpensePlanStatistics | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(false);
  const [statsError, setStatsError] = useState<Error | null>(null);

  const fetchPlans = useCallback(async () => {
    console.log('fetchPlans called with accessToken:', !!accessToken, 'managerId:', managerId);
    
    if (!accessToken) {
      setError(new Error('Access token not found. Cannot fetch expense plans.'));
      setLoading(false);
      return;
    }
    
    if (!managerId) {
      setError(new Error('Manager ID not found. Cannot fetch expense plans.'));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const searchValue = searchTerm ? `%${searchTerm}%` : '%%'; 
      const offset = (currentPage - 1) * pageSize;
      
      console.log('Fetching expense plans with managerId:', managerId);
      
      const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          query: GET_MAIN_VIEW_EXPENSE_PLANS,
          variables: {
            managerId,
            limit: pageSize,
            offset,
            searchTerm: searchValue,
            status: currentStatusFilter === 'all' || !currentStatusFilter ? null : currentStatusFilter 
          }
        })
      });

      const result = await response.json();
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      const data = result.data as ExpensePlanResponse;
      console.log('Expense plans data received:', {
        plansCount: data.ExpensePlan?.length,
        totalCount: data.ExpensePlanAggregate?.aggregate?.count,
        firstPlan: data.ExpensePlan?.[0],
        managerId
      });
      
      // Apply client-side filtering for status and employee
      let filteredPlans = data.ExpensePlan;
      
      // Filter by employee if specified
      if (employeeFilter) {
        filteredPlans = filteredPlans.filter(plan => plan.employee?.id === employeeFilter);
      }

      setPlans(filteredPlans || []);
      setTotalCount(data.ExpensePlanAggregate?.aggregate?.count || 0);
    } catch (err) {
      console.error('Error fetching expense plans:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch expense plans'));
    } finally {
      setLoading(false);
    }
  }, [accessToken, managerId, currentPage, pageSize, searchTerm, currentStatusFilter, employeeFilter]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const fetchPlanStatistics = useCallback(async () => {
    if (!accessToken || !managerId) {
      setStatsError(new Error('Missing required parameters'));
      setStatsLoading(false);
      return;
    }

    setStatsLoading(true);
    setStatsError(null);

    try {
      const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          query: GET_MAIN_VIEW_EXPENSE_PLAN_STATISTICS,
          variables: { managerId }
        })
      });
      const result = await response.json();
      
      if (result.errors) {
        throw new Error(result.errors[0].message);
      }
      
      const data = result.data as ExpensePlanStatisticsResponse;
      
      console.log('Expense plan statistics received:', {
        totalCount: data.allPlansStats?.aggregate.totalCount,
        sumTotalAmount: data.allPlansStats?.aggregate.sum?.totalAmount,
        pendingCount: data.pendingPlansStats?.aggregate.pendingCount,
        pendingAmount: data.pendingPlansStats?.aggregate.sum?.totalAmount
      });
      
      setPlanStats({
        totalCount: data.allPlansStats?.aggregate.totalCount || 0,
        sumTotalAmount: data.allPlansStats?.aggregate.sum?.totalAmount || null,
        pendingCount: data.pendingPlansStats?.aggregate.pendingCount || 0,
        pendingAmount: data.pendingPlansStats?.aggregate.sum?.totalAmount || null
      });
    } catch (err) {
      console.error('Error fetching expense plan statistics:', err);
      setStatsError(err instanceof Error ? err : new Error('Failed to fetch expense plan statistics'));
    } finally {
      setStatsLoading(false);
    }
  }, [accessToken, managerId]);

  useEffect(() => {
    fetchPlanStatistics();
  }, [fetchPlanStatistics]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const approvePlan = useCallback(async (planId: string, comments?: string) => {
    if (!accessToken || !managerId) return;

    setApproving(true);
    try {
      console.log(`Approving plan ${planId} with comments: ${comments}`);
      const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          query: APPROVE_EXPENSE_PLAN,
          variables: {
            planId,
            approverEmployeeId: managerId,
            comments: comments ?? null
          }
        })
      });

      const result = await response.json();
      console.log('Approve plan response:', result);
      
      if (result.errors) {
        console.error('GraphQL errors in approve plan:', result.errors);
        throw new Error(result.errors[0].message);
      }

      message.success('Expense plan approved successfully');
      fetchPlans();
      fetchPlanStatistics();
    } catch (err) {
      console.error('Error approving expense plan:', err);
      message.error('Failed to approve expense plan');
    } finally {
      setApproving(false);
    }
  }, [accessToken, managerId, fetchPlans, fetchPlanStatistics]);

  const rejectPlan = useCallback(async (planId: string, reason: string) => {
    if (!accessToken || !managerId) return;

    setRejecting(true);
    try {
      const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          query: REJECT_EXPENSE_PLAN,
          variables: {
            planId,
            rejectorEmployeeId: managerId,
            reason
          }
        })
      });

      message.success('Expense plan rejected successfully');
      fetchPlans();
      fetchPlanStatistics();
    } catch (err) {
      console.error('Error rejecting expense plan:', err);
      message.error('Failed to reject expense plan');
    } finally {
      setRejecting(false);
    }
  }, [accessToken, managerId, fetchPlans, fetchPlanStatistics]);

  return {
    loading,
    error,
    plans,
    totalCount,
    currentPage,
    setCurrentPage: handlePageChange,
    approving,
    rejecting,
    approvePlan,
    rejectPlan,
    planStats,
    statsLoading,
    statsError,
    fetchPlanStatistics,
    setEmployeeFilter,
    employeeFilter
  };
};
