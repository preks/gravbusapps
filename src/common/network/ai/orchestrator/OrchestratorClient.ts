/**
 * Orchestrator API Client
 *
 * Client for the AI Orchestrator endpoints on the ai-builder service.
 * Base path: /api/orchestration (plans/:jobId for plan resources).
 * Handles build plan analysis and execution with SSE progress streaming.
 * API and frontend use camelCase (NEWWORK API Guidelines).
 */

import { AI_BUILDER_API_URL } from '@/common/utils/serviceResolver'
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  AnalyzeStreamEvent,
  ExecuteRequest,
  UpdatePlanRequest,
  RefinePlanRequest,
  ListPlansParams,
  ListPlansResponse,
  DraftCheckpoint,
  CreateDraftCheckpointRequest,
  ResolveDraftCheckpointByMessageParams,
  RestoreDraftCheckpointRequest,
  RestoreDraftCheckpointResponse,
  TurnEvent,
  TurnRequest,
  OrchestrationStateMachineResponse,
  JobsByStateResponse,
  JobsPageResponse
} from '@/business-apps/core/create/apps/ai-orchestrator/features/orchestrator/types/api'
import type { BuildPlan } from '@/business-apps/core/create/apps/ai-orchestrator/features/orchestrator/types/build'
import type {
  BuildJobStatus,
  BuildProgressEvent
} from '@/business-apps/core/create/apps/ai-orchestrator/features/orchestrator/types/progress'

/** Optional callbacks and abort signal for {@link OrchestratorClient.executeWiringRetry}. */
export interface ExecuteWiringRetryOptions {
  onError?: (error: Error) => void
  onComplete?: () => void
  signal?: AbortSignal
  onResponse?: (content: string) => void
}

function extractWiringWarnings(metadata?: Record<string, unknown>): string[] | undefined {
  if (!metadata) return undefined
  const warnings = metadata.wiringWarnings ?? metadata.wiring_warnings
  if (Array.isArray(warnings) && warnings.every((w): w is string => typeof w === 'string')) {
    return warnings.length > 0 ? warnings : undefined
  }
  return undefined
}

/** Normalize SSE event from API (may send snake_case) to camelCase */
function normalizeProgressEvent(raw: Record<string, unknown>): BuildProgressEvent {
  // Normalize metadata keys (session_id -> sessionId, repo_id -> repoId)
  let normalizedMetadata: Record<string, unknown> | undefined
  if (raw.metadata && typeof raw.metadata === 'object') {
    const meta = raw.metadata as Record<string, unknown>
    normalizedMetadata = {
      ...meta,
      sessionId: meta.sessionId ?? meta.session_id,
      repoId: meta.repoId ?? meta.repo_id
    }
    // Remove snake_case versions if they exist
    if (normalizedMetadata.session_id) delete normalizedMetadata.session_id
    if (normalizedMetadata.repo_id) delete normalizedMetadata.repo_id
  }

  return {
    eventType: ((raw.eventType ?? raw.event_type) as BuildProgressEvent['eventType']) ?? 'heartbeat',
    jobId: (raw.jobId ?? raw.job_id) as string,
    timestamp: (raw.timestamp as string) ?? new Date().toISOString(),
    componentType: (raw.componentType ?? raw.component_type) as BuildProgressEvent['componentType'],
    componentId: (raw.componentId ?? raw.component_id) as string | undefined,
    componentName: (raw.componentName ?? raw.component_name) as string | undefined,
    status: (raw.status as BuildProgressEvent['status']) ?? 'pending',
    message: (raw.message as string) ?? '',
    progressPercent: (raw.progressPercent ?? raw.progress_percent) as number | undefined,
    createdId: (raw.createdId ?? raw.created_id) as string | undefined,
    errorDetails: (raw.errorDetails ?? raw.error_details) as string | undefined,
    metadata: normalizedMetadata,
    wiringWarnings: extractWiringWarnings(normalizedMetadata),
    totalComponents: (raw.totalComponents ?? raw.total_components) as number | undefined,
    completedComponents: (raw.completedComponents ?? raw.completed_components) as number | undefined,
    failedComponents: (raw.failedComponents ?? raw.failed_components) as number | undefined,
    skippedComponents: (raw.skippedComponents ?? raw.skipped_components) as number | undefined
  }
}

