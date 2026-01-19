/**
 * TypeScript interfaces for Manager Analytics data structures
 * Based on Custom Flow Engine Analytics API responses
 */

// =================================================================================
// FLOW ANALYTICS TYPES
// =================================================================================

export interface FlowAnalyticsParams {
  timeframe?: 'last24h' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'custom';
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  templateId?: string;
  userId?: string;
  includeBusinessMetrics?: boolean;
  includeOperationalMetrics?: boolean;
  correlationEntity?: string;
  correlationEntityId?: string;
}

export interface FlowAnalyticsResponse {
  status: string;
  data: {
    businessMetrics: {
      totalFlows: number;
      completedFlows: number;
      avgCompletionTime: number;
      successRate: number;
    };
    operationalMetrics: {
      activeFlows: number;
      bottlenecks: string[];
    };
  };
  timeRange: {
    start: string;
    end: string;
  };
}

// =================================================================================
// FLOW MANAGEMENT ANALYTICS TYPES
// =================================================================================

export interface FlowManagementAnalyticsParams {
  timeframe?: 'last24h' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'custom';
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  templateId?: string;
  userId?: string;
}

export interface FlowManagementAnalyticsResponse {
  status: string;
  data: {
    flowEfficiency: number;
    bottlenecks: Array<{
      stepName: string;
      avgDelay: number;
      impactLevel: 'low' | 'medium' | 'high';
    }>;
    recommendations: Array<{
      type: string;
      description: string;
      priority: 'low' | 'medium' | 'high';
    }>;
  };
}

// =================================================================================
// TASK ANALYTICS TYPES
// =================================================================================

export interface TaskAnalyticsParams {
  timeframe?: 'last24h' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'custom';
  startDate?: string;
  endDate?: string;
  userId?: string;
  taskType?: string;
  status?: string;
  includeApprovalMetrics?: boolean;
}

export interface TaskAnalyticsResponse {
  status: string;
  data: {
    totalTasks: number;
    completedTasks: number;
    avgCompletionTime: number;
    tasksByStatus: {
      completed: number;
      in_progress: number;
      pending: number;
    };
    performanceMetrics: {
      efficiency: number;
      onTimeCompletion: number;
    };
  };
}

// =================================================================================
// TASK PERFORMANCE ANALYTICS TYPES
// =================================================================================

export interface TaskPerformanceAnalyticsParams {
  timeframe?: 'last24h' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'custom';
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  templateId?: string;
  userId?: string;
  stepType?: string;
  workflowType?: string;
}

export interface TaskPerformanceAnalyticsResponse {
  status: string;
  data: {
    performanceOverview: {
      totalTasks: number;
      avgCompletionTime: number;
      efficiencyScore: number;
    };
    performanceByStep: Array<{
      stepType: string;
      avgDuration: number;
      completionRate: number;
      bottleneckRisk: 'low' | 'medium' | 'high';
    }>;
    userPerformance: Array<{
      userId: string;
      tasksCompleted: number;
      avgCompletionTime: number;
      efficiencyRating: 'excellent' | 'good' | 'average' | 'poor';
    }>;
  };
}

// =================================================================================
// TEMPLATE PERFORMANCE ANALYTICS TYPES
// =================================================================================

export interface TemplatePerformanceAnalyticsParams {
  timeframe?: 'last24h' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'custom';
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'totalWorkflows' | 'completionRate' | 'avgDuration' | 'successRate' | 'activeWorkflows';
  sortOrder?: 'asc' | 'desc';
  templateId?: string;
  minUsage?: number;
}

