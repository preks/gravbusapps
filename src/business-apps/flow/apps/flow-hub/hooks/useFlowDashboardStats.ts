import { useState, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getMockHubStats } from '../queries/hubStats';

export interface FlowDashboardStats {
  // Header KPIs
  activeTasks: number;
  activeFlows: number;
  completedTasksMonth: number;
  
  // Manager/Admin KPIs
  teamActiveTasks: number;
  teamPendingApprovals: number;
  systemActiveWorkflows: number;
  
  // Card KPIs
  totalCompletedTasks: number;
  totalInitiatedFlows: number;
  overdueTasks: number;
  upcomingTasks: number;
  tasksCompletedToday: number;
  avgCompletionTime: number; // in hours
}

export interface FlowDashboardStatsView {
  stats: FlowDashboardStats;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useFlowDashboardStats = (context: BusinessAppContextProps): FlowDashboardStatsView => {
  const [stats, setStats] = useState<FlowDashboardStats>({
    // Header KPIs
    activeTasks: 0,
    activeFlows: 0,
    completedTasksMonth: 0,
    
    // Manager/Admin KPIs
    teamActiveTasks: 0,
    teamPendingApprovals: 0,
    systemActiveWorkflows: 0,
    
    // Card KPIs
    totalCompletedTasks: 0,
    totalInitiatedFlows: 0,
    overdueTasks: 0,
    upcomingTasks: 0,
    tasksCompletedToday: 0,
    avgCompletionTime: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    const employeeId = context?.userInfo?.employeeDetails?.employeeId;
    
    if (!employeeId) {
      setError('Employee ID not found. Cannot fetch dashboard statistics.');
      setIsLoading(false);
      return;
    }

    if (!context.accessToken) {
      setError('Access token not found. Cannot fetch dashboard statistics.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));

      // Get mock data from queries
      const mockStats: FlowDashboardStats = getMockHubStats();

      setStats(mockStats);
    } catch (err) {
      console.error('Error fetching hub stats:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (context.accessToken && context.userInfo?.employeeDetails?.employeeId) {
      fetchStats();
    }
  }, [context.accessToken, context.userInfo?.employeeDetails?.employeeId]);

  const refetch = () => {
    fetchStats();
  };

  return {
    stats,
    isLoading,
    error,
    refetch,
  };
};
