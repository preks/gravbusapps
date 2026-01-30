/**
 * Case API Client
 *
 * Service for interacting with the Custom Flow Engine Cases API
 * Backend endpoint: /api/cases on cflow engine (default: localhost:3002)
 */

import {
  Case,
  CaseFilters,
  CaseAnalytics,
  CaseActivity,
  CreateCaseRequest,
  UpdateCaseRequest,
  AddFlowRequest,
  LinkedFlow,
  SearchFlowResult
} from '../types'

// Get the cflow engine URL from env
const CFLOW_ENGINE_URL =
  import.meta.env.VITE_CFLOW_ENGINE_URL ||
  import.meta.env.NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL ||
  'http://localhost:3000'

export class CaseApiClient {
  private baseUrl: string
  private accessToken: string

  constructor(baseUrl: string | undefined, accessToken: string) {
    // Use provided baseUrl or fallback to environment variable
    const engineUrl = baseUrl && baseUrl !== window.location.origin ? baseUrl : CFLOW_ENGINE_URL
    this.baseUrl = `${engineUrl}/api/cases`
    this.accessToken = accessToken
  }

  /**
   * Get authorization headers
   */
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.accessToken}`
    }
  }

  /**
   * Handle API errors and unwrap response
   * API returns { status: "success", data: { ... } } or { status: "error", message: "..." }
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `API Error: ${response.status} ${response.statusText}`

      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.message || errorJson.error || errorMessage
      } catch {
        // Use default error message
      }

      console.error('API Error:', errorMessage)
      throw new Error(errorMessage)
    }

    const json = await response.json()

    // Unwrap the { status, data } envelope if present
    if (json && json.status === 'success' && json.data) {
      return json.data as T
    }

    // Handle error in envelope
    if (json && json.status === 'error') {
      throw new Error(json.message || 'API Error')
    }

    // Return as-is if no envelope
    return json as T
  }

  /**
   * Create a new case
   *
   * Backend DTO expects: { initiator, title?, metadata?, assignment?, correlationId?, tags? }
   */
  async createCase(data: CreateCaseRequest): Promise<{ caseId: string }> {
    // Transform frontend request to backend DTO format
    const backendPayload = {
      initiator: data.initiator || 'system',
      title: data.metadata?.title || 'New Case',
      correlationId: data.correlationId,
      // Send full metadata object to backend
      metadata: {
        title: data.metadata?.title || 'New Case',
        description: data.metadata?.description || '',
        priority: data.metadata?.priority || 'medium',
        status: data.metadata?.status || 'open'
      },
      // Send tags as object with app field
      tags: data.tags
    }

    console.log('[CaseApiClient] Creating case:', { url: this.baseUrl, payload: backendPayload })

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(backendPayload)
    })

    return this.handleResponse<{ success: boolean; caseId: string; message: string }>(response).then(res => ({
      caseId: res.caseId
    }))
  }

  /**
   * Format tags from object to array
   * Converts { app: "AppCatalog:1:SER" } to ["app:AppCatalog:1:SER"]
   * Also includes metadata as tags: priority:high, status:open
   */
  private formatTags(tags?: Record<string, string>, metadata?: CreateCaseRequest['metadata']): string[] {
    const result: string[] = []

    if (tags) {
      Object.entries(tags).forEach(([key, value]) => {
        result.push(`${key}:${value}`)
      })
    }

    // Store metadata as tags for now (until backend supports metadata field)
    if (metadata) {
      if (metadata.priority) result.push(`priority:${metadata.priority}`)
      if (metadata.status) result.push(`status:${metadata.status}`)
      if (metadata.description) result.push(`description:${metadata.description.substring(0, 100)}`)
    }

    return result
  }

  /**
   * Get case by ID
   */
  async getCaseById(caseId: string): Promise<Case> {
    const response = await fetch(`${this.baseUrl}/${caseId}`, {
      method: 'GET',
      headers: this.getHeaders()
    })

    const data = await this.handleResponse<{ success: boolean; caseId: string; state: any }>(response)

    // Transform API response to Case interface
    return {
      caseId: data.caseId,
      state: {
        ...data.state,
        metadata: this.parseTagsToMetadata(data.state)
      },
      createdAt: data.state?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  /**
   * Parse tags back to metadata object
   */
  private parseTagsToMetadata(state: any): any {
    const metadata: any = {}
    const tags = state?.tags || []

    tags.forEach((tag: string) => {
      const [key, ...valueParts] = tag.split(':')
      const value = valueParts.join(':')

      if (key === 'priority') metadata.priority = value
      else if (key === 'status') metadata.status = value
      else if (key === 'description') metadata.description = value
    })

    // Also check for title in workflow input
    if (state?.title) metadata.title = state.title

    return metadata
  }

  /**
   * Get list of cases with filters
   */
  async getCasesList(filters: CaseFilters): Promise<{ cases: Case[]; total: number }> {
    const params = new URLSearchParams()

    // Add tag filters as comma-separated string
    if (filters.tags) {
      const tagStrings = Object.entries(filters.tags).map(([key, value]) => `${key}:${value}`)
      if (tagStrings.length > 0) {
        params.append('tags', tagStrings.join(','))
      }
    }

    // Add pagination
    params.append('limit', '100')
    params.append('offset', '0')

    console.log('[CaseApiClient] Fetching cases list:', { url: `${this.baseUrl}?${params.toString()}` })

    const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
      method: 'GET',
      headers: this.getHeaders()
    })

    const data = await this.handleResponse<{ success: boolean; cases: any[]; total: number }>(response)

    // Transform backend response to Case interface
    const cases: Case[] = data.cases.map(c => ({
      caseId: c.caseId,
      state: {
        linkedFlows: c.state?.linkedFlows || [],
        createdAt: c.createdAt,
        metadata: {
          title: c.title,
          status: this.parseStatusFromTags(c.tags),
          priority: this.parsePriorityFromTags(c.tags)
        }
      },
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    }))

    return { cases, total: data.total }
  }

  /**
   * Parse status from tags array
   */
  private parseStatusFromTags(tags: string[]): any {
    if (!tags) return 'open'
    const statusTag = tags.find(t => t.startsWith('status:'))
    return statusTag ? statusTag.replace('status:', '') : 'open'
  }

  /**
   * Parse priority from tags array
   */
  private parsePriorityFromTags(tags: string[]): any {
    if (!tags) return 'medium'
    const priorityTag = tags.find(t => t.startsWith('priority:'))
    return priorityTag ? priorityTag.replace('priority:', '') : 'medium'
  }

  /**
   * Update case metadata
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async updateCase(caseId: string, data: UpdateCaseRequest): Promise<Case> {
    // Note: API doesn't have update endpoint yet
    console.warn('[CaseApiClient] Case update endpoint not implemented in backend yet')
    throw new Error('Update case not implemented')
  }

  /**
   * Add flow to case
   *
   * Backend DTO expects: { templateId, initiator?, inputValues?, correlationIdOverride? }
   */
  async addFlowToCase(caseId: string, data: AddFlowRequest): Promise<{ workflowId: string }> {
    const backendPayload = {
      templateId: data.templateId,
      initiator: data.initiator || 'system',
      inputValues: data.inputValues || {}
    }

    console.log('[CaseApiClient] Adding flow to case:', { caseId, payload: backendPayload })

    const response = await fetch(`${this.baseUrl}/${caseId}/flows`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(backendPayload)
    })

    return this.handleResponse<{ success: boolean; workflowId: string; message: string }>(response).then(res => ({
      workflowId: res.workflowId
    }))
  }

  /**
   * Remove flow from case (unlink only)
   */
  async removeFlowFromCase(caseId: string, workflowId: string): Promise<void> {
    console.log('[CaseApiClient] Removing flow from case:', { caseId, workflowId })

    const response = await fetch(`${this.baseUrl}/${caseId}/flows/${workflowId}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    })

    await this.handleResponse<{ success: boolean; message: string }>(response)
  }

  /**
   * Get linked flows for a case
   */
  async getLinkedFlows(caseId: string): Promise<LinkedFlow[]> {
    const response = await fetch(`${this.baseUrl}/${caseId}/flows`, {
      method: 'GET',
      headers: this.getHeaders()
    })

    const data = await this.handleResponse<{ success: boolean; caseId: string; flows: LinkedFlow[]; count: number }>(
      response
    )
    return data.flows
  }

  /**
   * Complete case
   */
  async completeCase(caseId: string): Promise<void> {
    console.log('[CaseApiClient] Completing case:', { caseId })

    const response = await fetch(`${this.baseUrl}/${caseId}/complete`, {
      method: 'POST',
      headers: this.getHeaders()
    })

    await this.handleResponse<{ success: boolean; message: string }>(response)
  }

  /**
   * Search for running flows that can be linked to a case
   */
  async searchFlows(
    options: {
      search?: string
      status?: string
      templateId?: string
      limit?: number
      offset?: number
    } = {}
  ): Promise<{ flows: SearchFlowResult[]; total: number }> {
    const params = new URLSearchParams()

    if (options.search) params.append('search', options.search)
    if (options.status) params.append('status', options.status)
    if (options.templateId) params.append('templateId', options.templateId)
    params.append('limit', String(options.limit || 20))
    params.append('offset', String(options.offset || 0))

    console.log('[CaseApiClient] Searching flows:', { url: `${this.baseUrl}/flows/search?${params.toString()}` })

    const response = await fetch(`${this.baseUrl}/flows/search?${params.toString()}`, {
      method: 'GET',
      headers: this.getHeaders()
    })

    const data = await this.handleResponse<{ success: boolean; flows: any[]; total: number }>(response)
    return { flows: data.flows, total: data.total }
  }

  /**
   * Link an existing flow to a case
   */
  async linkExistingFlow(caseId: string, workflowId: string, userId?: string): Promise<void> {
    console.log('[CaseApiClient] Linking existing flow to case:', { caseId, workflowId })

    const response = await fetch(`${this.baseUrl}/${caseId}/flows/link`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ workflowId, userId })
    })

    await this.handleResponse<{ success: boolean; message: string }>(response)
  }

  /**
   * Get case audit log
   * Returns chronological list of all actions/changes on a case
   */
  async getCaseAuditLog(
    caseId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{
    activities: CaseActivity[]
    total: number
  }> {
    console.log('[CaseApiClient] Fetching case audit log:', { caseId, options })

    const params = new URLSearchParams()
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.offset) params.append('offset', options.offset.toString())

    const url = `${this.baseUrl}/${caseId}/audit${params.toString() ? `?${params}` : ''}`

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    })

    const data = await this.handleResponse<{
      activities: CaseActivity[]
      total: number
    }>(response)

    return data
  }

  /**
   * Get case analytics
   * Calculates analytics from the cases list
   */
  async getCaseAnalytics(filters: { tags: Record<string, string> }): Promise<CaseAnalytics> {
    try {
      // Fetch all cases to calculate analytics
      const { cases, total } = await this.getCasesList({ tags: filters.tags })

      // Calculate status distribution
      const statusDistribution: Record<string, number> = {
        open: 0,
        in_progress: 0,
        blocked: 0,
        completed: 0,
        cancelled: 0
      }

      let activeCases = 0
      let completedCases = 0
      let casesRequiringAttention = 0

      cases.forEach(c => {
        const status = c.state.metadata?.status || 'open'
        statusDistribution[status] = (statusDistribution[status] || 0) + 1

        // Count active cases (not completed/cancelled)
        if (status !== 'completed' && status !== 'cancelled') {
          activeCases++
        }

        // Count completed
        if (status === 'completed') {
          completedCases++
        }

        // Cases requiring attention: blocked or has no linked flows
        if (status === 'blocked' || (c.state.linkedFlows?.length || 0) === 0) {
          casesRequiringAttention++
        }
      })

      return {
        totalCases: total,
        activeCases,
        completedCases,
        averageCompletionTime: 0, // Would need timestamp tracking
        casesRequiringAttention,
        statusDistribution: statusDistribution as any
      }
    } catch (error) {
      console.error('[CaseApiClient] Failed to get analytics:', error)
      // Return zeros on error
      return {
        totalCases: 0,
        activeCases: 0,
        completedCases: 0,
        averageCompletionTime: 0,
        casesRequiringAttention: 0,
        statusDistribution: {
          open: 0,
          in_progress: 0,
          blocked: 0,
          completed: 0,
          cancelled: 0
        }
      }
    }
  }
}
