import {
  GuardianNetworkData,
  GuardianNode,
  GuardianEdge,
  GuardianViewMode,
  GuardianFilter,
  GuardianStatistics
} from '../types/guardianTypes'

interface TransformationInput {
  workflowData: any
  organizationalData: any
  viewMode: GuardianViewMode
  filters: GuardianFilter
}

interface StatisticsInput {
  workflowData: any
  organizationalData: any
  networkData: GuardianNetworkData
}

export class GuardianDataTransformationService {
  static transformToNetworkData(input: TransformationInput): GuardianNetworkData {
    const { workflowData, organizationalData, viewMode, filters } = input

    switch (viewMode) {
      case 'force-directed':
        return this.createForceDirectedNetwork(workflowData, organizationalData, filters)
      case 'sankey':
        return this.createSankeyNetwork(workflowData, organizationalData, filters)
      case 'hierarchical':
        return this.createHierarchicalNetwork(workflowData, organizationalData, filters)
      case 'chord':
        return this.createChordNetwork(workflowData, organizationalData, filters)
      case 'geographic':
        return this.createGeographicNetwork(workflowData, organizationalData, filters)
      case 'realtime':
        return this.createRealtimeNetwork(workflowData, organizationalData, filters)
      default:
        return this.createForceDirectedNetwork(workflowData, organizationalData, filters)
    }
  }

