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
  ExecuteRequest,
  UpdatePlanRequest,
  RefinePlanRequest,
  BuildPlan,
  BuildJobStatus,
  BuildProgressEvent,
  ListPlansParams,
  ListPlansResponse
} from '@/business-apps/core/create/apps/ai-orchestrator/features/orchestrator/types'

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
    totalComponents: (raw.totalComponents ?? raw.total_components) as number | undefined,
    completedComponents: (raw.completedComponents ?? raw.completed_components) as number | undefined,
    failedComponents: (raw.failedComponents ?? raw.failed_components) as number | undefined,
    skippedComponents: (raw.skippedComponents ?? raw.skipped_components) as number | undefined
  }
}

/**
 * Parse error response from the API
 * Handles both simple string errors and complex validation error structures
 */
function parseErrorResponse(errorData: any, fallbackMessage: string): string {
  // Check for top-level message first (NestJS standard error format)
  if (errorData?.message && typeof errorData.message === 'string') {
    return errorData.message
  }

  if (!errorData?.detail) {
    return fallbackMessage
  }

  const detail = errorData.detail

  // If detail is a string, return it directly
  if (typeof detail === 'string') {
    return detail
  }

  // If detail is an object with message and errors array
  if (typeof detail === 'object' && detail?.message && Array.isArray(detail?.errors)) {
    const errorList = detail.errors.join('\n• ')
    return `${detail.message}:\n• ${errorList}`
  }

  // If detail is an object with just errors array
  if (typeof detail === 'object' && Array.isArray(detail?.errors)) {
    return detail.errors.join('\n• ')
  }

  // If detail is an object with just message
  if (typeof detail === 'object' && detail?.message) {
    return detail.message
  }

  // Fallback to original behavior
  return fallbackMessage
}

type PublishSSEEvent = {
  type: string
  message?: string
  result?: { success: boolean; message?: string }
}

type PublishResult = { success: boolean; message?: string }

function handlePublishSSEEvent(
  data: string,
  onEvent?: (event: { type: string; message?: string; result?: unknown }) => void
): PublishResult | null {
  const evt = JSON.parse(data) as PublishSSEEvent
  onEvent?.(evt)
  if (evt.type === 'done' && evt.result) {
    return evt.result
  }
  if (evt.type === 'error') {
    throw new Error(evt.message || 'Publish failed')
  }
  return null
}

function processPublishSSELine(
  line: string,
  onEvent?: (event: { type: string; message?: string; result?: unknown }) => void
): PublishResult | null {
  if (!line.startsWith('data:')) return null
  const data = line.slice(5).trim()
  if (!data) return null
  try {
    return handlePublishSSEEvent(data, onEvent)
  } catch (e) {
    if (!(e instanceof SyntaxError)) throw e
    return null
  }
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

  /**
   * Analyze a prompt and generate a build plan
   */
  async analyze(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    const response = await fetch(`${this.baseUrl}/orchestration/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = parseErrorResponse(errorData, `Analysis failed: ${response.statusText}`)
      throw new Error(errorMessage)
    }

    return response.json() as Promise<AnalyzeResponse>
  }

  /**
   * Execute a build plan and return an EventSource for progress streaming
   * Note: EventSource doesn't support custom headers, so auth must be handled
   * via cookies or session. For custom headers, use executeWithProgress instead.
   */
  createExecutionStream(jobId: string): EventSource {
    const url = new URL(`${this.baseUrl}/orchestration/plans/${jobId}/execute`)
    const eventSource = new EventSource(url.toString())
    return eventSource
  }

  /**
   * Execute a build plan using fetch-based SSE (supports authorization)
   */
  private parseSseLine(line: string, onEvent: (event: BuildProgressEvent) => void) {
    if (!line.startsWith('data:')) return
    const data = line.slice(5).trim()
    // Skip empty data and SSE comment content that infrastructure (nginx/ingress) may
    // send as "data: :ping" instead of a proper SSE comment line ":ping".
    if (!data || data.startsWith(':')) return
    try {
      const raw = JSON.parse(data) as Record<string, unknown>
      const eventType = (raw.eventType ?? raw.event_type) as string | undefined
      if (eventType === 'heartbeat') {
        return
      }
      const event = normalizeProgressEvent(raw)
      onEvent(event)
    } catch (e) {
      console.error('[OrchestratorClient] Failed to parse SSE event:', e, data)
    }
  }

  private async readSseStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onEvent: (event: BuildProgressEvent) => void,
    onComplete?: () => void
  ) {
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        onComplete?.()
        break
      }
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        this.parseSseLine(line, onEvent)
      }
    }
  }

  async executeWithProgress(
    jobId: string,
    request: ExecuteRequest,
    onEvent: (event: BuildProgressEvent) => void,
    onError?: (error: Error) => void,
    onComplete?: () => void,
    signal?: AbortSignal
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/orchestration/plans/${jobId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
          Accept: 'text/event-stream'
        },
        body: JSON.stringify(request),
        signal
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = parseErrorResponse(errorData, `Execution failed: ${response.statusText}`)
        throw new Error(errorMessage)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      await this.readSseStream(reader, onEvent, onComplete)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }
      onError?.(error instanceof Error ? error : new Error(String(error)))
    }
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
    const response = await fetch(`${this.baseUrl}/orchestration/plans/${jobId}/refine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = parseErrorResponse(errorData, `Failed to refine plan: ${response.statusText}`)
      throw new Error(errorMessage)
    }

    return response.json() as Promise<AnalyzeResponse>
  }

  /**
   * Publish the built screens for a job (calls /publish/stream, returns when done)
   */
  async publishApp(
    repoId: string,
    sessionId: string,
    onEvent?: (event: { type: string; message?: string; result?: unknown }) => void
  ): Promise<{ success: boolean; message?: string }> {
    const response = await fetch(`${this.baseUrl}/publish/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
        Accept: 'text/event-stream'
      },
      body: JSON.stringify({ repoId, sessionId })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = parseErrorResponse(errorData, `Publish failed: ${response.statusText}`)
      throw new Error(errorMessage)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''
    let lastResult: PublishResult = { success: false }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        const result = processPublishSSELine(line, onEvent)
        if (result) lastResult = result
      }
    }

    return lastResult
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
