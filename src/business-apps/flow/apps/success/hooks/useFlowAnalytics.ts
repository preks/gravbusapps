import { useState, useEffect, useCallback } from 'react';
import { env } from '@/common/env/EnvUtils';

interface FlowAnalyticsFilters {
  timeframe?: 'last24h' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'custom';
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  templateId?: string;
  userId?: string;
  includeBusinessMetrics?: boolean;
  includeOperationalMetrics?: boolean;
  accessToken: string;
}

interface BusinessKpis {
  totalWorkflows: number;
  completionRate: number;
  avgCycleTime: number;
  slaAdherence: number;
}

interface DepartmentPerformance {
  departmentId: string;
  departmentName: string;
  workflowCount: number;
  completionRate: number;
  avgCycleTime: number;
  slaAdherence: number;
  efficiency: number;
}

interface FlowEffectiveness {
  flowId: string;
  flowName: string;
  usageCount: number;
  successRate: number;
  avgCompletionTime: number;
}

interface TrendAnalysis {
  period: string;
  workflowsStarted: number;
  workflowsCompleted: number;
  avgCycleTime: number;
  completionRate: number;
}

interface UserMetrics {
  activeUsers: number;
  totalUsers: number;
  avgTasksPerUser: number;
  avgResponseTime: number;
  userEngagement: number;
}

interface SystemHealth {
  uptime: number;
  throughput: number;
  errorRate: number;
  avgResponseTime: number;
  memoryUsage: number;
  cpuUsage: number;
}

interface FlowAnalyticsData {
  businessKpis?: BusinessKpis;
  departmentPerformance?: DepartmentPerformance[];
  flowEffectiveness?: FlowEffectiveness[];
  trendAnalysis?: TrendAnalysis[];
  userMetrics?: UserMetrics;
  systemHealth?: SystemHealth;
  [key: string]: any;
}

interface UseFlowAnalyticsResult {
  data: FlowAnalyticsData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export const useFlowAnalytics = (filters: FlowAnalyticsFilters): UseFlowAnalyticsResult => {
  const [data, setData] = useState<FlowAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const API_BASE = (env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || 'https://newwork-dev.newwork.com/flow-engine') + '/api';

  const fetchAnalytics = useCallback(async () => {
    if (!filters.accessToken) {
      setError(new Error('Access token is required'));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      
      // Add all filters as query parameters
      if (filters.timeframe) queryParams.append('timeframe', filters.timeframe);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.departmentId) queryParams.append('departmentId', filters.departmentId);
      if (filters.templateId) queryParams.append('templateId', filters.templateId);
      if (filters.userId) queryParams.append('userId', filters.userId);
      if (filters.includeBusinessMetrics !== undefined) {
        queryParams.append('includeBusinessMetrics', filters.includeBusinessMetrics.toString());
      }
      if (filters.includeOperationalMetrics !== undefined) {
        queryParams.append('includeOperationalMetrics', filters.includeOperationalMetrics.toString());
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${filters.accessToken}`
      };

      const response = await fetch(
        `${API_BASE}/analytics/flows?${queryParams.toString()}`,
        { headers }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch analytics`);
      }

      const result = await response.json();
      
      if (result.status === 'success' && result.data) {
        setData(result.data);
        console.log('Flow analytics loaded successfully', {
          timeframe: filters.timeframe,
          dataKeys: Object.keys(result.data)
        });
      } else {
        throw new Error(result.message || 'Invalid response format');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics';
      setError(new Error(errorMessage));
      console.error('Error fetching flow analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [
    API_BASE,
    filters.accessToken,
    filters.timeframe,
    filters.startDate,
    filters.endDate,
    filters.departmentId,
    filters.templateId,
    filters.userId,
    filters.includeBusinessMetrics,
    filters.includeOperationalMetrics
  ]);

  // Fetch data when filters change
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchAnalytics
  };
};

// Additional specialized hooks for specific analytics endpoints

export const useTaskAnalytics = (filters: {
  timeframe?: 'last24h' | 'wtd' | 'mtd' | 'ytd' | 'custom';
  startDate?: string;
  endDate?: string;
  userId?: string;
  taskType?: string;
  status?: string;
  includeApprovalMetrics?: boolean;
  accessToken: string;
}) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const API_BASE = (env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || 'https://newwork-dev.newwork.com/flow-engine') + '/api';

