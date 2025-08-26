"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { TaskStatistics } from '../types/TaskTypes';
import { TaskFilters } from './useTaskFilters';
import { useInvestmentTasks } from '@/common/data/investment';

interface UseTaskStatisticsProps extends Pick<TaskFilters, 'assignedEmployeeIds' | 'statusRefs' | 'priorityRefs' | 'taskTypes' | 'search' | 'createdAfter' | 'createdBefore'> {
  accessToken: string;
}

interface UseTaskStatisticsReturn {
  statistics: TaskStatistics;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export const useTaskStatistics = (props: UseTaskStatisticsProps): UseTaskStatisticsReturn => {
  const { accessToken, assignedEmployeeIds, statusRefs, priorityRefs, taskTypes } = props;

  const [statistics, setStatistics] = useState<TaskStatistics>({
    totalTasks: { value: 0 },
    inProgress: { value: 0 },
    completed: { value: 0 },
    overdue: { value: 0 }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const lastFetchTime = useRef(0);

  const { fetchInvestmentTasks } = useInvestmentTasks({ accessToken } as any);

  const fetchStats = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const baseVars: any = {};
      if (assignedEmployeeIds?.length) baseVars.assignedEmployeeIds = assignedEmployeeIds;
      if (statusRefs?.length) baseVars.taskStatusIds = statusRefs.map(r => r.split(':').pop()).filter(Boolean);
      if (priorityRefs?.length) baseVars.taskPriorityIds = priorityRefs.map(r => r.split(':').pop()).filter(Boolean);
      if (taskTypes?.length) baseVars.taskTypeIds = taskTypes.map(r => r.split(':').pop()).filter(Boolean);

      // Current window ~ last 30 days
      const now = new Date();
      const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const current = await fetchInvestmentTasks({ ...baseVars, dueDateFrom: from.toISOString(), dueDateTo: now.toISOString(), limit: 100, offset: 0 });

      // Previous window
      const prevTo = from;
      const prevFrom = new Date(prevTo.getTime() - 30 * 24 * 60 * 60 * 1000);
      const previous = await fetchInvestmentTasks({ ...baseVars, dueDateFrom: prevFrom.toISOString(), dueDateTo: prevTo.toISOString(), limit: 100, offset: 0 });

      // All with filters (not time bound)
      const all = await fetchInvestmentTasks({ ...baseVars, limit: 100, offset: 0 });

      const classify = (items: any[]) => {
        let total = 0, inProgress = 0, completed = 0, overdue = 0;
        for (const it of items) {
          total++;
          const status = (it.taskStatusLabel || '').toLowerCase();
          if (status.includes('completed') || status.includes('done')) completed++;
          else if (status.includes('overdue')) overdue++;
          else inProgress++;
        }
        return { total, inProgress, completed, overdue };
      };

      const curr = classify((current as any).tasks || []);
      const prev = classify((previous as any).tasks || []);
      const allStats = classify((all as any).tasks || []);

      const calcGrowth = (c: number, p: number) => {
        if (p === 0) return { growth: c > 0 ? 100 : 0, growthDirection: c > 0 ? 'up' as const : 'stable' as const };
        const g = ((c - p) / p) * 100;
        return { growth: g, growthDirection: g > 2 ? 'up' as const : g < -2 ? 'down' as const : 'stable' as const };
      };

      setStatistics({
        totalTasks: { value: allStats.total, previousValue: prev.total, ...calcGrowth(curr.total, prev.total) },
        inProgress: { value: allStats.inProgress, previousValue: prev.inProgress, ...calcGrowth(curr.inProgress, prev.inProgress) },
        completed: { value: allStats.completed, previousValue: prev.completed, ...calcGrowth(curr.completed, prev.completed) },
        overdue: { value: allStats.overdue, previousValue: prev.overdue, ...calcGrowth(curr.overdue, prev.overdue) },
      });
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Failed to load task statistics');
      setError(e);
      console.error('Error loading IRM task statistics:', e);
    } finally {
      setLoading(false);
    }
  }, [accessToken, assignedEmployeeIds, statusRefs, priorityRefs, taskTypes, fetchInvestmentTasks]);

  const refetch = useCallback(() => {
    const now = Date.now();
    if (now - lastFetchTime.current < 3000) return;
    lastFetchTime.current = now;
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (accessToken) fetchStats();
  }, [accessToken, fetchStats]);

  return { statistics, loading, error, refetch };
};