/** Extract message from API error detail (string or object) */
function getMessageFromDetail(detail: unknown): string | null {
  if (typeof detail === 'string') return detail
  if (typeof detail !== 'object' || detail == null) return null
  const obj = detail as Record<string, unknown>
  if (typeof obj.message === 'string' && Array.isArray(obj.errors)) {
    const errorList = obj.errors.join('\n• ')
    return `${obj.message}:\n• ${errorList}`
  }
  if (Array.isArray(obj.errors)) return obj.errors.join('\n• ')
  if (typeof obj.message === 'string') return obj.message
  return null
}

/**
 * Parse error response from the API
 * Handles both simple string errors and complex validation error structures
 */
function parseErrorResponse(errorData: unknown, fallbackMessage: string): string {
  const data = errorData as Record<string, unknown> | null | undefined
  if (data?.message && typeof data.message === 'string') return data.message
  if (!data?.detail) return fallbackMessage
  const extracted = getMessageFromDetail(data.detail)
  return extracted ?? fallbackMessage
}

function normalizeOptionalId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

function sanitizeTurnRequest(request: TurnRequest): TurnRequest {
  const sanitized: TurnRequest = { ...request }
  const jobId = normalizeOptionalId(request.jobId)
  const sessionId = normalizeOptionalId(request.sessionId)
  const repoId = normalizeOptionalId(request.repoId)

  if (jobId) sanitized.jobId = jobId
  else delete sanitized.jobId

  if (sessionId) sanitized.sessionId = sessionId
  else delete sanitized.sessionId

  if (repoId) sanitized.repoId = repoId
  else delete sanitized.repoId

  return sanitized
}

/** Mutable holder for turn-level errors parsed from SSE (shared by build + wiring retry streams). */
interface ProgressTurnStreamContext {
  turnErrorMessage: string | null
}

/**
 * Maps one SSE turn event to either a terminal turn error, assistant response chunk, or normalized build progress.
 */
function handleProgressTurnStreamEvent(
  event: TurnEvent,
  ctx: ProgressTurnStreamContext,
  onProgressEvent: (event: BuildProgressEvent) => void,
  onResponse: ((content: string) => void) | undefined,
  defaultErrorMessage: string
): void {
  const raw = event as unknown as Record<string, unknown>
  const eventType = (raw.eventType ?? raw.event_type) as string | undefined
  const turnType = typeof raw.type === 'string' ? raw.type : undefined
  if (turnType === 'error' || turnType === 'turn_error') {
    ctx.turnErrorMessage =
      (typeof raw.content === 'string' && raw.content.trim()) ||
      (typeof raw.message === 'string' && raw.message.trim()) ||
      (typeof raw.error === 'string' && raw.error.trim()) ||
      defaultErrorMessage
    return
  }
  if (turnType === 'response' && typeof raw.content === 'string' && raw.content.trim()) {
    onResponse?.(raw.content)
    return
  }
  if (!eventType || eventType === 'heartbeat') {
    return
  }
  onProgressEvent(normalizeProgressEvent(raw))
}

/**
 * Client for the AI Orchestrator API
 */
export class OrchestratorClient {
  private baseUrl: string
  private accessToken: string

  constructor(accessToken: string) {
    this.baseUrl = AI_BUILDER_API_URL
    this.accessToken = accessToken
  }

