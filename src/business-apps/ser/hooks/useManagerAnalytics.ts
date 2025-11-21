import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { createConductorWorkflowEngine } from '../services/ConductorWorkflowEngineAdapter';
import {
  FlowAnalyticsParams,
  FlowAnalyticsResponse,
  FlowManagementAnalyticsParams,
  FlowManagementAnalyticsResponse,
  TaskPerformanceAnalyticsParams,
  TaskPerformanceAnalyticsResponse,
  TemplatePerformanceAnalyticsParams,
  TemplatePerformanceAnalyticsResponse,
  TrendAnalyticsParams,
  TrendAnalyticsResponse,
  UsageAnalyticsParams,
  UsageAnalyticsResponse,
  AuditLogsParams,
  AuditLogsResponse,
} from '../types/managerAnalytics';

// =================================================================================
// FLOW ANALYTICS HOOK
// =================================================================================

export interface UseFlowAnalyticsProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  params?: FlowAnalyticsParams;
  enabled?: boolean;
}

export interface UseFlowAnalyticsReturn {
  data: FlowAnalyticsResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useFlowAnalytics = ({
  accessToken,
  userInfo,
  params = { timeframe: 'mtd' },
  enabled = true,
}: UseFlowAnalyticsProps): UseFlowAnalyticsReturn => {
  const [data, setData] = useState<FlowAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (!enabled || !accessToken || !userInfo || isLoadingRef.current) return;

    isLoadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const workflowEngine = createConductorWorkflowEngine({ accessToken, userInfo });
      const result = await (workflowEngine as any).getFlowAnalytics(params);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch flow analytics');
      console.error('[useFlowAnalytics] Error:', err);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [accessToken, userInfo, enabled, params?.timeframe, params?.startDate, params?.endDate, params?.departmentId, params?.templateId, params?.userId]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchData();
    }, 100); // Small debounce to prevent rapid calls

    return () => clearTimeout(timeoutId);
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
};

// =================================================================================
// FLOW MANAGEMENT ANALYTICS HOOK
// =================================================================================

export interface UseFlowManagementAnalyticsProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  params?: FlowManagementAnalyticsParams;
  enabled?: boolean;
}

export interface UseFlowManagementAnalyticsReturn {
  data: FlowManagementAnalyticsResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useFlowManagementAnalytics = ({
  accessToken,
  userInfo,
  params = { timeframe: 'mtd' },
  enabled = true,
}: UseFlowManagementAnalyticsProps): UseFlowManagementAnalyticsReturn => {
  const [data, setData] = useState<FlowManagementAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !accessToken || !userInfo) return;

    console.log('[useFlowManagementAnalytics] Fetching data for timeframe:', params.timeframe);
    setIsLoading(true);
    setError(null);

    try {
      const workflowEngine = createConductorWorkflowEngine({ accessToken, userInfo });
      const result = await (workflowEngine as any).getFlowManagementAnalytics(params);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch flow management analytics');
      console.error('[useFlowManagementAnalytics] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, userInfo, enabled, JSON.stringify(params)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
};

// =================================================================================
// TASK PERFORMANCE ANALYTICS HOOK
// =================================================================================

export interface UseTaskPerformanceAnalyticsProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  params?: TaskPerformanceAnalyticsParams;
  enabled?: boolean;
}

export interface UseTaskPerformanceAnalyticsReturn {
  data: TaskPerformanceAnalyticsResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useTaskPerformanceAnalytics = ({
  accessToken,
  userInfo,
  params = { timeframe: 'mtd' },
  enabled = true,
}: UseTaskPerformanceAnalyticsProps): UseTaskPerformanceAnalyticsReturn => {
  const [data, setData] = useState<TaskPerformanceAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !accessToken || !userInfo) return;

    setIsLoading(true);
    setError(null);

    try {
      const workflowEngine = createConductorWorkflowEngine({ accessToken, userInfo });
      const result = await (workflowEngine as any).getTaskPerformanceAnalytics(params);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch task performance analytics');
      console.error('[useTaskPerformanceAnalytics] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, userInfo, enabled, JSON.stringify(params)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
};

// =================================================================================
// TEMPLATE PERFORMANCE ANALYTICS HOOK
// =================================================================================

export interface UseTemplatePerformanceAnalyticsProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  params?: TemplatePerformanceAnalyticsParams;
  enabled?: boolean;
}

export interface UseTemplatePerformanceAnalyticsReturn {
  data: TemplatePerformanceAnalyticsResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useTemplatePerformanceAnalytics = ({
  accessToken,
  userInfo,
  params = { timeframe: 'mtd', limit: 10 },
  enabled = true,
}: UseTemplatePerformanceAnalyticsProps): UseTemplatePerformanceAnalyticsReturn => {
  const [data, setData] = useState<TemplatePerformanceAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !accessToken || !userInfo) return;

    setIsLoading(true);
    setError(null);

    try {
      const workflowEngine = createConductorWorkflowEngine({ accessToken, userInfo });
      const result = await (workflowEngine as any).getTemplatePerformanceAnalytics(params);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch template performance analytics');
      console.error('[useTemplatePerformanceAnalytics] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, userInfo, enabled, JSON.stringify(params)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
};

// =================================================================================
// TREND ANALYTICS HOOK
// =================================================================================

export interface UseTrendAnalyticsProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  params?: TrendAnalyticsParams;
  enabled?: boolean;
}

export interface UseTrendAnalyticsReturn {
  data: TrendAnalyticsResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useTrendAnalytics = ({
  accessToken,
  userInfo,
  params = { timeframe: 'mtd' },
  enabled = true,
}: UseTrendAnalyticsProps): UseTrendAnalyticsReturn => {
  const [data, setData] = useState<TrendAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !accessToken || !userInfo) return;

