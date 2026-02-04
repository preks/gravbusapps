/**
 * Orchestrator API Client
 *
 * Client for interacting with the AI Orchestrator endpoints in prompt-manager.
 * Handles build plan analysis and execution with SSE progress streaming.
 */

import { env } from '@/common/env/EnvUtils'
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

/**
 * Get the base URL for prompt-manager service
 */
function getBaseUrl(): string {
  return env('NEXT_PUBLIC_PROMPT_MANAGER_API_URL') || 'https://newwork-dev.newwork.com/prompt-manager'
}

/**
 * Parse error response from the API
 * Handles both simple string errors and complex validation error structures
 */
function parseErrorResponse(errorData: any, fallbackMessage: string): string {
  if (!errorData || !errorData.detail) {
    return fallbackMessage
  }

  const detail = errorData.detail

  // If detail is a string, return it directly
  if (typeof detail === 'string') {
    return detail
  }

  // If detail is an object with message and errors array
  if (typeof detail === 'object' && detail.message && Array.isArray(detail.errors)) {
    const errorList = detail.errors.join('\n• ')
    return `${detail.message}:\n• ${errorList}`
  }

  // If detail is an object with just errors array
  if (typeof detail === 'object' && Array.isArray(detail.errors)) {
    return detail.errors.join('\n• ')
  }

  // If detail is an object with just message
  if (typeof detail === 'object' && detail.message) {
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
    this.baseUrl = getBaseUrl()
    this.accessToken = accessToken
  }

  /**
   * Analyze a prompt and generate a build plan
   */
  async analyze(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/orchestrate/analyze`, {
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

    return response.json()
  }

  /**
   * Execute a build plan and return an EventSource for progress streaming
   * Note: EventSource doesn't support custom headers, so auth must be handled
   * via cookies or session. For custom headers, use executeWithProgress instead.
   */
  createExecutionStream(jobId: string): EventSource {
    const url = new URL(`${this.baseUrl}/api/v1/orchestrate/execute/${jobId}`)
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
      const response = await fetch(`${this.baseUrl}/api/v1/orchestrate/execute/${jobId}`, {
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
                const event = JSON.parse(data) as BuildProgressEvent
                onEvent(event)
              } catch (e) {
                console.error('Failed to parse SSE event:', e, data)
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
    const response = await fetch(`${this.baseUrl}/api/v1/orchestrate/status/${jobId}`, {
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

    return response.json()
  }

  /**
   * Get the full build plan
   */
  async getPlan(jobId: string): Promise<BuildPlan> {
    const response = await fetch(`${this.baseUrl}/api/v1/orchestrate/plan/${jobId}`, {
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

    return response.json()
  }

  /**
   * Update a build plan before execution
   */
  async updatePlan(jobId: string, request: UpdatePlanRequest): Promise<BuildPlan> {
    const response = await fetch(`${this.baseUrl}/api/v1/orchestrate/plan/${jobId}`, {
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

    return response.json()
  }

  /**
   * Refine a build plan with natural language feedback
   */
  async refinePlan(jobId: string, request: RefinePlanRequest): Promise<AnalyzeResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/orchestrate/refine/${jobId}`, {
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

    return response.json()
  }

  /**
   * Cancel and delete a build plan
   */
  async cancelBuild(jobId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/v1/orchestrate/plan/${jobId}`, {
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
