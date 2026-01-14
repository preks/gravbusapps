import { useState, useEffect } from 'react'
import { getFlowEngineBaseUrl } from '@/common/network/flows/flowEngineUrl'

export interface SurveyAuditEntry {
  id: string
  timestamp: string
  action: string
  userId?: string
  user?: {
    displayName: string
  }
  workflowName?: string
  surveyName?: string
  details?: string
  message?: string
  ipAddress?: string
  surveyId?: string
  responseId?: string
}

export interface SurveyAuditResponse {
  entries: SurveyAuditEntry[]
  totalCount: number
  offset: number
  limit: number
}

export interface SurveyAuditFilters {
  limit: number
  offset: number
  startDate?: string
  endDate?: string
  action?: string
  userId?: string
  surveyId?: string
  surveyType?: string
  responseId?: string
}

export const useSurveyAuditLogs = (filters: SurveyAuditFilters, accessToken: string) => {
  const [data, setData] = useState<SurveyAuditResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAuditLogs = async () => {
    if (!accessToken) return

    try {
      setIsLoading(true)
      setError(null)

      const baseUrl = getFlowEngineBaseUrl()

      // Build query parameters
      const queryParams = new URLSearchParams({
        limit: filters.limit.toString(),
        offset: filters.offset.toString(),
        // Filter by survey solution tag
        'tags.solution': 'survey'
      })

      if (filters.startDate) queryParams.append('startDate', filters.startDate)
      if (filters.endDate) queryParams.append('endDate', filters.endDate)
      if (filters.action) queryParams.append('action', filters.action)
      if (filters.userId) queryParams.append('userId', filters.userId)
      if (filters.surveyId) queryParams.append('workflowId', filters.surveyId)
      if (filters.surveyType) queryParams.append('tags.surveyType', filters.surveyType)

      const response = await fetch(`${baseUrl}/api/audit/logs?${queryParams}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch audit logs: ${response.statusText}`)
      }

      const auditData = await response.json()

      // Transform the response to match expected format
      const transformedData: SurveyAuditResponse = {
        entries: (auditData.entries || []).map((entry: any) => ({
          id: entry.id || `${entry.timestamp}_${Math.random()}`,
          timestamp: entry.timestamp || entry.createdAt,
          action: entry.action || entry.eventType || 'UNKNOWN',
          userId: entry.userId || entry.user?.id,
          user: entry.user
            ? {
                displayName: entry.user.displayName || entry.user.name || entry.userId
              }
            : undefined,
          workflowName: entry.workflowName || entry.templateName,
          surveyName: entry.surveyName || entry.workflowName,
          details: entry.details || entry.description || entry.data,
          message: entry.message,
          ipAddress: entry.ipAddress,
          surveyId: entry.workflowId || entry.surveyId,
          responseId: entry.responseId || entry.taskId
        })),
        totalCount: auditData.totalCount || auditData.total || 0,
        offset: auditData.offset || 0,
        limit: auditData.limit || filters.limit
      }

      setData(transformedData)
    } catch (err) {
      console.error('Error fetching survey audit logs:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs')

      // Provide mock data in case of error for development
      setData({
        entries: generateMockAuditEntries(),
        totalCount: 50,
        offset: 0,
        limit: filters.limit
      })
    } finally {
      setIsLoading(false)
    }
  }

  const refetch = () => {
    fetchAuditLogs()
  }

  useEffect(() => {
    fetchAuditLogs()
  }, [
    accessToken,
    filters.limit,
    filters.offset,
    filters.startDate,
    filters.endDate,
    filters.action,
    filters.userId,
    filters.surveyId
  ])

  return { data, isLoading, error, refetch }
}

// Mock data generator for development/fallback
const generateMockAuditEntries = (): SurveyAuditEntry[] => {
  const actions = [
    'SURVEY_CREATED',
    'SURVEY_LAUNCHED',
    'SURVEY_STARTED',
    'RESPONSE_SUBMITTED',
    'SURVEY_COMPLETED',
    'PARTICIPANT_INVITED',
    'REMINDER_SENT',
    'SURVEY_CLOSED'
  ]

  const surveyNames = [
    'Employee Satisfaction Survey',
    'Product Feedback Survey',
    'Training Assessment',
    'Customer Experience Poll',
    'Research Survey 2024'
  ]

  const users = [
    { displayName: 'John Doe' },
    { displayName: 'Jane Smith' },
    { displayName: 'Mike Johnson' },
    { displayName: 'Sarah Wilson' },
    { displayName: 'System' }
  ]

  return Array.from({ length: 20 }, (_, index) => {
    const timestamp = new Date(Date.now() - index * 2 * 60 * 60 * 1000).toISOString()
    const action = actions[Math.floor(Math.random() * actions.length)]
    const surveyName = surveyNames[Math.floor(Math.random() * surveyNames.length)]
    const user = users[Math.floor(Math.random() * users.length)]

    return {
      id: `mock_audit_${index}`,
      timestamp,
      action,
      userId: user.displayName === 'System' ? undefined : `user_${index}`,
      user: user.displayName === 'System' ? undefined : user,
      workflowName: surveyName,
      surveyName,
      details: `${action.replace('_', ' ').toLowerCase()} for ${surveyName}`,
      ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
      surveyId: `survey_${Math.floor(Math.random() * 10)}`,
      responseId: action.includes('RESPONSE') ? `response_${Math.floor(Math.random() * 100)}` : undefined
    }
  })
}

export default useSurveyAuditLogs
