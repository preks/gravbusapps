# Analytics API Response Documentation

This document contains the actual API response structures from the Custom Flow Engine analytics endpoints for reference and implementation.

## Flow Analytics Endpoint
**URL:** `https://newwork-dev.newwork.com/flow-engine/api/analytics/flows?timeframe=mtd`

**Response Structure:**
```json
{
  "status": "success",
  "data": {
    "businessKpis": {
      "totalWorkflows": 8,
      "completionRate": 0,
      "avgCycleTime": 0,
      "slaAdherence": 100
    },
    "departmentPerformance": [
      {
        "departmentId": "Unknown",
        "departmentName": "Unknown Department",
        "workflowCount": 8,
        "completionRate": 0,
        "avgCycleTime": 0,
        "slaAdherence": 0,
        "efficiency": 0
      }
    ],
    "flowEffectiveness": [
      {
        "flowId": "1c481890-5f08-4b81-acef-732b97332f7d",
        "flowName": "Hardware replacement",
        "usageCount": 3,
        "successRate": 0,
        "avgCompletionTime": 0
      }
    ],
    "trendAnalysis": [],
    "userMetrics": {
      "activeUsers": 3,
      "totalUsers": 3,
      "avgTasksPerUser": 3.9,
      "avgResponseTime": 0.04,
      "userEngagement": 85.71
    },
    "systemHealth": {
      "throughput": 14,
      "errorRate": 0,
      "avgResponseTime": -0.26
    },
    "performanceMetrics": {
      "totalRequests": 14,
      "successfulRequests": 6,
      "failedRequests": 0,
      "avgLatency": -0.26,
      "peakThroughput": 18,
      "bottlenecks": [
        {
          "component": "Database Connections",
          "severity": "Medium",
          "description": "Connection pool utilization at 78%",
          "impact": 15
        }
      ]
    },
    "resourceUtilization": {
      "dbConnections": 78,
      "maxDbConnections": 100,
      "memoryUsage": 2.4,
      "diskUsage": 45.6,
      "networkThroughput": 1.2
    },
    "errorAnalysis": [],
    "securityInsights": {
      "authenticationAttempts": 1256,
      "failedLogins": 23,
      "suspiciousActivity": 2,
      "dataAccess": 456
    },
    "optimizationRecommendations": [
      {
        "category": "Performance",
        "recommendation": "Implement connection pooling optimization",
        "impact": "High",
        "effort": "Medium",
        "priority": 1
      }
    ]
  },
  "metadata": {
    "timeframe": "mtd",
    "generatedAt": "2025-10-02T07:45:38.428Z",
    "filters": {},
    "includeBusinessMetrics": true,
    "includeOperationalMetrics": true
  }
}
```

## Usage Analytics Endpoint
**URL:** `https://newwork-dev.newwork.com/flow-engine/api/analytics/usage?timeframe=mtd&groupBy=department`

**Response Structure:**
```json
{
  "status": "success",
  "data": {
    "templateUsage": [
      {
        "flowId": "1c481890-5f08-4b81-acef-732b97332f7d",
        "flowName": "Hardware replacement",
        "usageCount": 3,
        "successRate": 0,
        "avgCompletionTime": 0
      }
    ],
    "userAdoption": {
      "activeUsers": 3,
      "totalUsers": 3,
      "avgTasksPerUser": 3.9,
      "avgResponseTime": 0.04,
      "userEngagement": 85.71
    },
    "departmentUsage": [
      {
        "departmentId": "Unknown",
        "departmentName": "Unknown Department",
        "workflowCount": 8,
        "completionRate": 0,
        "avgCycleTime": 0,
        "slaAdherence": 0,
        "efficiency": 0
      }
    ],
    "adoptionTrends": []
  }
}
```

## Trends Analytics Endpoint
**URL:** `https://newwork-dev.newwork.com/flow-engine/api/analytics/trends?timeframe=mtd`

**Response Structure:**
```json
{
  "status": "success",
  "data": {
    "current": {
      "workflowsStarted": 8,
      "workflowsCompleted": 5,
      "completionRate": 62.5,
      "avgCycleTime": 0,
      "activeUsers": 2,
      "avgTasksPerUser": 7
    },
    "previous": {
      "workflowsStarted": 0,
      "workflowsCompleted": 0,
      "completionRate": 0,
      "avgCycleTime": 0,
      "activeUsers": 0,
      "avgTasksPerUser": 0
    },
    "trends": {
      "workflowsStarted": {
        "change": 0,
        "percentage": 0,
        "direction": "stable",
        "note": "No previous data for comparison"
      }
    }
  }
}
```

## Template Performance Endpoint
**URL:** `https://newwork-dev.newwork.com/flow-engine/api/analytics/template-performance?timeframe=mtd&limit=10`

**Response Structure:**
```json
{
  "status": "success",
  "data": {
    "templates": [
      {
        "templateId": "Hardware replacement",
        "templateName": "Hardware replacement",
        "totalWorkflows": 2,
        "completedWorkflows": 0,
        "completionRate": 0,
        "avgCycleTime": 10.07,
        "totalTasks": 5,
        "completedTasks": 3
      }
    ],
    "summary": {
      "avgCompletionRate": 0,
      "totalTemplates": 5
    }
  }
}
```

## Task Performance Endpoint
**URL:** `https://newwork-dev.newwork.com/flow-engine/api/analytics/task-performance?timeframe=mtd`

**Response Structure:**
```json
{
  "status": "success",
  "data": {
    "pendingTasks": 277,
    "overdueTasks": 277,
    "taskTypePerformance": [
      {
        "taskType": "TASK",
        "totalTasks": 12,
        "completedTasks": 6,
        "completionRate": 50,
        "avgResponseTime": 0.04
      }
    ],
    "userProductivity": [
      {
        "userId": "e410b3c7-1e71-40f1-9894-248150c6e8e8",
        "userName": "e410b3c7-1e71-40f1-9894-248150c6e8e8",
        "tasksCompleted": 5,
        "avgCompletionTime": 0,
        "productivityScore": 102710.36
      }
    ]
  }
}
```

## Flow Management Endpoint
**URL:** `https://newwork-dev.newwork.com/flow-engine/api/analytics/flow-management?timeframe=mtd`

**Response Structure:**
```json
{
  "status": "success",
  "data": {
    "statusMetrics": {
      "total_workflows": 8,
      "completed_workflows": 0,
      "pending_workflows": 8,
      "total_tasks": 16,
      "completed_tasks": 8,
      "pending_tasks": 8,
      "overdue_tasks": 8,
      "workflow_completion_rate": 0,
      "task_completion_rate": 50,
      "overdue_percentage": 100
    },
    "slaKillers": [],
    "longestCycleFlows": [],
    "longestCycleTasks": []
  }
}
```

## Key Differences from Expected Structure

1. **Flow Analytics**: Uses `businessKpis` instead of `businessMetrics`
2. **Task Performance**: Direct properties instead of nested `performanceOverview`
3. **Trends**: Uses `current`/`previous` instead of `periodComparison`
4. **All endpoints**: Data is directly under `data` property, not `data.data`

## Data Mapping Required

- `data.businessMetrics.totalFlows` → `data.businessKpis.totalWorkflows`
- `data.businessMetrics.successRate` → `data.businessKpis.completionRate`
- `data.businessMetrics.avgCompletionTime` → `data.businessKpis.avgCycleTime`
- `data.operationalMetrics.activeFlows` → `data.userMetrics.activeUsers`
- `data.performanceOverview.totalTasks` → `data.pendingTasks + data.overdueTasks` (task-performance)
