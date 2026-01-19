import { useState, useEffect } from 'react'
import { getFlowEngineApiBaseUrl } from '@/common/network/flows/flowEngineUrl'

const API_BASE = getFlowEngineApiBaseUrl()

// Reusing interfaces from FlowDetailView for consistency
export interface StepStatus {
  completed: number
  total: number
  remaining: number
}

export interface ProcessHealth {
  isOnTrack: boolean
  hasFailures: boolean
  isStalled: boolean
  statusMessage: string
}

export interface TimeInsights {
  avgStepDurationMinutes?: number
  avgTaskCompletionMinutes?: number
  estimatedCompletionDate?: string
  isOverdue: boolean
  minutesRunning: number
  minutesSinceLastUpdate: number
  workflowStartTime: string
  lastActivityTime?: string
}

export interface FlowDetailData {
  flowId: string
  flowName: string
  templateId: string
  templateName: string
  status: string
  startTime: string
  updateTime: string
  endTime?: string
  progressPercentage: number
  stepStatus: StepStatus
  currentStep: number
  processHealth: ProcessHealth
  timeInsights: TimeInsights
  durationHours?: number
  durationMinutes?: number
  initiatedBy?: string
  participants?: string[]
  priority?: string
}

export const useFlowDetail = (flowId: string, accessToken: string) => {
  const [flowData, setFlowData] = useState<FlowDetailData | null>(null)
  const [flowSteps, setFlowSteps] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFlowDetail = async () => {
    if (!flowId || !accessToken) return

    setLoading(true)
    setError(null)

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      }

      // Fetch flow detailed data using existing endpoints
      const detailResponse = await fetch(`${API_BASE}/flow/${flowId}`, { headers })

      if (!detailResponse.ok) {
        throw new Error('Failed to fetch flow details')
      }

      const detailData = await detailResponse.json()

      // Transform data to match our interface
      const flowData = detailData.data || detailData
      const flowDetail: FlowDetailData = {
        flowId: flowData.flowId || flowId,
        flowName: flowData.name || flowData.workflowName || 'Unknown Flow',
        templateId: flowData.templateId || '',
        templateName: flowData.templateName || '',
        status: flowData.status || 'UNKNOWN',
        startTime: flowData.startTime || new Date().toISOString(),
        updateTime: flowData.updateTime || new Date().toISOString(),
        endTime: flowData.endTime,
        progressPercentage: flowData.progress?.percentage || 0,
        currentStep: flowData.progress?.currentStep || 0,
        stepStatus: {
          completed: flowData.progress?.completedSteps || 0,
          total: flowData.progress?.totalSteps || 0,
          remaining: (flowData.progress?.totalSteps || 0) - (flowData.progress?.completedSteps || 0)
        },
        processHealth: {
          isOnTrack: flowData.status === 'IN_PROGRESS',
          hasFailures: flowData.status === 'FAILED',
          isStalled: flowData.status === 'PAUSED',
          statusMessage:
            flowData.status === 'IN_PROGRESS'
              ? 'Running normally'
              : flowData.status === 'FAILED'
                ? 'Flow has failed'
                : flowData.status === 'PAUSED'
                  ? 'Flow is paused'
                  : 'Status unknown'
        },
        timeInsights: {
          isOverdue: false, // TODO: Calculate based on due dates
          minutesRunning: 0, // TODO: Calculate from start time
          minutesSinceLastUpdate: 0, // TODO: Calculate from update time
          workflowStartTime: flowData.startTime || new Date().toISOString()
        },
        durationHours: flowData.durationHours,
        durationMinutes: flowData.durationMinutes,
        initiatedBy: flowData.createdBy || flowData.initiatedBy,
        participants: flowData.participants || [],
        priority: flowData.priority
      }

      setFlowData(flowDetail)
      setFlowSteps(detailData.steps || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch flow details'
      setError(errorMessage)
      console.error('Error fetching flow details:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFlowDetail()
  }, [flowId, accessToken])

  return {
    flowData,
    flowSteps,
    loading,
    error,
    refetch: fetchFlowDetail
  }
}