  const fetchTaskAnalytics = useCallback(async () => {
    if (!filters.accessToken) {
      setError(new Error('Access token is required'));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      
      if (filters.timeframe) queryParams.append('timeframe', filters.timeframe);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.userId) queryParams.append('userId', filters.userId);
      if (filters.taskType) queryParams.append('taskType', filters.taskType);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.includeApprovalMetrics !== undefined) {
        queryParams.append('includeApprovalMetrics', filters.includeApprovalMetrics.toString());
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${filters.accessToken}`
      };

      const response = await fetch(
        `${API_BASE}/analytics/tasks?${queryParams.toString()}`,
        { headers }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch task analytics`);
      }

      const result = await response.json();
      
      if (result.status === 'success' && result.data) {
        setData(result.data);
      } else {
        throw new Error(result.message || 'Invalid response format');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch task analytics';
      setError(new Error(errorMessage));
      console.error('Error fetching task analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [
    API_BASE,
    filters.accessToken,
    filters.timeframe,
    filters.startDate,
    filters.endDate,
    filters.userId,
    filters.taskType,
    filters.status,
    filters.includeApprovalMetrics
  ]);

  useEffect(() => {
    fetchTaskAnalytics();
  }, [fetchTaskAnalytics]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchTaskAnalytics
  };
};

export const useSystemAnalytics = (filters: {
  timeframe?: 'last24h' | 'wtd' | 'mtd' | 'ytd' | 'custom';
  startDate?: string;
  endDate?: string;
  includeResourceMetrics?: boolean;
  includeSecurityMetrics?: boolean;
  accessToken: string;
}) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const API_BASE = (env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || 'https://newwork-dev.newwork.com/flow-engine') + '/api';

  const fetchSystemAnalytics = useCallback(async () => {
    if (!filters.accessToken) {
      setError(new Error('Access token is required'));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      
      if (filters.timeframe) queryParams.append('timeframe', filters.timeframe);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.includeResourceMetrics !== undefined) {
        queryParams.append('includeResourceMetrics', filters.includeResourceMetrics.toString());
      }
      if (filters.includeSecurityMetrics !== undefined) {
        queryParams.append('includeSecurityMetrics', filters.includeSecurityMetrics.toString());
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${filters.accessToken}`
      };

      const response = await fetch(
        `${API_BASE}/analytics/system?${queryParams.toString()}`,
        { headers }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch system analytics`);
      }

      const result = await response.json();
      
      if (result.status === 'success' && result.data) {
        setData(result.data);
      } else {
        throw new Error(result.message || 'Invalid response format');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch system analytics';
      setError(new Error(errorMessage));
      console.error('Error fetching system analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [
    API_BASE,
    filters.accessToken,
    filters.timeframe,
    filters.startDate,
    filters.endDate,
    filters.includeResourceMetrics,
    filters.includeSecurityMetrics
  ]);

  useEffect(() => {
    fetchSystemAnalytics();
  }, [fetchSystemAnalytics]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchSystemAnalytics
  };
};

// Trend Comparison Analytics Hook
export interface TrendComparisonData {
  current: {
    workflowsStarted: number;
    workflowsCompleted: number;
    completionRate: number;
    avgCycleTime: number;
    activeUsers: number;
    avgTasksPerUser: number;
  };
  previous: {
    workflowsStarted: number;
    workflowsCompleted: number;
    completionRate: number;
    avgCycleTime: number;
    activeUsers: number;
    avgTasksPerUser: number;
  };
  trends: {
    workflowsStarted: { change: number; percentage: number; direction: 'up' | 'down' | 'stable' };
    workflowsCompleted: { change: number; percentage: number; direction: 'up' | 'down' | 'stable' };
    completionRate: { change: number; percentage: number; direction: 'up' | 'down' | 'stable' };
    avgCycleTime: { change: number; percentage: number; direction: 'up' | 'down' | 'stable' };
    activeUsers: { change: number; percentage: number; direction: 'up' | 'down' | 'stable' };
    avgTasksPerUser: { change: number; percentage: number; direction: 'up' | 'down' | 'stable' };
  };
}

