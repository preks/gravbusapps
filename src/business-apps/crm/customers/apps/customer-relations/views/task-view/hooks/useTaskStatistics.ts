"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { TaskStatistics, TaskStatisticItem } from '../types/TaskTypes';
import { TaskFilters } from './useTaskFilters';
import { useSalesTaskQueries } from './useSalesTaskQueries';

interface UseTaskStatisticsProps extends TaskFilters {
  accessToken: string;
}

interface UseTaskStatisticsReturn {
  statistics: TaskStatistics;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Calculate growth percentage and direction
 */
const calculateGrowth = (current: number, previous: number): { growth: number; growthDirection: 'up' | 'down' | 'stable' } => {
  if (previous === 0) {
    return {
      growth: current > 0 ? 100 : 0,
      growthDirection: current > 0 ? 'up' : 'stable'
    };
  }
  
  const growth = ((current - previous) / previous) * 100;
  let growthDirection: 'up' | 'down' | 'stable' = 'stable';
  
  if (growth > 2) growthDirection = 'up';
  else if (growth < -2) growthDirection = 'down';
  
  return { growth, growthDirection };
};

/**
 * Calculate statistics from sales tasks with growth comparison
 */
const calculateStatisticsWithGrowth = (
  currentTasks: any[], 
  previousTasks: any[], 
  allTasks: any[]
): TaskStatistics => {
  // Calculate current period statistics
  let currentTotal = 0;
  let currentInProgress = 0;
  let currentCompleted = 0;
  let currentOverdue = 0;

  currentTasks.forEach(task => {
    currentTotal++;
    
    if (task.statusRef) {
      const statusValue = task.statusRef.split(':').pop()?.toLowerCase();
      switch (statusValue) {
        case 'completed':
        case 'done':
          currentCompleted++;
          break;
        case 'in_progress':
        case 'active':
          currentInProgress++;
          break;
        case 'overdue':
          currentOverdue++;
          break;
        default:
          if (task.dueDate && new Date(task.dueDate) < new Date()) {
            currentOverdue++;
          } else {
            currentInProgress++;
          }
      }
    } else {
      if (task.dueDate && new Date(task.dueDate) < new Date()) {
        currentOverdue++;
      } else {
        currentInProgress++;
      }
    }
  });

  // Calculate previous period statistics
  let previousTotal = 0;
  let previousInProgress = 0;
  let previousCompleted = 0;
  let previousOverdue = 0;

  previousTasks.forEach(task => {
    previousTotal++;
    
    if (task.statusRef) {
      const statusValue = task.statusRef.split(':').pop()?.toLowerCase();
      switch (statusValue) {
        case 'completed':
        case 'done':
          previousCompleted++;
          break;
        case 'in_progress':
        case 'active':
          previousInProgress++;
          break;
        case 'overdue':
          previousOverdue++;
          break;
        default:
          if (task.dueDate && new Date(task.dueDate) < new Date()) {
            previousOverdue++;
          } else {
            previousInProgress++;
          }
      }
    } else {
      if (task.dueDate && new Date(task.dueDate) < new Date()) {
        previousOverdue++;
      } else {
        previousInProgress++;
      }
    }
  });

  // Calculate statistics from filtered all tasks (not system-wide)
  let filteredTotal = 0;
  let filteredInProgress = 0;
  let filteredCompleted = 0;
  let filteredOverdue = 0;

  allTasks.forEach(task => {
    filteredTotal++;
    
    if (task.statusRef) {
      const statusValue = task.statusRef.split(':').pop()?.toLowerCase();
      switch (statusValue) {
        case 'completed':
        case 'done':
          filteredCompleted++;
          break;
        case 'in_progress':
        case 'active':
          filteredInProgress++;
          break;
        case 'overdue':
          filteredOverdue++;
          break;
        default:
          if (task.dueDate && new Date(task.dueDate) < new Date()) {
            filteredOverdue++;
          } else {
            filteredInProgress++;
          }
      }
    } else {
      if (task.dueDate && new Date(task.dueDate) < new Date()) {
        filteredOverdue++;
      } else {
        filteredInProgress++;
      }
    }
  });

  // Calculate growth indicators
  const totalGrowth = calculateGrowth(currentTotal, previousTotal);
  const inProgressGrowth = calculateGrowth(currentInProgress, previousInProgress);
  const completedGrowth = calculateGrowth(currentCompleted, previousCompleted);
  const overdueGrowth = calculateGrowth(currentOverdue, previousOverdue);

  return {
    totalTasks: {
      value: filteredTotal,
      previousValue: previousTotal,
      growth: totalGrowth.growth,
      growthDirection: totalGrowth.growthDirection
    },
    inProgress: {
      value: filteredInProgress,
      previousValue: previousInProgress,
      growth: inProgressGrowth.growth,
      growthDirection: inProgressGrowth.growthDirection
    },
    completed: {
      value: filteredCompleted,
      previousValue: previousCompleted,
      growth: completedGrowth.growth,
      growthDirection: completedGrowth.growthDirection
    },
    overdue: {
      value: filteredOverdue,
      previousValue: previousOverdue,
      growth: overdueGrowth.growth,
      growthDirection: overdueGrowth.growthDirection
    }
  };
};

export const useTaskStatistics = (props: UseTaskStatisticsProps): UseTaskStatisticsReturn => {
  const {
    accessToken,
    // Extract filter properties to use for tab-specific statistics
    assignedEmployeeIds,
    statusRefs,
    priorityRefs,
    taskTypes,
    search,
    createdAfter,
    createdBefore
  } = props;

  // State
  const [statistics, setStatistics] = useState<TaskStatistics>({
    totalTasks: { value: 0 },
    inProgress: { value: 0 },
    completed: { value: 0 },
    overdue: { value: 0 }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Throttling to prevent excessive requests
  const lastFetchTime = useRef(0);
  const FETCH_THROTTLE_MS = 3000; // Only allow refetch every 3 seconds

  // GraphQL queries
  const { fetchHistoricalStatistics } = useSalesTaskQueries({ accessToken });

  // Build filter variables for statistics
  const getFilterVariables = useCallback(() => {
    const filterVariables: any = {};
    
    if (assignedEmployeeIds?.length) {
      filterVariables.assignedEmployeeIds = assignedEmployeeIds;
    }
    
    if (statusRefs?.length) {
      filterVariables.statusRefs = statusRefs;
    }
    
    if (priorityRefs?.length) {
      filterVariables.priorityRefs = priorityRefs;
    }
    
    if (taskTypes?.length) {
      filterVariables.taskTypes = taskTypes;
    }
    
    return filterVariables;
  }, [assignedEmployeeIds, statusRefs, priorityRefs, taskTypes]);

  // Fetch statistics with historical comparison (THROTTLED)
  const fetchStatistics = useCallback(async () => {
    if (!accessToken) {
      console.warn('No access token provided to useTaskStatistics');
      return;
    }

    // Throttle rapid requests
    const now = Date.now();
    if (now - lastFetchTime.current < FETCH_THROTTLE_MS) {
      return; // Skip if too recent
    }
    lastFetchTime.current = now;

    setLoading(true);
    setError(null);

    try {
      // Fetch historical data for 30-day comparison with current filters
      const filterVariables = getFilterVariables();
      const result = await fetchHistoricalStatistics(30, filterVariables);
      
      const stats = calculateStatisticsWithGrowth(
        result.currentTasks, 
        result.previousTasks, 
        result.allTasks
      );
      setStatistics(stats);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load task statistics');
      setError(error);
      console.error('Error loading task statistics:', error);
    } finally {
      setLoading(false);
    }
  }, [accessToken, fetchHistoricalStatistics, getFilterVariables]);

  // Refetch function (THROTTLED)
  const refetch = useCallback(() => {
    const now = Date.now();
    if (now - lastFetchTime.current < FETCH_THROTTLE_MS) {
      return; // Skip if too recent
    }
    fetchStatistics();
  }, [fetchStatistics]);

  // Auto-reload when accessToken or filters change
  useEffect(() => {
    if (accessToken) {
      fetchStatistics();
    }
  }, [
    accessToken,
    fetchStatistics,
    // Include filter dependencies so statistics update when tab changes
    assignedEmployeeIds,
    statusRefs,
    priorityRefs,
    taskTypes
  ]);

  return {
    statistics,
    loading,
    error,
    refetch
  };
}; 