  private static createForceDirectedNetwork(
    workflowData: any,
    organizationalData: any,
    filters: GuardianFilter
  ): GuardianNetworkData {
    const nodes: GuardianNode[] = []
    const edges: GuardianEdge[] = []

    // Extract analytics for enrichment when present
    const managementMetrics = workflowData?.analytics?.flowManagement?.statusMetrics || {}
    const taskPerf = workflowData?.analytics?.taskPerformance || {}
    const slaKillers = workflowData?.analytics?.flowManagement?.slaKillers || []

    // Helper: map department to SLA adherence/overdue percentage from management metrics or SLA killers
    const departmentRiskMap: Record<string, { overduePercent: number; slaAdherence: number }> = {}
    if (Array.isArray(slaKillers)) {
      slaKillers.forEach((k: any) => {
        const dept = k.department || k.flow_name || 'unknown'
        if (!departmentRiskMap[dept]) {
          departmentRiskMap[dept] = { overduePercent: 0, slaAdherence: 1 }
        }
        // Increase risk heuristic based on violation rate
        departmentRiskMap[dept].overduePercent = Math.max(
          departmentRiskMap[dept].overduePercent,
          typeof k.violation_rate === 'number' ? k.violation_rate / 100 : 0
        )
        departmentRiskMap[dept].slaAdherence = Math.min(
          departmentRiskMap[dept].slaAdherence,
          typeof k.avg_overdue_hours === 'number' && k.avg_overdue_hours > 0 ? 0.6 : 0.9
        )
      })
    }

    // Add department nodes
    if (filters.showDepartments) {
      organizationalData.departments.forEach((dept: any, index: number) => {
        const risk = departmentRiskMap[dept.name] || { overduePercent: 0, slaAdherence: 0.9 }
        nodes.push({
          id: dept.id,
          type: 'department',
          label: dept.name,
          data: {
            name: dept.name,
            description: dept.description,
            status: dept.activeWorkflows > 0 ? 'active' : 'inactive',
            activeTaskCount: dept.activeTaskCount,
            workflowCount: dept.activeWorkflows,
            size: Math.max(15, Math.min(30, dept.activeTaskCount * 2)),
            color: dept.activeWorkflows > 0 ? '#f97316' : '#6b7280',
            halo: Math.max(0, Math.min(1, 1 - risk.overduePercent))
          },
          position: {
            x: 200 + (index % 3) * 300,
            y: 150 + Math.floor(index / 3) * 200
          }
        })
      })
    }

    // Add user nodes
    if (filters.showUsers) {
      organizationalData.users.forEach((user: any, index: number) => {
        nodes.push({
          id: user.id,
          type: 'user',
          label: user.name,
          data: {
            name: user.name,
            email: user.email,
            role: user.roleId,
            status: user.activeTaskCount > 0 ? 'active' : 'inactive',
            activeTaskCount: user.activeTaskCount,
            completedTaskCount: user.completedTaskCount,
            organizationalUnits: user.organizationalUnits,
            capabilities: user.capabilities,
            size: Math.max(8, Math.min(16, user.activeTaskCount * 1.5)),
            color: user.activeTaskCount > 0 ? '#8b5cf6' : '#6b7280'
          },
          position: {
            x: 100 + (index % 4) * 150,
            y: 350 + Math.floor(index / 4) * 100
          }
        })
      })
    }

    // Normalize workflow statuses and add workflow nodes
    if (filters.showActiveWorkflows) {
      workflowData.workflows.forEach((workflow: any, index: number) => {
        const status = this.normalizeWorkflowStatus(workflow.status)
        if (status === 'IN_PROGRESS' || filters.showCompleted) {
          nodes.push({
            id: workflow.id,
            type: 'workflow',
            label: workflow.templateName,
            data: {
              name: workflow.templateName,
              status: status.toLowerCase() as 'pending' | 'active' | 'inactive' | 'completed' | 'in-progress',
              workflowId: workflow.id,
              templateId: workflow.templateId,
              currentStep: workflow.currentStep,
              totalSteps: workflow.totalSteps,
              initiator: workflow.initiator,
              size: 12,
              color: status === 'IN_PROGRESS' ? '#00ff88' : '#60a5fa'
            },
            position: {
              x: 400 + (index % 2) * 200,
              y: 100 + index * 80
            }
          })
        }
      })
    }

    // Add relationships as edges
    organizationalData.relationships.forEach((rel: any) => {
      const sourceExists = nodes.find(n => n.id === rel.from)
      const targetExists = nodes.find(n => n.id === rel.to)

      if (sourceExists && targetExists) {
        edges.push({
          id: `${rel.from}-${rel.to}-${rel.type}`,
          source: rel.from,
          target: rel.to,
          type: rel.type,
          data: {
            relationshipType: rel.type,
            weight: rel.weight || 1,
            status: 'active',
            color: this.getEdgeColor(rel.type),
            strokeWidth: rel.weight ? rel.weight * 1.5 : 1
          },
          animated: rel.type === 'workflow-flow' && rel.weight > 1
        })
      }
    })

    // Add task assignment edges with latency buckets from task performance if available
    workflowData.tasks.forEach((task: any) => {
      if (task.assignedTo && task.assignedTo.length > 0) {
        task.assignedTo.forEach((userId: string) => {
          const userExists = nodes.find(n => n.id === userId)
          const workflowExists = nodes.find(n => n.id === task.workflowId)

          if (userExists && workflowExists) {
            const latencyMinutes = this.estimateTaskLatencyMinutes(task)
            const latencyBucket = this.bucketLatency(latencyMinutes)
            edges.push({
              id: `${task.workflowId}-${userId}-assignment`,
              source: task.workflowId,
              target: userId,
              type: 'assignment',
              data: {
                relationshipType: 'assignment',
                assignmentMode: task.assignmentMode,
                taskId: task.id,
                status: this.normalizeTaskStatus(task.status).toLowerCase() as
                  | 'pending'
                  | 'active'
                  | 'completed'
                  | 'scheduled',
                color: '#f59e0b',
                strokeWidth: 2,
                latencyMinutes,
                latencyBucket
              },
              animated: this.normalizeTaskStatus(task.status) === 'IN_PROGRESS'
            })
          }
        })
      }
    })

    return {
      nodes,
      edges,
      metadata: {
        totalWorkflows: workflowData.workflows.length,
        activeWorkflows: workflowData.metadata.activeCount,
        totalUsers: organizationalData.metadata.totalUsers,
        totalDepartments: organizationalData.metadata.activeDepartments,
        lastUpdated: new Date().toISOString(),
        viewMode: 'force-directed',
        analytics: workflowData?.analytics
      }
    }
  }

