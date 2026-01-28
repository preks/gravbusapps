import { getFlowEngineBaseUrl } from '@/common/network/flows/flowEngineUrl'

export interface SurveyFlow {
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
  // Survey-specific properties
  participantCount?: number
  responseCount?: number
  surveyType?: string
  description?: string
}

export interface StepSegment {
  stepId: string
  stepName: string
  status: 'pending' | 'active' | 'completed' | 'failed'
  assignedUsers: number
  completedUsers: number
  progressPercentage: number
}

export interface SurveyFlowsResponse {
  flows: SurveyFlow[]
  total: number
  offset: number
  limit: number
}

/**
 * Service for fetching survey-related flow data from the custom flow engine
 */
export class SurveyDataService {
  private static readonly BASE_URL = getFlowEngineBaseUrl()

  /**
   * Map flow status from API to our interface
   */
  private static mapFlowStatus(status: string): 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PENDING' | 'TERMINATED' {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return 'COMPLETED'
      case 'RUNNING':
      case 'IN_PROGRESS':
        return 'RUNNING'
      case 'FAILED':
      case 'ERROR':
        return 'FAILED'
      case 'TERMINATED':
      case 'CANCELLED':
        return 'TERMINATED'
      default:
        return 'PENDING'
    }
  }

  /**
   * Fetch survey flows filtered by solution tag
   */
  static async getSurveyFlows(
    accessToken: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<SurveyFlowsResponse> {
    try {
      const params = new URLSearchParams({
        'tag.solution': 'survey',
        limit: limit.toString(),
        offset: offset.toString(),
        orderBy: 'updated_time',
        orderDirection: 'DESC'
      })

      const response = await fetch(`${this.BASE_URL}/api/flows/list?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch survey flows: ${response.statusText}`)
      }

      const data = await response.json()

      // Transform flow data to survey flow format - data structure is { flows: [...] }
      const flowsData = Array.isArray(data.data?.flows) ? data.data.flows : []
      const flows: SurveyFlow[] = flowsData.map((flow: any) => ({
        id: flow.flowId,
        templateId: flow.templateId || flow.templateName,
        workflowName: flow.flowName || 'Unnamed Survey',
        initiator: flow.initiatedBy || 'system',
        status: this.mapFlowStatus(flow.status),
        startTime: flow.startTime,
        endTime: flow.endTime,
        updateTime: flow.updateTime || flow.lastActivityTime,
        dueDate: flow.dueDate || flow.timeInsights?.dueDate,
        tags: flow.tags || {},
        progress: flow.progressPercentage || 0,
        totalSteps: flow.stepStatus?.total || 2, // Default to 2 steps for surveys
        completedSteps: flow.stepStatus?.completed || (flow.status === 'COMPLETED' ? 2 : 1),
        totalTasks: flow.totalTasks || 1,
        completedTasks: flow.completedTasks || 0,
        durationMinutes: flow.durationMinutes || flow.timeInsights?.minutesRunning,
        // Survey-specific properties
        participantCount: flow.totalTasks || 1, // Use totalTasks as participant count estimate
        responseCount: flow.completedTasks || 0, // Use completedTasks as response count
        surveyType: flow.tags?.surveyType || 'custom',
        description: flow.templateId || ''
      }))

      return {
        flows,
        total: data.data?.totalCount || flows.length,
        offset: data.pagination?.offset || 0,
        limit: data.pagination?.limit || limit
      }
    } catch (error) {
      console.error('Error fetching survey flows:', error)
      throw error
    }
  }

  /**
   * Fetch step segments for a specific survey flow
   */
  static async getFlowStepSegments(accessToken: string, flowId: string): Promise<StepSegment[]> {
    try {
      const response = await fetch(`${this.BASE_URL}/api/flows/${flowId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch flow segments: ${response.statusText}`)
      }

      const data = await response.json()

      // Transform step data to step segments using the actual API response structure
      const segments: StepSegment[] = (data.steps || []).map((step: any, index: number) => {
        const totalTasks = step.totalTasks || 1
        const completedTasks = step.completedTasks || 0
        const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

        return {
          stepId: step.stepIndex?.toString() || `step_${index}`,
          stepName: step.title || `Survey Step ${index + 1}`,
          status: step.status?.toLowerCase() || 'pending',
          assignedUsers: totalTasks,
          completedUsers: completedTasks,
          progressPercentage
        }
      })

      return segments
    } catch (error) {
      console.error('Error fetching flow step segments:', error)
      // Return empty array on error to allow dashboard to continue functioning
      return []
    }
  }

  /**
   * Fetch survey response data for analysis
   * Note: This is a placeholder implementation. In a real system, you would
   * need to implement a proper survey responses endpoint or parse task output data.
   */
  static async getSurveyResponses(accessToken: string, surveyId: string): Promise<any[]> {
    try {
      // For now, return empty array since the endpoint doesn't exist
      // In the future, this could fetch task output data from completed survey tasks
      console.log(`Survey responses requested for survey: ${surveyId}`)
      return []
    } catch (error) {
      console.error('Error fetching survey responses:', error)
      return []
    }
  }

  /**
   * Fetch survey analytics aggregated data using existing flow analytics endpoint
   */
  static async getSurveyAnalytics(
    accessToken: string,
    timeframe: 'wtd' | 'mtd' | 'qtd' | 'ytd' = 'mtd'
  ): Promise<{
    totalSurveys: number
    activeSurveys: number
    completedSurveys: number
    totalResponses: number
    averageResponseRate: number
    surveyTypeBreakdown: Array<{ type: string; count: number; responseRate: number }>
  }> {
    try {
      // Use the existing analytics endpoint with survey tag filter
      const params = new URLSearchParams({
        timeframe,
        'tags.solution': 'survey',
        includeBusinessMetrics: 'true',
        includeOperationalMetrics: 'true'
      })

      const response = await fetch(`${this.BASE_URL}/api/analytics/flows?${params.toString()}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch survey analytics: ${response.statusText}`)
      }

      const result = await response.json()
      const data = result.data || {}

      // Extract survey metrics from flow analytics
      const businessKpis = data.businessKpis || {}

      return {
        totalSurveys: businessKpis.totalWorkflows || 0,
        activeSurveys: businessKpis.totalWorkflows - businessKpis.completedWorkflows || 0,
        completedSurveys: businessKpis.completedWorkflows || 0,
        totalResponses: businessKpis.totalTasks || 0,
        averageResponseRate: businessKpis.completionRate || 0,
        surveyTypeBreakdown: [] // Could be computed from flow effectiveness data if needed
      }
    } catch (error) {
      console.error('Error fetching survey analytics:', error)
      // Return default values on error
      return {
        totalSurveys: 0,
        activeSurveys: 0,
        completedSurveys: 0,
        totalResponses: 0,
        averageResponseRate: 0,
        surveyTypeBreakdown: []
      }
    }
  }

  /**
   * Get survey participation metrics using survey flow data
   */
  static async getParticipationMetrics(
    accessToken: string,
    surveyId?: string
  ): Promise<{
    totalParticipants: number
    responsesByType: Array<{ surveyType: string; responses: number }>
    participationTrend: Array<{ date: string; participants: number; responses: number }>
  }> {
    try {
      if (surveyId) {
        // Get specific survey participation metrics
        const surveyResponse = await this.getSurveyFlows(accessToken, 1, 0)
        const survey = surveyResponse.flows.find(f => f.id === surveyId)

        if (survey) {
          return {
            totalParticipants: survey.participantCount || 0,
            responsesByType: [
              {
                surveyType: survey.surveyType || 'custom',
                responses: survey.responseCount || 0
              }
            ],
            participationTrend: [] // Would need historical data
          }
        }
      } else {
        // Get overview of all survey participation
        const surveysResponse = await this.getSurveyFlows(accessToken, 50, 0)
        const totalParticipants = surveysResponse.flows.reduce((sum, survey) => sum + (survey.participantCount || 0), 0)

        // Group by survey type
        const responsesByType = surveysResponse.flows.reduce(
          (acc, survey) => {
            const type = survey.surveyType || 'custom'
            const existing = acc.find(item => item.surveyType === type)
            if (existing) {
              existing.responses += survey.responseCount || 0
            } else {
              acc.push({
                surveyType: type,
                responses: survey.responseCount || 0
              })
            }
            return acc
          },
          [] as Array<{ surveyType: string; responses: number }>
        )

        return {
          totalParticipants,
          responsesByType,
          participationTrend: [] // Would need historical data
        }
      }

      return {
        totalParticipants: 0,
        responsesByType: [],
        participationTrend: []
      }
    } catch (error) {
      console.error('Error fetching participation metrics:', error)
      return {
        totalParticipants: 0,
        responsesByType: [],
        participationTrend: []
      }
    }
  }
}
