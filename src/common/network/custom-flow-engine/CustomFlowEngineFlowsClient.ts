import type { FlowTemplate } from '@/common/network/flows/FlowTemplateClient'
import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'
import { RestClient } from '@/common/network/rest/RestClient'
import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'

type ApiResponse<T> = {
  status: 'success' | 'error'
  data: T
  count?: number
  totalCount?: number
  hasMore?: boolean
  limit?: number
  offset?: number
  message?: string
}

export interface FlowQueryMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface FlowQueryRequestBody {
  query: string
  sessionId?: string
  conversationHistory?: FlowQueryMessage[]
}

export interface FlowStreamEvent {
  type: string
  content?: string
  toolName?: string
  toolArgs?: Record<string, unknown> | string
  toolResult?: unknown
  stage?: string
  stageStatus?: 'running' | 'complete' | 'failed'
  stageData?: unknown
}

export type FlowTemplateListParams = {
  limit?: number
  offset?: number
  onlyLatest?: boolean
  includeDrafts?: boolean
  templateType?: 'TEMPLATE' | 'SELF_SERVICE'
  search?: string
  tags?: Record<string, string>
  tagFilters?: Record<string, string>
}

export function parseFlowStreamDataLine(line: string): FlowStreamEvent | null {
  const trimmedLine = line.trim()
  if (!trimmedLine.startsWith('data:')) return null
  const jsonPayload = trimmedLine.slice(5).trim()
  if (jsonPayload === '' || jsonPayload === '[DONE]') return null

  try {
    return JSON.parse(jsonPayload) as FlowStreamEvent
  } catch {
    return null
  }
}

export class CustomFlowEngineFlowsClient extends RestClient {
  readonly agentic = {
    sendFlowQuery: (body: FlowQueryRequestBody) => this.sendFlowQuery(body),
    parseFlowStreamDataLine
  }

  readonly templates = {
    getTemplates: () => this.getTemplates(),
    getTemplatesList: (params?: FlowTemplateListParams) => this.getTemplatesList(params),
    getTemplate: (id: string) => this.getTemplate(id),
    createTemplate: (template: Omit<FlowTemplate, 'id'>) => this.createTemplate(template),
    updateTemplate: (id: string, template: Partial<FlowTemplate>) => this.updateTemplate(id, template),
    deleteTemplate: (id: string) => this.deleteTemplate(id),
    publishTemplate: (id: string) => this.publishTemplate(id),
    saveDraft: (template: Omit<FlowTemplate, 'id'>) => this.saveDraft(template),
    getDrafts: () => this.getDrafts(),
    getTemplateWithMetadata: (id: string) => this.getTemplateWithMetadata(id),
    executeWorkflow: (
      id: string,
      params: {
        initiator: string
        context?: any
        runtimeAssignments?: any
        inputValues?: any
        runtimeParameters?: any
      }
    ) => this.executeWorkflow(id, params),
    executeDynamicTemplate: (params: {
      templateDefinition: Omit<FlowTemplate, 'id'>
      initiatorId: string
      stepAssignments?: any
    }) => this.executeDynamicTemplate(params)
  }

