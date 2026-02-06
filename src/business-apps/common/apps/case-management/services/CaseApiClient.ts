/**
 * Case API Client
 *
 * Service for interacting with the Custom Flow Engine Cases API
 * Backend endpoint: /api/cases on cflow engine
 */

import {
  Case,
  CaseFilters,
  CaseAnalytics,
  CaseActivity,
  CreateCaseRequest,
  AddFlowRequest,
  LinkedFlow,
  SearchFlowResult,
  LinkedEntity,
  LinkedCase
} from '../types'
import { env } from '@/common/env/EnvUtils'

// Base URL for the custom flow engine API - same pattern as ConductorWorkflowEngineAdapter
const API_BASE =
  (env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine') + '/api'

export class CaseApiClient {
  private baseUrl: string
  private accessToken: string

  constructor(baseUrl: string | undefined, accessToken: string) {
    // Use provided baseUrl or fallback to environment variable
    // baseUrl is ignored now - we always use the centralized API_BASE
    void baseUrl
    this.baseUrl = `${API_BASE}/cases`
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
        status: data.metadata?.status || 'open',
        assignedTo: data.metadata?.assignedTo || undefined,
        dueDate: data.metadata?.dueDate || undefined
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
    // Merge backend metadata with parsed tags (backend metadata takes precedence)
    const parsedMetadata = this.parseTagsToMetadata(data.state)
    const backendMetadata = data.state?.metadata || {}

    return {
      caseId: data.caseId,
      state: {
        ...data.state,
        metadata: {
          ...parsedMetadata,
          ...backendMetadata // Backend metadata (title, description) takes precedence
        }
      },
      createdAt: data.state?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  /**
   * Update case metadata (title, description, priority, status, assignedTo)
   */
  async updateCase(
    caseId: string,
    updates: {
      title?: string
      description?: string
      priority?: 'low' | 'medium' | 'high' | 'critical'
      status?: 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed'
      assignedTo?: string
    }
  ): Promise<void> {
    console.log('[CaseApiClient] Updating case:', { caseId, updates })

    const response = await fetch(`${this.baseUrl}/${caseId}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(updates)
    })

    await this.handleResponse<{ success: boolean; message: string }>(response)
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
  async getCasesList(filters: CaseFilters & { includeDeleted?: boolean }): Promise<{ cases: Case[]; total: number }> {
    const params = new URLSearchParams()

    // Add tag filters as comma-separated string
    if (filters.tags) {
      const tagStrings = Object.entries(filters.tags).map(([key, value]) => `${key}:${value}`)
      if (tagStrings.length > 0) {
        params.append('tags', tagStrings.join(','))
      }
    }

    // Add includeDeleted flag
    if (filters.includeDeleted) {
      params.append('includeDeleted', 'true')
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
          // Use metadata from backend state, fallback to parsed tags for backward compatibility
          title: c.state?.metadata?.title || c.title,
          description: c.state?.metadata?.description,
          status: c.state?.metadata?.status || this.parseStatusFromTags(c.tags),
          priority: c.state?.metadata?.priority || this.parsePriorityFromTags(c.tags),
          assignedTo: c.state?.metadata?.assignedTo,
          dueDate: c.state?.metadata?.dueDate,
          linkedEntities: c.state?.metadata?.linkedEntities || [],
          notes: c.state?.metadata?.notes || []
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
   * Get notes for a case
   */
  async getCaseNotes(caseId: string): Promise<
    {
      id: string
      content: string
      visibility: 'internal' | 'external'
      createdBy: string
      createdAt: string
    }[]
  > {
    console.log('[CaseApiClient] Getting notes for case:', caseId)

    const response = await fetch(`${this.baseUrl}/${caseId}/notes`, {
      method: 'GET',
      headers: this.getHeaders()
    })

    const data = await this.handleResponse<{
      success: boolean
      caseId: string
      notes: Array<{
        id: string
        content: string
        visibility: 'internal' | 'external'
        createdBy: string
        createdAt: string
      }>
      total: number
    }>(response)

    return data.notes
  }

  /**
   * Add a note to a case
   */
  async addNoteToCase(
    caseId: string,
    note: {
      content: string
      visibility: 'internal' | 'external'
      createdBy: string
    }
  ): Promise<{ noteId: string }> {
    console.log('[CaseApiClient] Adding note to case:', { caseId, note })

    const response = await fetch(`${this.baseUrl}/${caseId}/notes`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(note)
    })

    const data = await this.handleResponse<{ success: boolean; noteId: string; message: string }>(response)
    return { noteId: data.noteId }
  }

  /**
   * Delete a note from a case
   */
  async deleteNoteFromCase(caseId: string, noteId: string): Promise<void> {
    console.log('[CaseApiClient] Deleting note from case:', { caseId, noteId })

    const response = await fetch(`${this.baseUrl}/${caseId}/notes/${noteId}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    })

    await this.handleResponse<{ success: boolean; message: string }>(response)
  }

  /**
   * Update a note in a case
   */
  async updateNoteInCase(
    caseId: string,
    noteId: string,
    updates: {
      content?: string
      visibility?: 'internal' | 'external'
    }
  ): Promise<void> {
    console.log('[CaseApiClient] Updating note in case:', { caseId, noteId, updates })

    const response = await fetch(`${this.baseUrl}/${caseId}/notes/${noteId}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(updates)
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
   * Soft delete a case
   * @param caseId - The case ID to delete
   * @param deletedBy - User ID performing the deletion
   * @param terminateFlows - Whether to terminate all linked running flows
   */
  async deleteCase(caseId: string, deletedBy?: string, terminateFlows: boolean = false): Promise<void> {
    console.log('[CaseApiClient] Deleting case:', { caseId, deletedBy, terminateFlows })

    const response = await fetch(`${this.baseUrl}/${caseId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
      body: JSON.stringify({
        deletedBy: deletedBy || 'system',
        terminateFlows
      })
    })

    await this.handleResponse<{ success: boolean; message: string }>(response)
  }

  /**
   * Restore a soft-deleted case
   * @param caseId - The case ID to restore
   * @param userId - User ID performing the restore
   */
  async restoreCase(caseId: string, userId?: string): Promise<void> {
    console.log('[CaseApiClient] Restoring case:', { caseId, userId })

    const response = await fetch(`${this.baseUrl}/${caseId}/restore`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        ...(userId && { 'x-user-id': userId })
      }
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

  /**
   * Get linked entities for a case
   */
  async getLinkedEntities(caseId: string): Promise<LinkedEntity[]> {
    const response = await fetch(`${this.baseUrl}/${caseId}/entities`, {
      method: 'GET',
      headers: this.getHeaders()
    })

    const result = await this.handleResponse<{ entities: LinkedEntity[] }>(response)
    return result.entities || []
  }

  /**
   * Link an entity to a case
   */
  async linkEntity(caseId: string, entity: LinkedEntity, linkedBy?: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${caseId}/entities`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        type: entity.type,
        id: entity.id,
        name: entity.name,
        metadata: entity.metadata,
        linkedBy
      })
    })

    await this.handleResponse<{ success: boolean }>(response)
  }

  /**
   * Unlink an entity from a case
   */
  async unlinkEntity(caseId: string, entityId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${caseId}/entities/${entityId}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    })

    await this.handleResponse<{ success: boolean }>(response)
  }

  // ============================================
  // LINKED CASES
  // ============================================

  /**
   * Get linked cases (parent, children, related)
   */
  async getLinkedCases(caseId: string): Promise<LinkedCase[]> {
    const response = await fetch(`${this.baseUrl}/${caseId}/linked-cases`, {
      method: 'GET',
      headers: this.getHeaders()
    })

    const data = await this.handleResponse<{ linkedCases: LinkedCase[] }>(response)
    return data.linkedCases || []
  }

  /**
   * Link a case to another case
   * @param caseId Source case ID
   * @param targetCaseId Target case ID to link
   * @param relationship Relationship type: 'parent', 'child', or 'related'
   * @param linkedBy User ID performing the link
   */
  async linkCase(
    caseId: string,
    targetCaseId: string,
    relationship: 'parent' | 'child' | 'related',
    linkedBy?: string
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${caseId}/linked-cases`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        targetCaseId,
        relationship,
        linkedBy
      })
    })

    await this.handleResponse<{ success: boolean }>(response)
  }

  /**
   * Unlink a case from another case (bidirectional removal)
   */
  async unlinkCase(caseId: string, targetCaseId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${caseId}/linked-cases/${targetCaseId}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    })

    await this.handleResponse<{ success: boolean }>(response)
  }

  /**
   * Search cases for linking (exclude current case and already linked cases)
   * @param excludeCaseId Case ID to exclude from results
   * @param excludeLinkedCaseIds Array of case IDs already linked to exclude
   * @param query Search query for title
   * @param tags Optional tag filter
   */
  async searchCasesForLinking(
    excludeCaseId: string,
    excludeLinkedCaseIds: string[],
    query?: string,
    tags?: Record<string, string>
  ): Promise<Case[]> {
    // Build query params
    const params = new URLSearchParams()
    if (tags && Object.keys(tags).length > 0) {
      params.set(
        'tags',
        Object.entries(tags)
          .map(([k, v]) => `${k}:${v}`)
          .join(',')
      )
    }
    params.set('limit', '50')

    const url = `${this.baseUrl}?${params.toString()}`
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    })

    const data = await this.handleResponse<{ cases: Case[] }>(response)
    const allCases = data.cases || []

    // Filter out current case and already linked cases
    const excludeIds = new Set([excludeCaseId, ...excludeLinkedCaseIds])
    let filteredCases = allCases.filter(c => !excludeIds.has(c.caseId))

    // If query provided, filter by title
    if (query && query.trim()) {
      const searchLower = query.toLowerCase()
      filteredCases = filteredCases.filter(
        c =>
          c.state?.metadata?.title?.toLowerCase().includes(searchLower) || c.caseId.toLowerCase().includes(searchLower)
      )
    }

    return filteredCases
  }
}
