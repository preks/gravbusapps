import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import {
  FlowMetricsClient,
  FlowExecutionTask,
  FlowExecutionTasksParams,
} from '@/common/network/flow-metrics/FlowMetricsClient';

export interface UseFlowExecutionTasksResult {
  tasks: FlowExecutionTask[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterTaskName: string | null;
  setFilterTaskName: (taskName: string | null) => void;
  refresh: () => Promise<void>;
  completing: boolean;
  completeTask: (taskId: string, variables?: Record<string, any>) => Promise<void>;
  taskIdToAction: string;
}

export const useFlowExecutionTasks = (
  context?: BusinessAppContextProps,
  externalPagination?: {
    currentPage?: number;
    pageSize?: number;
    searchTerm?: string;
    filterTaskName?: string | null;
  },
): UseFlowExecutionTasksResult => {
  // State for tasks data
  const [tasks, setTasks] = useState<FlowExecutionTask[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state - use external if provided, otherwise internal state
  const [internalCurrentPage, setInternalCurrentPage] = useState<number>(1);
  const [internalPageSize, setInternalPageSize] = useState<number>(100); // Increased to 100 to show all tasks
  const [internalSearchTerm, setInternalSearchTerm] = useState<string>('');
  const [internalFilterTaskName, setInternalFilterTaskName] = useState<string | null>(null);

  // Use external pagination if provided, otherwise use internal state
  const currentPage = externalPagination?.currentPage ?? internalCurrentPage;
  const pageSize = externalPagination?.pageSize ?? internalPageSize;
  const searchTerm = externalPagination?.searchTerm ?? internalSearchTerm;
  const filterTaskName = externalPagination?.filterTaskName ?? internalFilterTaskName;

  // Setters - use internal setters if no external pagination provided
  const setCurrentPage = externalPagination ? () => {} : setInternalCurrentPage;
  const setPageSize = externalPagination ? () => {} : setInternalPageSize;
  const setSearchTerm = externalPagination ? () => {} : setInternalSearchTerm;
  const setFilterTaskName = externalPagination ? () => {} : setInternalFilterTaskName;

  // Action states
  const [completing, setCompleting] = useState<boolean>(false);
  const [taskIdToAction, setTaskIdToAction] = useState<string>('');

  // Initialize the FlowMetrics client
  const accessToken = context?.accessToken || '';

  // Fetch tasks data - for certain process types, fetch both base and StoreDirector variants
  const fetchTasks = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const flowMetricsClient = new FlowMetricsClient(accessToken);

      // Define task name variations that need separate fetches
      const needsVariantFetch = filterTaskName && [
        'approveAdvancePayment',
        'approveExpenseRequest',
        'approveExpensePlan',
      ].includes(filterTaskName);

      const baseParams: FlowExecutionTasksParams = {
        cockpitPage: 'INBOX',
        size: pageSize,
        page: currentPage - 1,
        field: 'CREATION_DATE',
        direction: 'DESC',
        ...(searchTerm && { search: searchTerm }),
        ...(context?.userInfo?.id && { userId: context.userInfo.id }),
      };

      let allTasks: any[] = [];
      let totalCount = 0;

      if (needsVariantFetch) {
        // Make 2 API calls: one for base, one for StoreDirector variant
        console.log('🔍 [DUAL FETCH] Fetching base + StoreDirector variant for', filterTaskName);
        
        const [baseResponse, variantResponse] = await Promise.all([
          flowMetricsClient.getFlowExecutionTasks({
            ...baseParams,
            filterTaskName: filterTaskName, // Base: approveAdvancePayment
          }),
          flowMetricsClient.getFlowExecutionTasks({
            ...baseParams,
            filterTaskName: `${filterTaskName}StoreDirector`, // Variant: approveAdvancePaymentStoreDirector
          }),
        ]);

        const baseTasks = baseResponse.processingStates || baseResponse.content || [];
        const variantTasks = variantResponse.processingStates || variantResponse.content || [];

        console.log('📦 Base tasks:', baseTasks.length, 'Variant tasks:', variantTasks.length);

        // Merge and deduplicate by ID
        const taskMap = new Map();
        [...baseTasks, ...variantTasks].forEach((task) => {
          if (!taskMap.has(task.id)) {
            taskMap.set(task.id, task);
          }
        });
        
        allTasks = Array.from(taskMap.values());
        
        // Sort by creation date descending (most recent first)
        allTasks.sort((a, b) => {
          const dateA = new Date(a.started || a.lastUpdate || 0).getTime();
          const dateB = new Date(b.started || b.lastUpdate || 0).getTime();
          return dateB - dateA;
        });

        totalCount = (baseResponse.totalCount || 0) + (variantResponse.totalCount || 0);
      } else {
        // Single fetch for other task types
        const response = await flowMetricsClient.getFlowExecutionTasks({
          ...baseParams,
          ...(filterTaskName && { filterTaskName }),
        });

        allTasks = response.processingStates || response.content || [];
        totalCount = response.totalCount || response.totalElements || 0;
      }

      if (!Array.isArray(allTasks)) {
        console.error('Invalid data structure received');
        throw new Error('Invalid data structure received from server');
      }

      setTasks(allTasks);
      setTotalCount(totalCount);
    } catch (err: any) {
      console.error('Error fetching flow execution tasks:', err);
      let errorMessage = 'Failed to fetch flow execution tasks';

      if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setTasks([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, searchTerm, context?.userInfo?.id, filterTaskName, currentPage, pageSize]);

  // Fetch tasks when dependencies change (tab switch, page change, search, etc.)
  useEffect(() => {
    if (accessToken) {
      fetchTasks();
    }
  }, [accessToken, fetchTasks]);

  // Complete a task
  const completeTask = useCallback(
    async (taskId: string, variables?: Record<string, any>) => {
      if (!accessToken) return;

      setCompleting(true);
      setTaskIdToAction(taskId);

      try {
        const flowMetricsClient = new FlowMetricsClient(accessToken);
        await flowMetricsClient.completeTask(taskId, variables);

        // Refresh the data after completion
        await fetchTasks();
      } catch (err: any) {
        setError(err.message || 'Failed to complete task');
      } finally {
        setCompleting(false);
        setTaskIdToAction('');
      }
    },
    [accessToken, fetchTasks],
  );

  // Fetch data on component mount and when dependencies change
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    totalCount,
    isLoading,
    error,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    searchTerm,
    setSearchTerm,
    filterTaskName,
    setFilterTaskName,
    refresh: fetchTasks,
    completing,
    completeTask,
    taskIdToAction,
  };
};
