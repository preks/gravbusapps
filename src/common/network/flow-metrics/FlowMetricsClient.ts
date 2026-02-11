import { RestClient } from '../rest/RestClient'
import { env } from '@/common/env/EnvUtils'

export interface FlowExecutionTask {
  id: string
  name: string
  referenceName?: string
  description?: string
  priority?: number
  status?: string
  state?: string
  createdAt?: string
  started?: string
  lastUpdate?: string
  dueDate?: string
  completed?: string
  actualOwner?: string
  ownerName?: string
  creatorUserId?: string
  creatorName?: string
  nodeName?: string
  potentialUsers?: string[]
  assigneeNames?: string[]
  endpoint?: string
  customFlowId?: string
  processInstanceId?: string
  processDefinitionId?: string
  taskDefinitionId?: string
  variables?: Record<string, any>
  inputs?: Record<string, any>
}

export interface FlowExecutionTasksResponse {
  processingStates: FlowExecutionTask[]
  totalCount: number
  // Legacy fields for backward compatibility
  content?: FlowExecutionTask[]
  totalElements?: number
  totalPages?: number
  size?: number
  number?: number
  first?: boolean
  last?: boolean
  numberOfElements?: number
  empty?: boolean
}

export interface FlowExecutionTasksParams {
  cockpitPage?: string
  size?: number
  page?: number
  field?: string
  direction?: 'ASC' | 'DESC'
  search?: string
  searchItem?: string
  userId?: string
  taskName?: string
  filterProcessName?: string
  filterTaskName?: string
  state?: string // Filter by task state (e.g., 'open', 'completed')
  filterState?: string // Filter by task state (e.g., 'open', 'completed')
}

export class FlowMetricsClient extends RestClient {
  constructor(accessToken?: string) {
    // Determine origin for relative URL resolution
    const origin =
      typeof globalThis !== 'undefined' && (globalThis as any).location?.origin
        ? (globalThis as any).location.origin
        : ''

    // Priority: NEXT_PUBLIC_FLOW_METRICS_ENDPOINT > NEXT_PUBLIC_BASE_URL > origin
    // Note: FlowMetrics API (/flow-executions/tasks) is at the platform root, no subpath needed
    let baseUrl = env('NEXT_PUBLIC_FLOW_METRICS_ENDPOINT') || env('NEXT_PUBLIC_BASE_URL') || origin

    // Ensure relative paths become absolute
    if (baseUrl && baseUrl.startsWith('/')) {
      baseUrl = `${origin}${baseUrl}`
    }

    // If still empty, use origin
    if (!baseUrl) {
      baseUrl = origin
    }

    console.log('[FlowMetricsClient] Initialized with baseUrl:', baseUrl)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    super(baseUrl, headers)
  }

  /**
   * Get flow execution tasks with pagination and filtering
   */
  async getFlowExecutionTasks(params: FlowExecutionTasksParams = {}): Promise<FlowExecutionTasksResponse> {
    const {
      cockpitPage = 'INBOX',
      size = 20,
      page = 0,
      field = 'CREATION_DATE',
      direction = 'DESC',
      search,
      userId,
      taskName,
      filterProcessName,
      filterTaskName,
      filterState
    } = params

    const queryParams: Record<string, string | number> = {
      cockpitPage,
      size,
      page,
      field,
      direction
    }

    if (userId) {
      queryParams.userId = userId
    }

    if (taskName) {
      queryParams.taskName = taskName
    }

    if (filterState) {
      queryParams.filterState = filterState
    }

    if (filterProcessName) {
      queryParams.filterProcessName = filterProcessName
    }

    if (filterTaskName) {
      queryParams.filterTaskName = filterTaskName
    }

    if (search) {
      queryParams.searchItem = search
    }

    return this.get<FlowExecutionTasksResponse>('/flow-executions/tasks', {
      params: queryParams
    })
  }

  /**
   * Get a specific flow execution task by ID
   */
  async getFlowExecutionTask(taskId: string): Promise<FlowExecutionTask> {
    return this.get<FlowExecutionTask>(`/flow-executions/tasks/${taskId}`)
  }

  /**
   * Get flow execution tasks by business key
   * @param businessKey - The business key that links GraphQL tasks to flow execution tasks
   * @param params - Optional query parameters (userId, filterState, pagination, etc.)
   */
  async getFlowExecutionTasksByBusinessKey(
    businessKey: string,
    params?: {
      size?: number
      page?: number
      field?: string
      direction?: 'ASC' | 'DESC'
      filterTaskName?: string
    }
  ): Promise<FlowExecutionTasksResponse> {
    const queryParams: Record<string, string | number> = {
      // Pagination (mandatory)
      size: params?.size || 20,
      page: params?.page || 0,
      // Sort (mandatory)
      field: params?.field || 'CREATION_DATE',
      direction: params?.direction || 'DESC'
    }

    // filterTaskName (optional)
    if (params?.filterTaskName) {
      queryParams.filterTaskName = params.filterTaskName
    }

    return this.get<FlowExecutionTasksResponse>(`/flow-executions/tasks/${businessKey}`, {
      params: queryParams
    })
  }

  /**
   * Complete a flow execution task
   */
  async completeTask(taskId: string, variables?: Record<string, any>): Promise<void> {
    return this.post(`/flow-executions/tasks/${taskId}/complete`, {
      variables: variables || {}
    })
  }

  /**
   * Claim a flow execution task
   */
  async claimTask(taskId: string, userId?: string): Promise<void> {
    return this.post(`/flow-executions/tasks/${taskId}/claim`, {
      userId
    })
  }

  /**
   * Unclaim a flow execution task
   */
  async unclaimTask(taskId: string): Promise<void> {
    return this.post(`/flow-executions/tasks/${taskId}/unclaim`)
  }
}
