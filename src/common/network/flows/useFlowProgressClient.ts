import { useCallback, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getFlowEngineApiBaseUrl } from './flowEngineUrl'

export interface FlowProgress {
  currentStep: number
  totalSteps: number
  completedSteps: number
  percentage: number
}

export interface FlowStep {
  stepIndex: number
  title: string
  type: string
  assignmentMode: string
  allowReassignment: boolean
  status: 'COMPLETED' | 'IN_PROGRESS' | 'SCHEDULED' | 'QUEUED'
  // Status-specific fields
  completedAt?: string
  completedBy?: string
  executionTime?: string
  assignedTo?: string[]
  startedAt?: string
  claimedAt?: string
  availableAt?: string
  eligibleUsers?: string[]
}

export interface FlowOverview {
  id: string
  templateId: string
  name: string
  status: string
  createdAt: string
  progress: FlowProgress
  steps: FlowStep[]
}

export interface FlowComment {
  stepIndex: number
  stepTitle: string
  comment: string
  commentedBy: string
  commentedAt: string
  action: string
  visibility?: TaskCommentVisibility
}

export interface FlowCommentsResponse {
  id: string
  totalComments: number
  comments: FlowComment[]
}

export interface StepDataRow {
  flowId: string
  taskId: string
  userId: string
  userName: string
  timestamp: string
  stepTitle: string
  inputData: { [key: string]: any }
}

export interface StepDataResponse {
  data: StepDataRow[]
  totalCount: number
  hasMore: boolean
  stepIndex: number
  flowId: string
  pagination: {
    offset: number
    limit: number
  }
}

export type TaskCommentVisibility = 'INTERNAL_TASK' | 'INTERNAL_FLOW' | 'EXTERNAL'

export interface TaskComment {
  id?: string
  actionId?: string
  taskId?: string
  stepId?: string
  stepTitle?: string
  comment: string
  commentedBy: string
  commentedAt: string
  visibility?: TaskCommentVisibility
  action?: string
}

export interface TaskCommentsResponse {
  comments: TaskComment[]
  totalComments: number
}

export interface AddTaskCommentRequest {
  userId: string
  comment: string
  commentVisibility?: TaskCommentVisibility
}

/**
 * Hook for flow progress and data management
 */
export const useFlowProgressClient = (context: BusinessAppContextProps) => {
  const apiBaseUrl = getFlowEngineApiBaseUrl()
  const accessToken = context.accessToken

  const getFlowOverview = useCallback(
    async (flowId: string): Promise<FlowOverview> => {
      const response = await fetch(`${apiBaseUrl}/flows/${flowId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch flow overview: ${response.status} ${response.statusText}`)
      }

      return response.json()
    },
    [accessToken, apiBaseUrl]
  )

  const getFlowComments = useCallback(
    async (flowId: string): Promise<FlowCommentsResponse> => {
      const response = await fetch(`${apiBaseUrl}/flows/${flowId}/comments`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch flow comments: ${response.status} ${response.statusText}`)
      }

      return response.json()
    },
    [accessToken, apiBaseUrl]
  )

  const getStepDataJson = useCallback(
    async (
      flowId: string,
      stepIndex: number,
      options?: {
        limit?: number
        offset?: number
      }
    ): Promise<StepDataResponse> => {
      const params = new URLSearchParams()
      if (options?.limit) params.append('limit', options.limit.toString())
      if (options?.offset) params.append('offset', options.offset.toString())

      const url = `${apiBaseUrl}/flows/${flowId}/steps/${stepIndex}/data${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch step data: ${response.status} ${response.statusText}`)
      }

      return response.json()
    },
    [accessToken, apiBaseUrl]
  )

  const getStepDataByReference = useCallback(
    async (
      flowId: string,
      stepReference: string,
      options?: {
        limit?: number
        offset?: number
      }
    ): Promise<StepDataResponse> => {
      const params = new URLSearchParams()
      if (options?.limit) params.append('limit', options.limit.toString())
      if (options?.offset) params.append('offset', options.offset.toString())

      const url = `${apiBaseUrl}/flows/${flowId}/steps/${stepReference}/data${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch step data: ${response.status} ${response.statusText}`)
      }

      return response.json()
    },
    [accessToken, apiBaseUrl]
  )

  const getExportUrl = useCallback(
    (flowId: string, stepIndex?: number): string => {
      if (stepIndex !== undefined) {
        return `${apiBaseUrl}/flows/${flowId}/steps/${stepIndex}/export`
      }
      return `${apiBaseUrl}/flows/${flowId}/export`
    },
    [apiBaseUrl]
  )

  const getExportUrlByReference = useCallback(
    (flowId: string, stepReference?: string): string => {
      if (stepReference !== undefined) {
        return `${apiBaseUrl}/flows/${flowId}/steps/${stepReference}/export`
      }
      return `${apiBaseUrl}/flows/${flowId}/export`
    },
    [apiBaseUrl]
  )

  const getTaskComments = useCallback(
    async (taskId: string): Promise<TaskCommentsResponse> => {
      const response = await fetch(`${apiBaseUrl}/tasks/${encodeURIComponent(taskId)}/comments`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch task comments: ${response.status} ${response.statusText}`)
      }

      return response.json()
    },
    [accessToken, apiBaseUrl]
  )

  const addTaskComment = useCallback(
    async (taskId: string, body: AddTaskCommentRequest): Promise<void> => {
      const response = await fetch(`${apiBaseUrl}/tasks/${encodeURIComponent(taskId)}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          userId: body.userId,
          comment: body.comment,
          commentVisibility: body.commentVisibility ?? 'INTERNAL_TASK'
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to add task comment: ${response.status} ${response.statusText}`)
      }
    },
    [accessToken, apiBaseUrl]
  )

  return useMemo(
    () => ({
      getFlowOverview,
      getFlowComments,
      getStepDataJson,
      getStepDataByReference,
      getExportUrl,
      getExportUrlByReference,
      getTaskComments,
      addTaskComment
    }),
    [
      addTaskComment,
      getExportUrl,
      getExportUrlByReference,
      getFlowComments,
      getFlowOverview,
      getStepDataByReference,
      getStepDataJson,
      getTaskComments
    ]
  )
}
