import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { env } from '@/common/env/EnvUtils'

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

/**
 * Hook for flow progress and data management
 */
export const useFlowProgressClient = (context: BusinessAppContextProps) => {
  // Base URL for the custom flow engine API
  const baseUrl = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine'

  const getFlowOverview = async (flowId: string): Promise<FlowOverview> => {
    const response = await fetch(`${baseUrl}/api/flows/${flowId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${context.accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch flow overview: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  const getFlowComments = async (flowId: string): Promise<FlowCommentsResponse> => {
    const response = await fetch(`${baseUrl}/api/flows/${flowId}/comments`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${context.accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch flow comments: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  const getStepDataJson = async (
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

    const url = `${baseUrl}/api/flows/${flowId}/steps/${stepIndex}/data${params.toString() ? '?' + params.toString() : ''}`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${context.accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch step data: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  const getStepDataByReference = async (
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

    const url = `${baseUrl}/api/flows/${flowId}/steps/${stepReference}/data${params.toString() ? '?' + params.toString() : ''}`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${context.accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch step data: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  const getExportUrl = (flowId: string, stepIndex?: number): string => {
    if (stepIndex !== undefined) {
      return `${baseUrl}/api/flows/${flowId}/steps/${stepIndex}/export`
    }
    return `${baseUrl}/api/flows/${flowId}/export`
  }

  const getExportUrlByReference = (flowId: string, stepReference?: string): string => {
    if (stepReference !== undefined) {
      return `${baseUrl}/api/flows/${flowId}/steps/${stepReference}/export`
    }
    return `${baseUrl}/api/flows/${flowId}/export`
  }

  return {
    getFlowOverview,
    getFlowComments,
    getStepDataJson,
    getStepDataByReference,
    getExportUrl,
    getExportUrlByReference
  }
}
