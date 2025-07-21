"use client";

import { useState, useCallback, useEffect } from 'react';
import { TaskStatistics } from '../types/TaskTypes';
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

export const useTaskStatistics = (props: UseTaskStatisticsProps): UseTaskStatisticsReturn => {
  const {
    accessToken
    // NOTE: Intentionally NOT destructuring filter properties
    // because statistics should show totals, not filtered counts
  } = props;

  // State
  const [statistics, setStatistics] = useState<TaskStatistics>({
    totalTasks: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // GraphQL queries
  const { fetchSalesTasks } = useSalesTaskQueries({ accessToken });

  // Build query variables for statistics - NO FILTERS, always get totals
  const buildStatisticsVariables = useCallback(() => {
    const variables: any = {
      limit: 1000, // Get more records to calculate statistics properly
      offset: 0,
      // NO search parameter - we want total counts, not filtered counts
      // NO date filters - we want overall statistics
      orderBy: [{ createdAt: 'DESC' }], // Provide proper orderBy format
    };

    return variables;
  }, []); // No dependencies - this should never change based on filters

  // Calculate statistics from sales tasks
  const calculateStatistics = useCallback((salesTasks: any[]): TaskStatistics => {
    let totalTasks = 0;
    let inProgress = 0;
    let completed = 0;
    let overdue = 0;

    salesTasks.forEach(task => {
      totalTasks++;

      // Determine status from statusRef or dueDate
      if (task.statusRef) {
        const statusValue = task.statusRef.split(':').pop()?.toLowerCase();
        switch (statusValue) {
          case 'completed':
          case 'done':
            completed++;
            break;
          case 'in_progress':
          case 'active':
            inProgress++;
            break;
          case 'overdue':
            overdue++;
            break;
          default:
            // Check if overdue based on due date
            if (task.dueDate && new Date(task.dueDate) < new Date()) {
              overdue++;
            } else {
              inProgress++;
            }
        }
      } else {
        // No statusRef, determine from dueDate or creation date
        if (task.dueDate) {
          if (new Date(task.dueDate) < new Date()) {
            overdue++;
          } else {
            inProgress++;
          }
        } else {
          // Default to in progress for tasks without due dates
          inProgress++;
        }
      }
    });

    return {
      totalTasks,
      inProgress,
      completed,
      overdue
    };
  }, []);

  // Fetch statistics
  const fetchStatistics = useCallback(async () => {
    if (!accessToken) {
      console.warn('No access token provided to useTaskStatistics');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const variables = buildStatisticsVariables();
      const result = await fetchSalesTasks(variables);
      
      const stats = calculateStatistics(result.SalesTask);
      setStatistics(stats);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load task statistics');
      setError(error);
      console.error('Error loading task statistics:', error);
    } finally {
      setLoading(false);
    }
  }, [accessToken, buildStatisticsVariables, fetchSalesTasks, calculateStatistics]);

  // Refetch function
  const refetch = useCallback(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  // Auto-reload when filters change
  useEffect(() => {
    if (accessToken) {
      fetchStatistics();
    }
  }, [
    accessToken
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