    setIsLoading(true);
    setError(null);

    try {
      const workflowEngine = createConductorWorkflowEngine({ accessToken, userInfo });
      const result = await (workflowEngine as any).getTrendAnalytics(params);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trend analytics');
      console.error('[useTrendAnalytics] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, userInfo, enabled, JSON.stringify(params)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
};

// =================================================================================
// USAGE ANALYTICS HOOK
// =================================================================================

export interface UseUsageAnalyticsProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  params?: UsageAnalyticsParams;
  enabled?: boolean;
}

export interface UseUsageAnalyticsReturn {
  data: UsageAnalyticsResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useUsageAnalytics = ({
  accessToken,
  userInfo,
  params = { timeframe: 'mtd', groupBy: 'department' },
  enabled = true,
}: UseUsageAnalyticsProps): UseUsageAnalyticsReturn => {
  const [data, setData] = useState<UsageAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !accessToken || !userInfo) return;

    setIsLoading(true);
    setError(null);

    try {
      const workflowEngine = createConductorWorkflowEngine({ accessToken, userInfo });
      const result = await (workflowEngine as any).getUsageAnalytics(params);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch usage analytics');
      console.error('[useUsageAnalytics] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, userInfo, enabled, JSON.stringify(params)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
};

// =================================================================================
// AUDIT LOGS HOOK
// =================================================================================

export interface UseAuditLogsProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  params?: AuditLogsParams;
  enabled?: boolean;
}

export interface UseAuditLogsReturn {
  data: AuditLogsResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useAuditLogs = ({
  accessToken,
  userInfo,
  params = { limit: 50, offset: 0 },
  enabled = true,
}: UseAuditLogsProps): UseAuditLogsReturn => {
  const [data, setData] = useState<AuditLogsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !accessToken || !userInfo) return;

    setIsLoading(true);
    setError(null);

    try {
      const workflowEngine = createConductorWorkflowEngine({ accessToken, userInfo });
      const result = await (workflowEngine as any).getAuditLogs(params);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
      console.error('[useAuditLogs] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, userInfo, enabled, JSON.stringify(params)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
};

// =================================================================================
// COMPOSITE MANAGER DASHBOARD HOOK
// =================================================================================

export interface UseManagerDashboardProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  timeframe?: 'last24h' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'custom';
  startDate?: string;
  endDate?: string;
  enabled?: boolean;
}

export interface UseManagerDashboardReturn {
  flowAnalytics: UseFlowAnalyticsReturn;
  flowManagement: UseFlowManagementAnalyticsReturn;
  taskPerformance: UseTaskPerformanceAnalyticsReturn;
  trends: UseTrendAnalyticsReturn;
  usage: UseUsageAnalyticsReturn;
  isLoading: boolean;
  hasError: boolean;
  refetchAll: () => void;
}

export const useManagerDashboard = ({
  accessToken,
  userInfo,
  timeframe = 'mtd',
  startDate,
  endDate,
  enabled = true,
}: UseManagerDashboardProps): UseManagerDashboardReturn => {
  console.log('[useManagerDashboard] Hook called with timeframe:', timeframe, 'enabled:', enabled);
  
  // Memoize parameters to prevent infinite re-renders
  const baseParams = useMemo(() => ({ 
    timeframe, 
    startDate, 
    endDate 
  }), [timeframe, startDate, endDate]);

  const usageParams = useMemo(() => ({ 
    ...baseParams, 
    groupBy: 'department' as const 
  }), [baseParams]);

  const flowAnalytics = useFlowAnalytics({
    accessToken,
    userInfo,
    params: baseParams,
    enabled,
  });

  const flowManagement = useFlowManagementAnalytics({
    accessToken,
    userInfo,
    params: baseParams,
    enabled,
  });

  const taskPerformance = useTaskPerformanceAnalytics({
    accessToken,
    userInfo,
    params: baseParams,
    enabled,
  });

  const trends = useTrendAnalytics({
    accessToken,
    userInfo,
    params: baseParams,
    enabled,
  });

  const usage = useUsageAnalytics({
    accessToken,
    userInfo,
    params: usageParams,
    enabled,
  });

  const isLoading = 
    flowAnalytics.isLoading ||
    flowManagement.isLoading ||
    taskPerformance.isLoading ||
    trends.isLoading ||
    usage.isLoading;

  const hasError = 
    !!flowAnalytics.error ||
    !!flowManagement.error ||
    !!taskPerformance.error ||
    !!trends.error ||
    !!usage.error;

  const refetchAll = useCallback(() => {
    flowAnalytics.refetch();
    flowManagement.refetch();
    taskPerformance.refetch();
    trends.refetch();
    usage.refetch();
  }, [
    flowAnalytics.refetch,
    flowManagement.refetch,
    taskPerformance.refetch,
    trends.refetch,
    usage.refetch,
  ]);

  return {
    flowAnalytics,
    flowManagement,
    taskPerformance,
    trends,
    usage,
    isLoading,
    hasError,
    refetchAll,
  };
};
