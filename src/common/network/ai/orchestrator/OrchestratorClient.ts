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
  BuildPlan,
  BuildJobStatus,
  BuildProgressEvent
} from '@/business-apps/core/create/apps/create-workspace/types/orchestrator'

/**
 * Get the base URL for prompt-manager service
 */
function getBaseUrl(): string {
  return env('NEXT_PUBLIC_PROMPT_MANAGER_API_URL') || 'https://newwork-dev.newwork.com/prompt-manager'
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
      throw new Error(errorData.detail || `Analysis failed: ${response.statusText}`)
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
        throw new Error(errorData.detail || `Execution failed: ${response.statusText}`)
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
      throw new Error(errorData.detail || `Failed to get status: ${response.statusText}`)
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
      throw new Error(errorData.detail || `Failed to get plan: ${response.statusText}`)
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
      throw new Error(errorData.detail || `Failed to cancel: ${response.statusText}`)
    }
  }
}

// Export singleton factory
export function createOrchestratorClient(accessToken: string): OrchestratorClient {
  return new OrchestratorClient(accessToken)
}
