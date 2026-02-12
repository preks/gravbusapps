import { RestClient } from '../rest/RestClient'
import { getFlowEngineApiBaseUrl } from './flowEngineUrl'

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type TaskListResponse<TTask = any> = {
  tasks: TTask[]
  totalCount: number
  count?: number
  hasMore?: boolean
  pagination?: { offset: number; limit: number }
}

/* ------------------------------------------------------------------ */
/*  Shared param-building helpers                                      */
/* ------------------------------------------------------------------ */

/** Append non-nil scalar params from a record into a flat params object. */
function buildScalarParams(
  source: Record<string, string | number | boolean | undefined | null>
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || value === null) continue
    if (typeof value === 'string' && !value.trim()) continue
    out[key] = typeof value === 'string' ? value.trim() : value
  }
  return out
}

/** Convert a tags record into `tags.<key>=value` query params. */
function buildTagParams(tags?: Record<string, string>): Record<string, string> {
  if (!tags) return {}
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(tags)) {
    if (!key || value === undefined || value === null) continue
    out[`tags.${key}`] = String(value)
  }
  return out
}

/** Return an empty response — used when a required ID is missing. */
function emptyResponse<TTask>(limit: number): TaskListResponse<TTask> {
  return { tasks: [], totalCount: 0, count: 0, hasMore: false, pagination: { offset: 0, limit } }
}

/* ------------------------------------------------------------------ */
/*  Client                                                             */
/* ------------------------------------------------------------------ */

export class FlowTasksClient extends RestClient {
  constructor(accessToken: string) {
    const apiBaseUrl = getFlowEngineApiBaseUrl()
    super(`${apiBaseUrl}/tasks`, {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    })
  }

  async getUserTasks<TTask = any>(
    userId: string,
    params?: {
      includeAssigned?: boolean
      includeClaimable?: boolean
      includeInitiated?: boolean
      limit?: number
      offset?: number
      search?: string
      initiator?: string
      templateId?: string
      customState?: string
      priority?: TaskPriority
      tags?: Record<string, string>
    }
  ): Promise<TaskListResponse<TTask>> {
    const searchParams = buildScalarParams({
      includeAssigned: params?.includeAssigned,
      includeClaimable: params?.includeClaimable,
      includeInitiated: params?.includeInitiated,
      limit: params?.limit,
      offset: params?.offset,
      search: params?.search,
      initiator: params?.initiator,
      templateId: params?.templateId,
      customState: params?.customState,
      priority: params?.priority
    })

    return await this.get<TaskListResponse<TTask>>(`/user/${encodeURIComponent(userId)}`, {
      params: { ...searchParams, ...buildTagParams(params?.tags) }
    })
  }

  async getCompletedTasks<TTask = any>(
    userId: string,
    params?: {
      limit?: number
      offset?: number
      search?: string
      templateId?: string
      tags?: Record<string, string>
    }
  ): Promise<TaskListResponse<TTask>> {
    const searchParams = buildScalarParams({
      limit: params?.limit,
      offset: params?.offset,
      search: params?.search,
      templateId: params?.templateId
    })

    return await this.get<TaskListResponse<TTask>>(`/user/${encodeURIComponent(userId)}/completed`, {
      params: { ...searchParams, ...buildTagParams(params?.tags) }
    })
  }

  async getTemplateTasks<TTask = any>(
    templateId: string,
    params?: {
      limit?: number
      offset?: number
      search?: string
      customState?: string
      priority?: TaskPriority
      tags?: Record<string, string>
    }
  ): Promise<TaskListResponse<TTask>> {
    return this.fetchTemplateTasks(templateId, '', params)
  }

  async getTemplateCompletedTasks<TTask = any>(
    templateId: string,
    params?: {
      limit?: number
      offset?: number
      search?: string
      customState?: string
      priority?: TaskPriority
      tags?: Record<string, string>
    }
  ): Promise<TaskListResponse<TTask>> {
    return this.fetchTemplateTasks(templateId, '/completed', params)
  }

  async setState(
    taskId: string,
    body: { userId: string; state: string; comment?: string; commentVisibility?: string }
  ) {
    return await this.post(`/${encodeURIComponent(taskId)}/set-state`, body)
  }

  async setPriority(
    taskId: string,
    body: { userId: string; priority: TaskPriority; comment?: string; commentVisibility?: string }
  ) {
    return await this.post(`/${encodeURIComponent(taskId)}/set-priority`, body)
  }

  async complete(
    taskId: string,
    body: { userId: string; comment?: string; commentVisibility?: string; formData?: any }
  ) {
    return await this.post(`/${encodeURIComponent(taskId)}/complete`, body)
  }

  async reassign(
    taskId: string,
    body: { currentUserId: string; newUserId: string; comment?: string; commentVisibility?: string }
  ) {
    return await this.post(`/${encodeURIComponent(taskId)}/reassign`, body)
  }

  /* ---- Internal: shared fetch for getTemplateTasks / getTemplateCompletedTasks ---- */
  private async fetchTemplateTasks<TTask = any>(
    templateId: string,
    suffix: string,
    params?: {
      limit?: number
      offset?: number
      search?: string
      customState?: string
      priority?: TaskPriority
      tags?: Record<string, string>
    }
  ): Promise<TaskListResponse<TTask>> {
    const tid = String(templateId || '').trim()
    if (!tid) return emptyResponse<TTask>(params?.limit ?? 50)

    const searchParams = buildScalarParams({
      limit: params?.limit,
      offset: params?.offset,
      search: params?.search,
      customState: params?.customState,
      priority: params?.priority
    })

    return await this.get<TaskListResponse<TTask>>(`/template/${encodeURIComponent(tid)}${suffix}`, {
      params: { ...searchParams, ...buildTagParams(params?.tags) }
    })
  }
}
