import { resolveFlowbotBaseUrl } from '@/common/utils/flowbotUtils'
import { setAccessTokenToAuthorizationHeader } from '../HeaderUtils'
import { RestClient, type RequestOptions } from '../rest/RestClient'

export interface ScheduledTask {
  id: string
  user_id: string
  name: string
  description: string | null
  task_instruction: string
  schedule_type: 'interval' | 'cron' | 'daily' | 'weekly'
  schedule_description: string
  status: 'active' | 'paused' | 'completed' | 'failed' | 'cancelled'
  next_run_at: string | null
  last_run_at: string | null
  run_count: number
  max_runs: number | null
  created_at: string
  updated_at: string
}

export interface TaskExecution {
  id: string
  task_id: string
  started_at: string
  completed_at: string | null
  status: 'running' | 'success' | 'failed'
  result_summary: string | null
  error_message: string | null
  delivered: boolean
}

export interface CreateScheduledTaskRequest {
  name: string
  description?: string
  task_instruction: string
  schedule_description: string
  max_runs?: number
  user_timezone?: string
}

export interface ScheduledTaskListResponse {
  tasks: ScheduledTask[]
  total: number
}

export class ScheduledTasksClient extends RestClient {
  constructor() {
    // Use environment-aware base URL (localhost → dev → env NEXT_PUBLIC_FLOWBOT_ENDPOINT / NEXT_PUBLIC_BASE_URL)
    const baseUrl = resolveFlowbotBaseUrl()
    const url = `${baseUrl}/flowbot`
    super(url, {})
  }

  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {}
    }
    this.headers['Authorization'] = setAccessTokenToAuthorizationHeader(accessToken)
  }

  /**
   * Create a new scheduled task
   */
  public async createTask(
    request: CreateScheduledTaskRequest,
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<ScheduledTask> {
    return this.post<ScheduledTask>('/api/scheduled-tasks/', request, options)
  }

  /**
   * List all scheduled tasks for the current user
   */
  public async listTasks(
    params?: {
      include_paused?: boolean
      limit?: number
      offset?: number
    },
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<ScheduledTaskListResponse> {
    const queryParams = new URLSearchParams()
    if (params?.include_paused !== undefined) {
      queryParams.append('include_paused', String(params.include_paused))
    }
    if (params?.limit) {
      queryParams.append('limit', String(params.limit))
    }
    if (params?.offset) {
      queryParams.append('offset', String(params.offset))
    }

    const queryString = queryParams.toString()
    const url = queryString ? `/api/scheduled-tasks/?${queryString}` : '/api/scheduled-tasks/'
    return this.get<ScheduledTaskListResponse>(url, options)
  }

  /**
   * Get a specific scheduled task by ID
   */
  public async getTask(taskId: string, options: Omit<RequestOptions, 'body'> = {}): Promise<ScheduledTask> {
    return this.get<ScheduledTask>(`/api/scheduled-tasks/${taskId}`, options)
  }

  /**
   * Pause a scheduled task
   */
  public async pauseTask(taskId: string, options: Omit<RequestOptions, 'body'> = {}): Promise<{ message: string }> {
    return this.post<{ message: string }>(`/api/scheduled-tasks/${taskId}/pause`, {}, options)
  }

  /**
   * Resume a paused scheduled task
   */
  public async resumeTask(taskId: string, options: Omit<RequestOptions, 'body'> = {}): Promise<{ message: string }> {
    return this.post<{ message: string }>(`/api/scheduled-tasks/${taskId}/resume`, {}, options)
  }

  /**
   * Delete a scheduled task
   */
  public async deleteTask(taskId: string, options: Omit<RequestOptions, 'body'> = {}): Promise<{ message: string }> {
    return this.delete<{ message: string }>(`/api/scheduled-tasks/${taskId}`, options)
  }

  /**
   * Get recent executions for a task
   */
  public async getTaskExecutions(
    taskId: string,
    params?: { limit?: number },
    options: Omit<RequestOptions, 'body'> = {}
  ): Promise<TaskExecution[]> {
    const queryParams = new URLSearchParams()
    if (params?.limit) {
      queryParams.append('limit', String(params.limit))
    }

    const queryString = queryParams.toString()
    const url = queryString
      ? `/api/scheduled-tasks/${taskId}/executions?${queryString}`
      : `/api/scheduled-tasks/${taskId}/executions`
    return this.get<TaskExecution[]>(url, options)
  }
}

export const scheduledTasksClient = new ScheduledTasksClient()
