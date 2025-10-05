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
  const [internalPageSize, setInternalPageSize] = useState<number>(20);
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

  // Fetch tasks data
  const fetchTasks = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const flowMetricsClient = new FlowMetricsClient(accessToken);

      const params: FlowExecutionTasksParams = {
        cockpitPage: 'INBOX',
        state: 'open', // Only fetch open/active tasks
        size: pageSize,
        page: currentPage - 1,
        field: 'CREATION_DATE',
        direction: 'DESC',
        ...(searchTerm && { search: searchTerm }),
        ...(context?.userInfo?.id && { userId: context.userInfo.id }),
        ...(filterTaskName && { filterTaskName: filterTaskName }),
      };

      const response = await flowMetricsClient.getFlowExecutionTasks(params);

      const tasksData = response.processingStates || response.content || [];
      const totalCountData = response.totalCount || response.totalElements || 0;

      if (!response || !Array.isArray(tasksData)) {
        console.error('Invalid data structure received:', response);
        throw new Error('Invalid data structure received from server');
      }

      setTasks(tasksData);
      setTotalCount(totalCountData);
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
  }, [accessToken, currentPage, pageSize, searchTerm, filterTaskName, context?.userInfo?.id]);

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