export interface TemplatePerformanceAnalyticsResponse {
  status: string;
  data: {
    templates: Array<{
      templateId: string;
      templateName: string;
      totalWorkflows: number;
      completedWorkflows: number;
      activeWorkflows: number;
      completionRate: number;
      avgDurationHours: number;
      successRate: number;
      failureRate: number;
      bottleneckSteps: string[];
      utilizationTrend: string;
    }>;
    totalTemplates: number;
    averagePerformance: {
      completionRate: number;
      avgDurationHours: number;
      successRate: number;
    };
  };
  timeRange: {
    start: string;
    end: string;
  };
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

// =================================================================================
// TREND ANALYTICS TYPES
// =================================================================================

export interface TrendAnalyticsParams {
  timeframe?: 'last24h' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'custom';
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  templateId?: string;
  userId?: string;
}

export interface TrendAnalyticsResponse {
  status: string;
  data: {
    currentPeriod: {
      totalFlows: number;
      completionRate: number;
      avgDuration: number;
    };
    previousPeriod: {
      totalFlows: number;
      completionRate: number;
      avgDuration: number;
    };
    trends: {
      flowsChange: {
        value: number;
        percentage: number;
        direction: 'up' | 'down' | 'stable';
      };
      completionRateChange: {
        value: number;
        percentage: number;
        direction: 'up' | 'down' | 'stable';
      };
    };
  };
}

// =================================================================================
// USAGE ANALYTICS TYPES
// =================================================================================

export interface UsageAnalyticsParams {
  timeframe?: 'last24h' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'custom';
  startDate?: string;
  endDate?: string;
  groupBy?: 'department' | 'user' | 'template';
  includeTemplateMetrics?: boolean;
  includeUserMetrics?: boolean;
}

export interface UsageAnalyticsResponse {
  status: string;
  data: {
    totalUsage: {
      sessions: number;
      activeUsers: number;
      flowsCreated: number;
    };
    usageByGroup: Array<{
      groupName: string;
      usage: number;
      growth: number;
    }>;
    adoptionMetrics: {
      newUsers: number;
      featureAdoption: Record<string, any>;
    };
  };
}

// =================================================================================
// SYSTEM ANALYTICS TYPES
// =================================================================================

export interface SystemAnalyticsParams {
  timeframe?: 'last24h' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'custom';
  startDate?: string;
  endDate?: string;
  includeResourceMetrics?: boolean;
  includeSecurityMetrics?: boolean;
}

export interface SystemAnalyticsResponse {
  status: string;
  data: {
    systemHealth: {
      overallStatus: string;
      uptime: number;
    };
    resourceMetrics: {
      cpuUsage: number;
      memoryUsage: number;
      diskUsage: number;
    };
    performanceMetrics: {
      avgResponseTime: number;
      throughput: number;
    };
  };
}

// =================================================================================
// PERFORMANCE ANALYTICS TYPES
// =================================================================================

export interface PerformanceAnalyticsParams {
  timeframe?: 'last24h' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'custom';
  startDate?: string;
  endDate?: string;
  compareWith?: string;
  includeTrends?: boolean;
  includeBenchmarks?: boolean;
}

export interface PerformanceAnalyticsResponse {
  status: string;
  data: {
    trends: {
      responseTime: {
        current: number;
        trend: string;
        changePercent: number;
      };
    };
    benchmarks: {
      industry: Record<string, any>;
      internal: Record<string, any>;
    };
  };
}

// =================================================================================
// AUDIT LOGS TYPES
// =================================================================================

export interface AuditLogsParams {
  userId?: string;
  department?: string;
  templateId?: string;
  flowId?: string;
  taskId?: string;
  action?: 'TASK' | 'APPROVAL' | 'REJECTION' | 'ASSIGNMENT' | 'COMPLETION';
  status?: 'COMPLETED' | 'REJECTED' | 'IN_PROGRESS' | 'PENDING';
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogsResponse {
  status: string;
  data: Array<{
    id: string;
    timestamp: string;
    userId: string;
    userName: string;
    action: string;
    entityType: string;
    entityId: string;
    flowId: string;
    templateId: string;
    details: Record<string, any>;
    status: string;
  }>;
  pagination: {
    total: number;
    offset: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface AuditSummaryParams {
  userId?: string;
  department?: string;
  templateId?: string;
  flowId?: string;
  taskId?: string;
  action?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface AuditSummaryResponse {
  status: string;
  summary: {
    totalEntries: number;
    entriesByAction: Record<string, number>;
    entriesByStatus: Record<string, number>;
    timeRange: {
      earliest: string;
      latest: string;
    };
    topUsers: Array<{
      userId: string;
      userName: string;
      actionCount: number;
    }>;
    topTemplates: Array<{
      templateId: string;
      templateName: string;
      usageCount: number;
    }>;
  };
}

// =================================================================================
// COMMON TYPES
// =================================================================================

export type TimeframeOption = 'last24h' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'custom';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface AnalyticsError {
  status: 'error';
  message: string;
}

// =================================================================================
// MANAGER DASHBOARD COMPOSITE TYPES
// =================================================================================

export interface ManagerDashboardData {
  flowAnalytics: FlowAnalyticsResponse;
  taskPerformance: TaskPerformanceAnalyticsResponse;
  flowManagement: FlowManagementAnalyticsResponse;
  templatePerformance: TemplatePerformanceAnalyticsResponse;
  trends: TrendAnalyticsResponse;
  usage: UsageAnalyticsResponse;
}

export interface EmployeePerformanceMetrics {
  userId: string;
  userName?: string;
  tasksCompleted: number;
  avgCompletionTime: number;
  efficiencyRating: 'excellent' | 'good' | 'average' | 'poor';
  overdueTaskCount: number;
  currentWorkload: number;
  performanceScore: number;
}

export interface DeskMetrics {
  deskId: string;
  deskName: string;
  totalTickets: number;
  completedTickets: number;
  averageResolutionTime: number;
  slaComplianceRate: number;
  currentQueueDepth: number;
  peakHours: Array<{
    hour: number;
    count: number;
  }>;
}

export interface OperationalInsights {
  bottlenecks: Array<{
    stepName: string;
    avgDelay: number;
    impactLevel: 'low' | 'medium' | 'high';
  }>;
  recommendations: Array<{
    type: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  systemHealth: {
    overallStatus: string;
    uptime: number;
  };
}