  constructor() {
    super(CUSTOM_FLOW_ENGINE_API_URL, {})
  }

  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {}
    }

    this.headers.Authorization = setAccessTokenToAuthorizationHeader(accessToken)
  }

  async sendFlowQuery(body: FlowQueryRequestBody): Promise<ReadableStream<Uint8Array> | null> {
    const response = await fetch(`${this.baseUrl}/templates/query-agentic`, {
      method: 'POST',
      credentials: 'same-origin',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      let responseDetail = ''
      try {
        responseDetail = await response.text()
      } catch {
        responseDetail = ''
      }

      const detailSuffix = responseDetail ? `; ${responseDetail}` : ''
      throw new Error(`Flow query failed: ${response.status} ${response.statusText}${detailSuffix}`)
    }

    return response.body ?? null
  }

  async getTemplates(): Promise<FlowTemplate[]> {
    const response = await this.get<ApiResponse<FlowTemplate[]>>('/templates/?limit=50')
    return response.data
  }

  async getTemplatesList(params?: FlowTemplateListParams): Promise<{
    templates: FlowTemplate[]
    totalCount: number
    hasMore: boolean
    limit: number
    offset: number
  }> {
    const searchParams = new URLSearchParams()

    if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString())
    if (params?.offset !== undefined) searchParams.append('offset', params.offset.toString())
    if (params?.onlyLatest !== undefined) searchParams.append('onlyLatest', params.onlyLatest.toString())
    if (params?.includeDrafts !== undefined) searchParams.append('includeDrafts', params.includeDrafts.toString())
    if (params?.templateType) searchParams.append('templateType', params.templateType)
    if (params?.search?.trim()) searchParams.append('search', params.search.trim())

    const tagFilters = params?.tags || params?.tagFilters
    if (tagFilters) {
      Object.entries(tagFilters).forEach(([key, value]) => {
        if (!key) return
        if (value === undefined || value === null) return
        const normalizedKey = key.startsWith('tag.') ? key.slice(4) : key
        searchParams.append(`tag.${normalizedKey}`, String(value))
      })
    }

    const path = searchParams.toString() ? `/templates/list?${searchParams.toString()}` : '/templates/list'
    const response = await this.get<ApiResponse<FlowTemplate[]>>(path)
    const limit = response.limit ?? params?.limit ?? 50
    const offset = response.offset ?? params?.offset ?? 0
    const totalCount = response.totalCount ?? response.data.length

    return {
      templates: response.data,
      totalCount,
      hasMore: response.hasMore ?? offset + response.data.length < totalCount,
      limit,
      offset
    }
  }

  async getTemplate(id: string): Promise<FlowTemplate> {
    const response = await this.get<ApiResponse<FlowTemplate>>(`/templates/${id}`)
    return response.data
  }

  async createTemplate(template: Omit<FlowTemplate, 'id'>): Promise<FlowTemplate> {
    const response = await this.post<ApiResponse<FlowTemplate>>('/templates/', template)
    return response.data
  }

  async updateTemplate(id: string, template: Partial<FlowTemplate>): Promise<FlowTemplate> {
    const response = await this.put<ApiResponse<FlowTemplate>>(`/templates/${id}`, template)
    return response.data
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.delete(`/templates/${id}`)
  }

  async publishTemplate(id: string): Promise<FlowTemplate> {
    const response = await this.post<ApiResponse<FlowTemplate>>(`/templates/${id}/publish`)
    return response.data
  }

  async saveDraft(template: Omit<FlowTemplate, 'id'>): Promise<FlowTemplate> {
    const response = await this.post<ApiResponse<FlowTemplate>>('/templates/drafts', template)
    return response.data
  }

  async getDrafts(): Promise<FlowTemplate[]> {
    const response = await this.get<ApiResponse<FlowTemplate[]>>('/templates/drafts')
    return response.data
  }

  async getTemplateWithMetadata(id: string): Promise<{
    template: FlowTemplate
    metadata: {
      createdAt: string
      updatedAt?: string
      isDraft: boolean
      originalTemplate?: FlowTemplate
      workflowDefinition?: any
    }
  }> {
    const response = await this.get<ApiResponse<any>>(`/templates/${id}/metadata`)
    return response.data
  }

  async executeWorkflow(
    id: string,
    params: {
      initiator: string
      context?: any
      runtimeAssignments?: any
      inputValues?: any
      runtimeParameters?: any
    }
  ): Promise<{
    workflowId: string
    templateId: string
    workflowName: string
    input: any
  }> {
    const response = await this.post<ApiResponse<any>>(`/templates/${id}/execute`, params)
    return response.data
  }

  async executeDynamicTemplate(params: {
    templateDefinition: Omit<FlowTemplate, 'id'>
    initiatorId: string
    stepAssignments?: any
  }): Promise<{
    workflowId: string
    workflowName: string
    version: number
    tags?: any
    isDynamic: true
    executionInput: any
  }> {
    const response = await this.post<ApiResponse<any>>('/templates/execute-dynamic', params)
    return response.data
  }
}
