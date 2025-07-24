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

  // Calculate growth indicators
  const totalGrowth = calculateGrowth(currentTotal, previousTotal);
  const inProgressGrowth = calculateGrowth(currentInProgress, previousInProgress);
  const completedGrowth = calculateGrowth(currentCompleted, previousCompleted);
  const overdueGrowth = calculateGrowth(currentOverdue, previousOverdue);

  // Use all tasks count for total to show system-wide statistics
  const systemTotal = allTasks.length;
  let systemInProgress = 0;
  let systemCompleted = 0;
  let systemOverdue = 0;

  allTasks.forEach(task => {
    if (task.statusRef) {
      const statusValue = task.statusRef.split(':').pop()?.toLowerCase();
      switch (statusValue) {
        case 'completed':
        case 'done':
          systemCompleted++;
          break;
        case 'in_progress':
        case 'active':
          systemInProgress++;
          break;
        case 'overdue':
          systemOverdue++;
          break;
        default:
          if (task.dueDate && new Date(task.dueDate) < new Date()) {
            systemOverdue++;
          } else {
            systemInProgress++;
          }
      }
    } else {
      if (task.dueDate && new Date(task.dueDate) < new Date()) {
        systemOverdue++;
      } else {
        systemInProgress++;
      }
    }
  });

  return {
    totalTasks: {
      value: systemTotal,
      previousValue: previousTotal,
      growth: totalGrowth.growth,
      growthDirection: totalGrowth.growthDirection
    },
    inProgress: {
      value: systemInProgress,
      previousValue: previousInProgress,
      growth: inProgressGrowth.growth,
      growthDirection: inProgressGrowth.growthDirection
    },
    completed: {
      value: systemCompleted,
      previousValue: previousCompleted,
      growth: completedGrowth.growth,
      growthDirection: completedGrowth.growthDirection
    },
    overdue: {
      value: systemOverdue,
      previousValue: previousOverdue,
      growth: overdueGrowth.growth,
      growthDirection: overdueGrowth.growthDirection
    }
  };
};

export const useTaskStatistics = (props: UseTaskStatisticsProps): UseTaskStatisticsReturn => {
  const {
    accessToken
    // NOTE: Intentionally NOT destructuring filter properties
    // because statistics should show totals, not filtered counts
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
      // Fetch historical data for 30-day comparison
      const result = await fetchHistoricalStatistics(30);
      
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
  }, [accessToken, fetchHistoricalStatistics]);

  // Refetch function (THROTTLED)
  const refetch = useCallback(() => {
    const now = Date.now();
    if (now - lastFetchTime.current < FETCH_THROTTLE_MS) {
      return; // Skip if too recent
    }
    fetchStatistics();
  }, [fetchStatistics]);

  // Auto-reload when accessToken changes
  useEffect(() => {
    if (accessToken) {
      fetchStatistics();
    }
  }, [
    accessToken,
    fetchStatistics
    // NOTE: No filter dependencies - statistics should only update when accessToken changes
    // This ensures statistics always show totals, not filtered counts
  ]);

  return {
    statistics,
    loading,
    error,
    refetch
  };
}; 