  private async openTurnStream(request: TurnRequest, signal?: AbortSignal): Promise<ReadableStream<Uint8Array>> {
    const sanitizedRequest = sanitizeTurnRequest(request)
    const response = await fetch(`${this.baseUrl}/orchestration/turns/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
        Accept: 'text/event-stream'
      },
      body: JSON.stringify(sanitizedRequest),
      signal
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = parseErrorResponse(errorData, `Turn failed: ${response.statusText}`)
      throw new Error(errorMessage)
    }

    if (!response.body) {
      throw new Error('No response body for turn stream')
    }
    return response.body
  }

  async streamTurnRaw(request: TurnRequest, signal?: AbortSignal): Promise<ReadableStream<Uint8Array>> {
    return this.openTurnStream(request, signal)
  }

  async streamTurn(
    request: TurnRequest,
    onEvent?: (event: TurnEvent) => void,
    signal?: AbortSignal
  ): Promise<TurnEvent[]> {
    const stream = await this.openTurnStream(request, signal)
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    const events: TurnEvent[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (!payload || payload === '[DONE]' || payload.startsWith(':')) continue
        try {
          const event = JSON.parse(payload) as TurnEvent
          events.push(event)
          onEvent?.(event)
        } catch {
          // Ignore malformed event lines
        }
      }
    }

    return events
  }

  /**
   * Stream a turn that emits build-style progress events; handles turn errors, assistant text, and abort.
   */
  private async consumeProgressTurnStream(
    request: TurnRequest,
    onProgressEvent: (event: BuildProgressEvent) => void,
    options: {
      defaultTurnError: string
      onError?: (error: Error) => void
      onComplete?: () => void
      signal?: AbortSignal
      onResponse?: (content: string) => void
    }
  ): Promise<void> {
    try {
      const ctx: ProgressTurnStreamContext = { turnErrorMessage: null }
      await this.streamTurn(
        request,
        event =>
          handleProgressTurnStreamEvent(event, ctx, onProgressEvent, options.onResponse, options.defaultTurnError),
        options.signal
      )
      if (ctx.turnErrorMessage) {
        throw new Error(ctx.turnErrorMessage)
      }
      options.onComplete?.()
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }
      options.onError?.(error instanceof Error ? error : new Error(String(error)))
    }
  }

  private extractPlanFromEvent(event: TurnEvent | undefined): BuildPlan | undefined {
    if (!event?.data || typeof event.data !== 'object') return undefined
    const data = event.data as Record<string, unknown>
    if (!('plan' in data)) return undefined
    return (data as { plan?: BuildPlan }).plan
  }

  private extractJobIdFromEvent(event: TurnEvent | undefined): string | undefined {
    if (!event) return undefined
    if (typeof event.jobId === 'string' && event.jobId.trim()) return event.jobId
    if (!event.data || typeof event.data !== 'object') return undefined
    const jobId = (event.data as { jobId?: unknown }).jobId
    return typeof jobId === 'string' && jobId.trim() ? jobId : undefined
  }

  /**
   * Analyze a prompt and generate a build plan
   */
  async analyze(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    const events = await this.streamTurn({
      intent: 'plan_create',
      scope: 'orchestrator_full',
      prompt: request.prompt,
      context: request.context,
      answers: request.answers,
      sessionId: request.sessionId,
      repoId: request.repoId,
      createdBy: request.createdBy
    })
    const planEvent = events.find(event => event.type === 'plan_updated')
    const streamedPlan = this.extractPlanFromEvent(planEvent)
    if (streamedPlan) {
      return {
        success: true,
        plan: streamedPlan
      }
    }
    const planJobId = this.extractJobIdFromEvent(planEvent)
    if (planJobId) {
      try {
        const plan = await this.getPlan(planJobId)
        return { success: true, plan }
      } catch {
        // Fall through to error handling for consistency.
      }
    }
    const errorEvent = events.find(event => event.type === 'error' || event.type === 'turn_error')
    if (errorEvent) {
      return { success: false, error: String(errorEvent.error || errorEvent.message || 'Analysis failed') }
    }
    return { success: false, error: 'Analysis stream ended without a final plan' }
  }

  /**
   * Analyze prompt and stream progress milestones via SSE.
   */
  async analyzeStream(
    request: AnalyzeRequest,
    onEvent?: (event: AnalyzeStreamEvent) => void
  ): Promise<AnalyzeResponse> {
    const events = await this.streamTurn(
      {
        intent: 'plan_create',
        scope: 'orchestrator_full',
        prompt: request.prompt,
        context: request.context,
        answers: request.answers,
        sessionId: request.sessionId,
        repoId: request.repoId,
        createdBy: request.createdBy
      },
      event => onEvent?.(event as AnalyzeStreamEvent)
    )
    const planEvent = events.find(event => event.type === 'plan_updated')
    const streamedPlan = this.extractPlanFromEvent(planEvent)
    if (streamedPlan) {
      return {
        success: true,
        plan: streamedPlan
      }
    }
    const planJobId = this.extractJobIdFromEvent(planEvent)
    if (planJobId) {
      try {
        const plan = await this.getPlan(planJobId)
        return { success: true, plan }
      } catch {
        // Fall through to error handling for consistency.
      }
    }
    const errorEvent = events.find(event => event.type === 'error' || event.type === 'turn_error')
    return {
      success: false,
      error: String(errorEvent?.error || errorEvent?.message || 'Analysis stream ended without a final result')
    }
  }

  async executeWithProgress(
    jobId: string,
    request: ExecuteRequest,
    onEvent: (event: BuildProgressEvent) => void,
    onError?: (error: Error) => void,
    onComplete?: () => void,
    signal?: AbortSignal,
    onResponse?: (content: string) => void
  ): Promise<void> {
    await this.consumeProgressTurnStream(
      {
        intent: 'build_execute',
        scope: 'orchestrator_full',
        jobId,
        sessionId: request.sessionId,
        repoId: request.repoId,
        skipComponents: request.skipComponents,
        plan: request.plan,
        createdBy: request.createdBy
      },
      onEvent,
      {
        defaultTurnError: 'Build execution failed',
        onError,
        onComplete,
        signal,
        onResponse
      }
    )
  }

  async executeWiringRetry(
    jobId: string,
    sessionId: string | undefined,
    repoId: string | undefined,
    onEvent: (event: BuildProgressEvent) => void,
    options?: ExecuteWiringRetryOptions
  ): Promise<void> {
    await this.consumeProgressTurnStream(
      {
        intent: 'wiring_retry',
        scope: 'orchestrator_full',
        jobId,
        sessionId,
        repoId
      },
      onEvent,
      {
        defaultTurnError: 'Wiring retry failed',
        onError: options?.onError,
        onComplete: options?.onComplete,
        signal: options?.signal,
        onResponse: options?.onResponse
      }
    )
  }

  /**
   * Get the status of a build job
   */
  async getJobStatus(jobId: string): Promise<BuildJobStatus> {
    const response = await fetch(`${this.baseUrl}/orchestration/plans/${jobId}/status`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = parseErrorResponse(errorData, `Failed to get status: ${response.statusText}`)
      throw new Error(errorMessage)
    }

    return response.json() as Promise<BuildJobStatus>
  }

  /**
   * List orchestration plans with optional paging and sort.
   */
  async listPlans(params?: ListPlansParams): Promise<ListPlansResponse> {
    const searchParams = new URLSearchParams()
    if (params?.limit != null) searchParams.set('limit', String(params.limit))
    if (params?.offset != null) searchParams.set('offset', String(params.offset))
    if (params?.sort != null) searchParams.set('sort', params.sort)
    const query = searchParams.toString()
    const url = query ? `${this.baseUrl}/orchestration/plans?${query}` : `${this.baseUrl}/orchestration/plans`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = parseErrorResponse(errorData, `Failed to list plans: ${response.statusText}`)
      throw new Error(errorMessage)
    }

    const json = (await response.json()) as ListPlansResponse
    // Normalize snake_case from API if present
    const rawPaging = json.paging as unknown as Record<string, unknown>
    if (json.paging && rawPaging && 'total_records' in rawPaging) {
      const p = json.paging as ListPlansResponse['paging'] & { total_records?: number }
      json.paging = { limit: p.limit, offset: p.offset, totalRecords: p.totalRecords ?? p.total_records ?? 0 }
    }
    return json
  }

  /**
   * Get the full build plan
   */
  async getPlan(jobId: string): Promise<BuildPlan> {
    const response = await fetch(`${this.baseUrl}/orchestration/plans/${jobId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = parseErrorResponse(errorData, `Failed to get plan: ${response.statusText}`)
      throw new Error(errorMessage)
    }

    return response.json() as Promise<BuildPlan>
  }

  async getStateMachine(): Promise<OrchestrationStateMachineResponse> {
    const response = await fetch(`${this.baseUrl}/orchestration/state-machine`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = parseErrorResponse(errorData, `Failed to load state machine: ${response.statusText}`)
      throw new Error(errorMessage)
    }
    return response.json() as Promise<OrchestrationStateMachineResponse>
  }

  async getJobsByState(limitPerState = 200): Promise<JobsByStateResponse> {
    const response = await fetch(`${this.baseUrl}/orchestration/jobs/by-state?limitPerState=${limitPerState}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = parseErrorResponse(errorData, `Failed to load jobs by state: ${response.statusText}`)
      throw new Error(errorMessage)
    }
    return response.json() as Promise<JobsByStateResponse>
  }

  async getJobsPage(limit = 25, offset = 0): Promise<JobsPageResponse> {
    const query = new URLSearchParams({
      limit: String(limit),
      offset: String(offset)
    })
    const response = await fetch(`${this.baseUrl}/orchestration/jobs?${query.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = parseErrorResponse(errorData, `Failed to load jobs page: ${response.statusText}`)
      throw new Error(errorMessage)
    }
    return response.json() as Promise<JobsPageResponse>
  }

  async createDraftCheckpoint(request: CreateDraftCheckpointRequest): Promise<DraftCheckpoint> {
    const response = await fetch(`${this.baseUrl}/orchestration/drafts/checkpoints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = parseErrorResponse(errorData, `Failed to create checkpoint: ${response.statusText}`)
      throw new Error(errorMessage)
    }

    return response.json() as Promise<DraftCheckpoint>
  }

  async listDraftCheckpoints(params: {
    jobId?: string
    sessionId?: string
    limit?: number
  }): Promise<DraftCheckpoint[]> {
    const searchParams = new URLSearchParams()
    if (params.jobId) searchParams.set('jobId', params.jobId)
    if (params.sessionId) searchParams.set('sessionId', params.sessionId)
    if (params.limit != null) searchParams.set('limit', String(params.limit))
    const query = searchParams.toString()
    const url = query
      ? `${this.baseUrl}/orchestration/drafts/checkpoints?${query}`
      : `${this.baseUrl}/orchestration/drafts/checkpoints`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = parseErrorResponse(errorData, `Failed to list checkpoints: ${response.statusText}`)
      throw new Error(errorMessage)
    }

    return response.json() as Promise<DraftCheckpoint[]>
  }

  async resolveDraftCheckpointByMessage(
    params: ResolveDraftCheckpointByMessageParams
  ): Promise<DraftCheckpoint | null> {
    const searchParams = new URLSearchParams({
      sessionId: params.sessionId,
      chatCheckpointMessageId: params.chatCheckpointMessageId
    })
    if (params.jobId) {
      searchParams.set('jobId', params.jobId)
    }
    const response = await fetch(
      `${this.baseUrl}/orchestration/drafts/checkpoints/resolve?${searchParams.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = parseErrorResponse(errorData, `Failed to resolve checkpoint: ${response.statusText}`)
      throw new Error(errorMessage)
    }

    const data = (await response.json()) as DraftCheckpoint | null
    return data ?? null
  }

  async restoreDraftCheckpoint(request: RestoreDraftCheckpointRequest): Promise<RestoreDraftCheckpointResponse> {
    const response = await fetch(`${this.baseUrl}/orchestration/drafts/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = parseErrorResponse(errorData, `Failed to restore checkpoint: ${response.statusText}`)
      throw new Error(errorMessage)
    }

    return response.json() as Promise<RestoreDraftCheckpointResponse>
  }

  /**
   * Update a build plan before execution
   */
  async updatePlan(jobId: string, request: UpdatePlanRequest): Promise<BuildPlan> {
    const response = await fetch(`${this.baseUrl}/orchestration/plans/${jobId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = parseErrorResponse(errorData, `Failed to update plan: ${response.statusText}`)
      throw new Error(errorMessage)
    }

    return response.json() as Promise<BuildPlan>
  }

  /**
   * Refine a build plan with natural language feedback
   */
  async refinePlan(jobId: string, request: RefinePlanRequest): Promise<AnalyzeResponse> {
    const events = await this.streamTurn({
      intent: 'plan_refine',
      scope: 'orchestrator_full',
      jobId,
      prompt: request.feedback,
      conversationHistory: request.conversationHistory
    })
    const responseEvent = events.find(event => event.type === 'response')
    const refinementSummary =
      typeof responseEvent?.content === 'string' && responseEvent.content.trim() ? responseEvent.content : undefined
    const planEvent = events.find(event => event.type === 'plan_updated')
    const streamedPlan = this.extractPlanFromEvent(planEvent)
    if (streamedPlan) {
      return {
        success: true,
        plan: streamedPlan,
        refinementSummary
      }
    }
    const planJobId = this.extractJobIdFromEvent(planEvent) || jobId
    try {
      const plan = await this.getPlan(planJobId)
      return { success: true, plan, refinementSummary }
    } catch {
      // Keep existing error handling below.
    }
    const errorEvent = events.find(event => event.type === 'error' || event.type === 'turn_error')
    return { success: false, error: String(errorEvent?.error || errorEvent?.message || 'Refinement failed') }
  }

  /**
   * Refine a build plan with natural language feedback via SSE stream.
   */
  async refinePlanStream(jobId: string, request: RefinePlanRequest): Promise<ReadableStream<Uint8Array>> {
    return this.streamTurnRaw({
      intent: 'plan_refine',
      scope: 'orchestrator_full',
      jobId,
      prompt: request.feedback,
      conversationHistory: request.conversationHistory
    })
  }

  /**
   * Publish the built screens for a job (calls /publish/stream, returns when done)
   */
  async publishApp(
    repoId: string,
    sessionId: string,
    jobId?: string,
    onEvent?: (event: { type: string; message?: string; result?: unknown }) => void
  ): Promise<{ success: boolean; message?: string; resourceUrl?: string; azureUrl?: string }> {
    const events = await this.streamTurn(
      {
        intent: 'publish',
        scope: 'orchestrator_full',
        repoId,
        sessionId,
        jobId
      },
      event => onEvent?.({ type: String(event.type), message: String(event.message || ''), result: event.data })
    )

    const publishResultEvent = events.find(event => event.type === 'publish_result')
    if (publishResultEvent?.data && typeof publishResultEvent.data === 'object') {
      const result = publishResultEvent.data as {
        success?: boolean
        message?: string
        resourceUrl?: string
        azureUrl?: string
      }
      return {
        success: result.success === true,
        message: result.message,
        resourceUrl: typeof result.resourceUrl === 'string' ? result.resourceUrl : undefined,
        azureUrl: typeof result.azureUrl === 'string' ? result.azureUrl : undefined
      }
    }

    const errorEvent = events.find(event => event.type === 'error' || event.type === 'turn_error')
    if (errorEvent) {
      throw new Error(String(errorEvent.error || errorEvent.message || 'Publish failed'))
    }

    return { success: false, message: 'Publish did not return a final result' }
  }

  /**
   * Cancel and delete a build plan
   */
  async cancelBuild(jobId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/orchestration/plans/${jobId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = parseErrorResponse(errorData, `Failed to cancel: ${response.statusText}`)
      throw new Error(errorMessage)
    }
  }
}

// Export singleton factory
export function createOrchestratorClient(accessToken: string): OrchestratorClient {
  return new OrchestratorClient(accessToken)
}
