import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'

export interface OnboardingTaskAssignment {
  assignmentStatus?: string
  assignedTo?: string
  allowReassignment?: boolean
  targets?: Record<string, unknown>
}

export interface OnboardingTask {
  id: string
  title: string
  status: string
  flowId?: string
  workflowId?: string
  requestId?: string
  flowName?: string
  stepId?: string
  message?: string
  dueDate?: string
  scheduledAt?: string
  updatedAt?: string
  assignment?: OnboardingTaskAssignment
  availableActions?: {
    canClaim?: boolean
    canUnclaim?: boolean
    canComplete?: boolean
    canReassign?: boolean
    canReject?: boolean
    canComment?: boolean
  }
}

export interface OnboardingTasksResponse {
  tasks: OnboardingTask[]
  totalCount: number
}

export class OnboardingTasksClient {
  constructor(private readonly accessToken: string) {}

  async getCurrentUserTasks(userId: string, appTag: string): Promise<OnboardingTasksResponse> {
    const params = new URLSearchParams()
    params.set('tags.app', appTag)

    const response = await fetch(`${CUSTOM_FLOW_ENGINE_API_URL}/tasks/user/${userId}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to load onboarding tasks: ${response.status} ${response.statusText}`)
    }

    const json = await response.json()
    const payload = json?.data || json
    const tasks = payload?.tasks || []

    return {
      tasks,
      totalCount: payload?.totalCount || tasks.length
    }
  }

  async getCurrentUserCompletedTasks(userId: string, appTag: string): Promise<OnboardingTasksResponse> {
    const params = new URLSearchParams()
    params.set('tags.app', appTag)
    params.set('limit', '100')
    params.set('offset', '0')

    const response = await fetch(`${CUSTOM_FLOW_ENGINE_API_URL}/tasks/user/${userId}/completed?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to load completed onboarding tasks: ${response.status} ${response.statusText}`)
    }

    const json = await response.json()
    const payload = json?.data || json
    const tasks = payload?.tasks || []

    return {
      tasks,
      totalCount: payload?.totalCount || tasks.length
    }
  }

  async claimTask(taskId: string, userId: string): Promise<void> {
    const response = await fetch(`${CUSTOM_FLOW_ENGINE_API_URL}/tasks/${taskId}/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`
      },
      body: JSON.stringify({ userId })
    })

    if (!response.ok) {
      throw new Error(`Failed to claim onboarding task: ${response.status} ${response.statusText}`)
    }
  }
}
