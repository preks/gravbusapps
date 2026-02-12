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
  BuildProgressEvent
} from '@/business-apps/core/create/apps/create-workspace/features/orchestrator/types'

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
    eventType: (raw.eventType ?? raw.event_type) as BuildProgressEvent['eventType'],
    jobId: (raw.jobId ?? raw.job_id) as string,
    timestamp: (raw.timestamp as string) ?? '',
    componentType: (raw.componentType ?? raw.component_type) as BuildProgressEvent['componentType'],
    componentId: (raw.componentId ?? raw.component_id) as string | undefined,
    componentName: (raw.componentName ?? raw.component_name) as string | undefined,
    status: (raw.status as BuildProgressEvent['status']) ?? 'pending',
    message: (raw.message as string) ?? '',
    progressPercent: (raw.progressPercent ?? raw.progress_percent) as number | undefined,
    createdId: (raw.createdId ?? raw.created_id) as string | undefined,
    errorDetails: (raw.errorDetails ?? raw.error_details) as string | undefined,
    resourceUrl: (raw.resourceUrl ?? raw.resource_url) as string | undefined,
    azureUrl: (raw.azureUrl ?? raw.azure_url) as string | undefined,
    filesPublished: (raw.filesPublished ?? raw.files_published) as number | undefined,
    content: raw.content as string | undefined,
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
  async executeWithProgress(
    jobId: string,
    request: ExecuteRequest,
    onEvent: (event: BuildProgressEvent) => void,
    onError?: (error: Error) => void,
    onComplete?: () => void
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/orchestration/plans/${jobId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
          Accept: 'text/event-stream'
        },
        body: JSON.stringify(request)
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

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          onComplete?.()
          break
        }

        buffer += decoder.decode(value, { stream: true })

        // Process SSE events
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data:')) {
            const data = line.slice(5).trim()
            if (data) {
              try {
                const raw = JSON.parse(data) as Record<string, unknown>
                const event = normalizeProgressEvent(raw)

                // Only log sensitive event details in non-production environments
                if (process.env.NODE_ENV !== 'production') {
                  console.log('[OrchestratorClient] Received SSE event:', {
                    type: event.eventType,
                    componentId: event.componentId,
                    componentName: event.componentName,
                    resourceUrl: event.resourceUrl,
                    azureUrl: event.azureUrl,
                    filesPublished: event.filesPublished,
                    message: event.message
                  })
                }
                onEvent(event)
              } catch (e) {
                console.error('[OrchestratorClient] Failed to parse SSE event:', e, data)
              }
            }
          }
        }
      }
    } catch (error) {
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