export interface UseTrendComparisonResult {
  data: TrendComparisonData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export const useTrendComparison = (filters: {
  timeframe?: string;
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  templateId?: string;
  userId?: string;
  accessToken: string;
}): UseTrendComparisonResult => {
  const [data, setData] = useState<TrendComparisonData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const API_BASE = (env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || 'https://newwork-dev.newwork.com/flow-engine') + '/api';

  const fetchData = useCallback(async () => {
    if (!filters.accessToken) {
      setError(new Error('Access token is required'));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.timeframe) params.append('timeframe', filters.timeframe);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.departmentId) params.append('departmentId', filters.departmentId);
      if (filters.templateId) params.append('templateId', filters.templateId);
      if (filters.userId) params.append('userId', filters.userId);

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${filters.accessToken}`
      };

      const response = await fetch(
        `${API_BASE}/analytics/trends?${params.toString()}`,
        { headers }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch trend comparison`);
      }

      const result = await response.json();
      console.log('Trend comparison result:', result);

      if (result.status === 'success' && result.data) {
        setData(result.data);
      } else {
        throw new Error(result.message || 'Invalid response format');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch trend comparison';
      setError(new Error(errorMessage));
      console.error('Error fetching trend comparison:', err);
    } finally {
      setIsLoading(false);
    }
  }, [
    API_BASE,
    filters.accessToken,
    filters.timeframe,
    filters.startDate,
    filters.endDate,
    filters.departmentId,
    filters.templateId,
    filters.userId
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData
  };
};

/**
 * Hook for flow management analytics - focused on actionable flow insights
 */
export const useFlowManagementAnalytics = ({
  timeframe = 'mtd',
  accessToken,
  departmentId,
  templateId,
  userId
}: {
  timeframe?: 'wtd' | 'mtd' | 'qtd' | 'ytd';
  accessToken: string;
  departmentId?: string;
  templateId?: string;
  userId?: string;
}) => {
  const [data, setData] = useState<FlowManagementAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        timeframe,
        ...(departmentId && { departmentId }),
        ...(templateId && { templateId }),
        ...(userId && { userId })
      });

      const API_BASE = (env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || 'https://newwork-dev.newwork.com/flow-engine') + '/api';
      const response = await fetch(`${API_BASE}/analytics/flow-management?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Analytics request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.status === 'success') {
        setData(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch flow management analytics');
      }
    } catch (err) {
      console.error('Error fetching flow management analytics:', err);
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
    } finally {
      setIsLoading(false);
    }
  }, [timeframe, accessToken, departmentId, templateId, userId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchAnalytics
  };
};

interface FlowManagementAnalytics {
  statusMetrics: {
    total_workflows: number;
    completed_workflows: number;
    pending_workflows: number;
    total_tasks: number;
    completed_tasks: number;
    pending_tasks: number;
    overdue_tasks: number;
    scheduled_future_tasks: number;
    workflow_completion_rate: number;
    task_completion_rate: number;
    overdue_percentage: number;
  };
  slaKillers: Array<{
    flow_name: string;
    step_name: string;
    total_tasks: number;
    sla_violations: number;
    violation_rate: number;
    avg_overdue_hours: number;
  }>;
  longestCycleFlows: Array<{
    flow_name: string;
    workflow_count: number;
    avg_cycle_hours: number;
    max_cycle_hours: number;
  }>;
  longestCycleTasks: Array<{
    task_name: string;
    flow_name: string;
    task_count: number;
    avg_cycle_hours: number;
    max_cycle_hours: number;
  }>;
  timeSeries: Array<{
    date: string;
    workflows_started: number;
    workflows_completed: number;
    tasks_started: number;
    tasks_completed: number;
    daily_workflow_completion_rate: number;
    daily_task_completion_rate: number;
  }>;
} 