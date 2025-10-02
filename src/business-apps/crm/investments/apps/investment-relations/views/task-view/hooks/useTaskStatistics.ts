import { useState, useCallback, useEffect, useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetTaskStatistics } from '../queries/taskStatisticsQueries';

interface TaskStatistics {
  totalTasks: { value: number };
  inProgress: { value: number };
  completed: { value: number };
  overdue: { value: number };
}

interface UseTaskStatisticsProps extends BusinessAppContextProps {
  filters?: Record<string, any>;
  search?: string;
}

interface UseTaskStatisticsReturn {
  myTasksStatistics: TaskStatistics;
  teamTasksStatistics: TaskStatistics;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export const useTaskStatistics = (props: UseTaskStatisticsProps): UseTaskStatisticsReturn => {
  const { accessToken, userInfo } = props;
  const { fetchTaskStatistics } = useGetTaskStatistics(props);

  const [myTasksStatistics, setMyTasksStatistics] = useState<TaskStatistics>({
    totalTasks: { value: 0 },
    inProgress: { value: 0 },
    completed: { value: 0 },
    overdue: { value: 0 }
  });

  const [teamTasksStatistics, setTeamTasksStatistics] = useState<TaskStatistics>({
    totalTasks: { value: 0 },
    inProgress: { value: 0 },
    completed: { value: 0 },
    overdue: { value: 0 }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Build filters once and memoize them - no dependencies on external filters/search
  const myTasksFilters = useMemo(() => {
    const myFilters: any = {};
    if (userInfo?.employeeDetails?.employeeId) {
      myFilters.assignedEmployeeIds = [userInfo.employeeDetails.employeeId];
    } else if ((userInfo as any)?.employeeId) {
      myFilters.assignedEmployeeIds = [(userInfo as any).employeeId];
    } else if (userInfo?.id) {
      myFilters.assignedEmployeeIds = [userInfo.id];
    }
    return myFilters;
  }, [userInfo]);

  const teamTasksFilters = useMemo(() => {
    return {}; // No filters for team tasks - show all
  }, []);

  const fetchStats = useCallback(async () => {
    if (!accessToken) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchTaskStatistics({
        myTasksFilters,
        teamTasksFilters
      });

      // Transform the result to match the expected format
      setMyTasksStatistics({
        totalTasks: { value: result.myTasks.aggregate.count },
        inProgress: { value: result.myTasksInProgress.aggregate.count },
        completed: { value: result.myTasksCompleted.aggregate.count },
        overdue: { value: result.myTasksOverdue.aggregate.count }
      });

      setTeamTasksStatistics({
        totalTasks: { value: result.teamTasks.aggregate.count },
        inProgress: { value: result.teamTasksInProgress.aggregate.count },
        completed: { value: result.teamTasksCompleted.aggregate.count },
        overdue: { value: result.teamTasksOverdue.aggregate.count }
      });
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Failed to load task statistics');
      setError(e);

    } finally {
      setIsLoading(false);
    }
  }, [accessToken, myTasksFilters, teamTasksFilters]);

  const refetch = useCallback(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (accessToken) {
      fetchStats();
    }
  }, [accessToken, fetchStats]);

  return {
    myTasksStatistics,
    teamTasksStatistics,
    isLoading,
    error,
    refetch
  };
};