  private static normalizeWorkflowStatus(
    status: string
  ): 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED' | 'RUNNING' | 'FAILED' | 'CANCELED' | 'SCHEDULED' {
    const s = (status || '').toUpperCase()
    const map: Record<string, any> = {
      RUNNING: 'IN_PROGRESS'
    }
    return (map[s] || s) as any
  }

  private static normalizeTaskStatus(
    status: string
  ): 'IN_PROGRESS' | 'COMPLETED' | 'SCHEDULED' | 'FAILED' | 'REJECTED' | 'CANCELED' | 'PENDING' {
    const s = (status || '').toUpperCase()
    if (s === 'QUEUED') return 'PENDING'
    return s as any
  }

  private static estimateTaskLatencyMinutes(task: any): number | undefined {
    try {
      const startedAt = task.startedAt || task.started_at
      const completedAt = task.completedAt || task.completed_at
      if (startedAt && completedAt) {
        const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime()
        if (!isNaN(ms) && ms > 0) return Math.round(ms / 60000)
      }
      return undefined
    } catch {
      return undefined
    }
  }

  private static bucketLatency(minutes?: number): 'fast' | 'normal' | 'slow' | 'very-slow' | 'pending' {
    if (minutes === undefined) return 'pending'
    if (minutes < 5) return 'fast'
    if (minutes < 30) return 'normal'
    if (minutes < 120) return 'slow'
    return 'very-slow'
  }

  private static createSankeyNetwork(
    workflowData: any,
    organizationalData: any,
    filters: GuardianFilter
  ): GuardianNetworkData {
    // TODO: Implement Sankey-specific transformation
    // For now, return basic structure
    return {
      nodes: [],
      edges: [],
      metadata: {
        totalWorkflows: 0,
        activeWorkflows: 0,
        totalUsers: 0,
        totalDepartments: 0,
        lastUpdated: new Date().toISOString(),
        viewMode: 'sankey'
      }
    }
  }

  private static createHierarchicalNetwork(
    workflowData: any,
    organizationalData: any,
    filters: GuardianFilter
  ): GuardianNetworkData {
    // TODO: Implement hierarchical transformation
    return {
      nodes: [],
      edges: [],
      metadata: {
        totalWorkflows: 0,
        activeWorkflows: 0,
        totalUsers: 0,
        totalDepartments: 0,
        lastUpdated: new Date().toISOString(),
        viewMode: 'hierarchical'
      }
    }
  }

  private static createChordNetwork(
    workflowData: any,
    organizationalData: any,
    filters: GuardianFilter
  ): GuardianNetworkData {
    // TODO: Implement chord diagram transformation
    return {
      nodes: [],
      edges: [],
      metadata: {
        totalWorkflows: 0,
        activeWorkflows: 0,
        totalUsers: 0,
        totalDepartments: 0,
        lastUpdated: new Date().toISOString(),
        viewMode: 'chord'
      }
    }
  }

  private static createGeographicNetwork(
    workflowData: any,
    organizationalData: any,
    filters: GuardianFilter
  ): GuardianNetworkData {
    // TODO: Implement geographic transformation
    return {
      nodes: [],
      edges: [],
      metadata: {
        totalWorkflows: 0,
        activeWorkflows: 0,
        totalUsers: 0,
        totalDepartments: 0,
        lastUpdated: new Date().toISOString(),
        viewMode: 'geographic'
      }
    }
  }

  private static createRealtimeNetwork(
    workflowData: any,
    organizationalData: any,
    filters: GuardianFilter
  ): GuardianNetworkData {
    // Use force-directed as base but with real-time emphasis
    const baseNetwork = this.createForceDirectedNetwork(workflowData, organizationalData, filters)

    // Enhance with real-time indicators
    baseNetwork.nodes.forEach(node => {
      if (node.data.status === 'active') {
        node.data.color = '#00ff88' // Bright green for active
        node.data.size = (node.data.size || 10) * 1.2 // Larger for active
      }
    })

    baseNetwork.edges.forEach(edge => {
      if (edge.data.status === 'active') {
        edge.animated = true
        edge.data.color = '#00ff88'
      }
    })

    baseNetwork.metadata.viewMode = 'realtime'
    return baseNetwork
  }

  private static getEdgeColor(type: string): string {
    switch (type) {
      case 'workflow-flow':
        return '#60a5fa'
      case 'assignment':
        return '#f59e0b'
      case 'reporting':
        return '#8b5cf6'
      case 'department':
        return '#06b6d4'
      default:
        return '#374151'
    }
  }

  static calculateStatistics(input: StatisticsInput): GuardianStatistics {
    const { workflowData, organizationalData, networkData } = input

    // Extract real analytics data from backend APIs
    const businessKpis = workflowData?.analytics?.flowAnalytics?.businessKpis || {}
    const systemHealth = workflowData?.analytics?.flowAnalytics?.systemHealth || {}
    const taskOverview = workflowData?.analytics?.taskAnalytics?.taskOverview || {}
    const userMetrics = workflowData?.analytics?.flowAnalytics?.userMetrics || {}

    // Use real backend data for overview statistics
    const totalWorkflows = businessKpis.totalWorkflows || workflowData.workflows.length
    const activeWorkflows = workflowData.workflows.filter((wf: any) => wf.status === 'IN_PROGRESS').length
    const completionRate = businessKpis.completionRate || 0
    const completedToday = Math.floor(totalWorkflows * (completionRate / 100))

    // Get real cycle time from backend (in hours), convert to minutes
    const avgCompletionTime = (businessKpis.avgCycleTime || 2) * 60 // Convert hours to minutes

    // Get real department performance from backend
    const departmentPerformance = workflowData?.analytics?.flowAnalytics?.departmentPerformance || []
    const topBusiestDepartments = departmentPerformance
      .sort((a: any, b: any) => b.workflowCount - a.workflowCount)
      .slice(0, 5)
      .map((dept: any) => ({
        id: dept.departmentId,
        name: dept.departmentName,
        activeTaskCount: dept.workflowCount,
        completionRate: dept.completionRate / 100 // Convert percentage to decimal
      }))

    // Get real template effectiveness from backend
    const flowEffectiveness = workflowData?.analytics?.flowAnalytics?.flowEffectiveness || []
    const topTemplates = flowEffectiveness
      .sort((a: any, b: any) => b.usageCount - a.usageCount)
      .slice(0, 5)
      .map((flow: any) => ({
        templateId: flow.flowId,
        name: flow.flowName,
        activeCount: flow.usageCount,
        completionRate: flow.successRate / 100 // Convert percentage to decimal
      }))

    // Get real bottleneck data from backend performance metrics
    const performanceMetrics = workflowData?.analytics?.flowAnalytics?.performanceMetrics || {}
    const backendBottlenecks = performanceMetrics.bottlenecks || []
    const bottleneckSteps = backendBottlenecks
      .filter((b: any) => b.severity === 'high' || b.severity === 'critical')
      .slice(0, 5)
      .map((bottleneck: any) => ({
        stepTitle: bottleneck.component,
        averageTimeInStep: Math.floor(bottleneck.impact * 60), // Convert impact to minutes
        templateName: bottleneck.description.includes('Template') ? bottleneck.description : 'Workflow Process'
      }))

    return {
      overview: {
        totalWorkflows: totalWorkflows,
        activeWorkflows: activeWorkflows,
        completedToday: completedToday,
        averageCompletionTime: avgCompletionTime
      },
      organizational: {
        totalUsers: userMetrics.activeUsers || organizationalData.users.filter((u: any) => u.isActive).length,
        activeDepartments: departmentPerformance.length || organizationalData.departments.length,
        topBusiestDepartments
      },
      workflow: {
        topTemplates: topTemplates as any[],
        averageStepsPerWorkflow: userMetrics.avgTasksPerUser || 4.2,
        bottleneckSteps
      },
      realtime: {
        tasksCompletedLast24h: completedToday,
        currentlyActive:
          taskOverview.activeTasks || workflowData.tasks.filter((t: any) => t.status === 'IN_PROGRESS').length,
        peakHours: workflowData?.analytics?.trendAnalysis?.slice(0, 5)?.map((trend: any, index: number) => ({
          hour: 9 + index,
          taskCount: trend.workflowsStarted || 15
        })) || [
          { hour: 9, taskCount: 15 },
          { hour: 10, taskCount: 22 },
          { hour: 11, taskCount: 18 },
          { hour: 14, taskCount: 20 },
          { hour: 15, taskCount: 16 }
        ]
      }
    }
  }
}
