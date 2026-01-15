import { getFlowEngineBaseUrl } from '@/common/network/flows/flowEngineUrl'

export interface ComplianceFlow {
  id: string
  templateId: string
  workflowName: string
  initiator: string
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PENDING' | 'TERMINATED'
  startTime: string
  endTime?: string
  updateTime?: string
  dueDate?: string
  tags: Record<string, string>
  progress: number
  totalSteps: number
  completedSteps: number
  totalTasks: number
  completedTasks: number
  durationMinutes?: number
  processHealth?: any
  timeInsights?: any
}

export interface ComplianceFlowsResponse {
  flows: ComplianceFlow[]
  totalCount: number
  hasMore: boolean
}

export interface StepSegment {
  percentage: number
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'FAILED' | 'CANCELED' | 'TIMED_OUT'
}

/**
 * Service for fetching compliance-specific flows and data
 */
export class ComplianceDataService {
  /**
   * Fetch flows filtered by compliance tag
   */
  static async getComplianceFlows(
    accessToken: string,
    filters: {
      limit?: number
      offset?: number
      status?: string
      complianceType?: string
      priority?: string
    } = {}
  ): Promise<ComplianceFlowsResponse> {
    try {
      // Build query parameters with compliance tag filter
      const params = new URLSearchParams({
        'tag.solution': 'compliance', // Always filter for compliance
        limit: (filters.limit || 20).toString(),
        offset: (filters.offset || 0).toString()
      })

      // For now, we only filter by the static solution tag
      // Additional filters can be added later if needed

      const baseUrl = getFlowEngineBaseUrl()
      const response = await fetch(`${baseUrl}/api/flows/list?${params.toString()}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch compliance flows: ${response.statusText}`)
      }

      const data = await response.json()
      const payload = data?.data || {}
      const items = Array.isArray(payload) ? payload : payload.flows || []

      // Transform the response to match our interface
      const flows: ComplianceFlow[] = items.map((flow: any) => ({
        id: flow.flowId || flow.root_workflow_id || flow.flow_id || flow.id,
        templateId: flow.templateId || flow.template_id,
        workflowName: flow.flowName || flow.workflow_name || flow.flow_name,
        initiator: flow.initiatedBy || flow.initiator || 'system',
        status: this.mapFlowStatus(flow.status || flow.flow_status),
        startTime: flow.startTime || flow.flow_started_at || flow.start_time,
        endTime: flow.endTime || flow.flow_completed_at || flow.end_time,
        updateTime: flow.updateTime || flow.lastActivityTime,
        dueDate: flow.dueDate || flow.timeInsights?.dueDate,
        tags: flow.tags || {},
        progress: flow.progressPercentage || flow.step_progress_percentage || 0,
        totalSteps: flow.stepStatus?.total || flow.total_steps || 0,
        completedSteps: flow.stepStatus?.completed || flow.completed_steps || 0,
        totalTasks: flow.totalTasks || 0,
        completedTasks: flow.completedTasks || 0,
        durationMinutes: flow.durationMinutes || flow.timeInsights?.minutesRunning,
        processHealth: flow.processHealth,
        timeInsights: flow.timeInsights
      }))

      return {
        flows,
        totalCount: payload.totalCount ?? flows.length,
        hasMore: payload.hasMore ?? false
      }
    } catch (error) {
      console.error('Error fetching compliance flows:', error)
      return {
        flows: [],
        totalCount: 0,
        hasMore: false
      }
    }
  }

  /**
   * Fetch compliance templates
   */
  static async getComplianceTemplates(accessToken: string): Promise<any[]> {
    try {
      const params = new URLSearchParams({
        'tag.solution': 'compliance',
        limit: '50',
        onlyLatest: 'true'
      })

      const baseUrl = getFlowEngineBaseUrl()
      const response = await fetch(`${baseUrl}/api/templates?${params.toString()}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch compliance templates: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data || []
    } catch (error) {
      console.error('Error fetching compliance templates:', error)
      return []
    }
  }

  /**
   * Get compliance statistics
   */
  static async getComplianceStats(accessToken: string): Promise<{
    totalFlows: number
    activeFlows: number
    completedFlows: number
    overdueFlows: number
    complianceScore: number
  }> {
    try {
      const flows = await this.getComplianceFlows(accessToken, { limit: 100 })

      const stats = {
        totalFlows: flows.totalCount,
        activeFlows: flows.flows.filter(f => f.status === 'RUNNING').length,
        completedFlows: flows.flows.filter(f => f.status === 'COMPLETED').length,
        overdueFlows: flows.flows.filter(f => f.status === 'FAILED' || this.isOverdue(f)).length,
        complianceScore: this.calculateComplianceScore(flows.flows)
      }

      return stats
    } catch (error) {
      console.error('Error fetching compliance stats:', error)
      return {
        totalFlows: 0,
        activeFlows: 0,
        completedFlows: 0,
        overdueFlows: 0,
        complianceScore: 0
      }
    }
  }

  /**
   * Map flow status to our standard format
   */
  private static mapFlowStatus(status: string): 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PENDING' | 'TERMINATED' {
    switch (status?.toUpperCase()) {
      case 'IN_PROGRESS':
      case 'RUNNING':
        return 'RUNNING'
      case 'COMPLETED':
        return 'COMPLETED'
      case 'FAILED':
      case 'TIMED_OUT':
        return 'FAILED'
      case 'TERMINATED':
        return 'TERMINATED'
      default:
        return 'PENDING'
    }
  }

  /**
   * Check if a flow is overdue (simple heuristic)
   */
  private static isOverdue(flow: ComplianceFlow): boolean {
    if (flow.status === 'COMPLETED') return false

    const startTime = new Date(flow.startTime)
    const now = new Date()
    const daysSinceStart = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24)

    // Consider flows overdue if running for more than 7 days
    return daysSinceStart > 7
  }

  /**
   * Calculate overall compliance score
   */
  private static calculateComplianceScore(flows: ComplianceFlow[]): number {
    if (flows.length === 0) return 100

    const completedFlows = flows.filter(f => f.status === 'COMPLETED').length
    const failedFlows = flows.filter(f => f.status === 'FAILED').length
    const overdueFlows = flows.filter(f => this.isOverdue(f)).length

    // Score based on completion rate and penalty for failures/overdue
    const completionRate = (completedFlows / flows.length) * 100
    const failurePenalty = (failedFlows / flows.length) * 20
    const overduePenalty = (overdueFlows / flows.length) * 10

    const score = Math.max(0, completionRate - failurePenalty - overduePenalty)
    return Math.round(score)
  }

  /**
   * Fetch per-step progress segments for a flow (used for segmented progress UI)
   */
  static async getFlowStepSegments(accessToken: string, flowId: string): Promise<StepSegment[]> {
    try {
      const baseUrl = getFlowEngineBaseUrl()
      const response = await fetch(`${baseUrl}/api/flows/${flowId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) {
        return []
      }
      const payload = await response.json()
      const data = payload?.data || payload
      const steps: any[] = data?.steps || data?.flowSteps || data?.stepDetails || []
      return steps.map((s: any) => {
        const total = Number(s.total_tasks ?? s.totalTasks ?? 0) || 0
        const completed = Number(s.completed_tasks ?? s.completedTasks ?? 0) || 0
        const status: StepSegment['status'] = (s.step_status ?? s.status ?? 'PENDING').toUpperCase()
        const percentage =
          status === 'COMPLETED'
            ? 100
            : status === 'IN_PROGRESS' && total > 0
              ? Math.round((completed / total) * 100)
              : 0
        return { percentage, status } as StepSegment
      })
    } catch {
      return []
    }
  }
}
