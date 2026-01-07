import { RestClient } from '../rest/RestClient'
import { env } from '@/common/env/EnvUtils'
import { FlowTags } from '@/business-apps/flow/types'

// Flow template types (matching backend)
export enum FlowStepType {
  TASK = 'TASK',
  APPROVAL = 'APPROVAL',
  INFORMATION = 'INFORMATION',
  ACKNOWLEDGE = 'ACKNOWLEDGE'
}

export enum InputType {
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  SELECT = 'SELECT',
  MULTISELECT = 'MULTISELECT',
  CHECKBOX = 'CHECKBOX',
  RADIO = 'RADIO',
  DATE = 'DATE',
  DATETIME = 'DATETIME',
  NUMBER = 'NUMBER',
  FILE = 'FILE',
  SIGNATURE = 'SIGNATURE'
}

export enum AssignmentMode {
  CLAIM = 'CLAIM',
  ASSIGN = 'ASSIGN'
}

export interface InputOption {
  value: string
  label: string
}

export interface InputBlock {
  type: InputType
  name: string
  label: string
  required?: boolean
  options?: InputOption[]
}

export interface Link {
  name: string
  url: string
  type?: string
}

export interface AssignmentTarget {
  users?: string[]
  organizationalUnits?: string[]
  matrixTeams?: string[]
  companies?: string[]
  siteLocations?: string[]
  costCenters?: string[]
  capabilities?: string[]
}

export interface TaskAssignment {
  targets: AssignmentTarget | null // Required in backend - null indicates runtime assignment
  assignmentMode: AssignmentMode // Required - CLAIM or ASSIGN mode
  allowReassignment?: boolean
}

export interface FlowStep {
  id?: string
  type: FlowStepType
  title: string
  message?: string
  dueInMinutes?: number
  dueDate?: string // ISO date string for specific due date
  form?: InputBlock[] // Backend uses 'form'
  inputs?: InputBlock[] // Legacy field for backward compatibility
  links?: Link[]
  assignment: TaskAssignment // Required to match backend API
}

// Simplified init step for self-service flows
export interface InitStep {
  title: string
  message?: string
  links?: Link[]
  form?: InputBlock[] // Backend uses 'form'
  inputs?: InputBlock[] // Legacy field for backward compatibility
}

export interface FlowTemplate {
  id?: string
  type: 'TEMPLATE' | 'SELF_SERVICE'
  name: string
  description?: string
  version: number // Required to match backend API
  steps: FlowStep[]

  // Self-service specific: simplified to just the init step
  initStep?: InitStep

  // Tagging system for metadata-based querying
  tags?: FlowTags
}

/**
 * Backend API response format
 */
interface ApiResponse<T> {
  status: 'success' | 'error'
  data: T
  count?: number
  totalCount?: number
  message?: string
}

/**
 * Client for Flow Template API operations
 */
export class FlowTemplateClient extends RestClient {
  constructor(accessToken: string) {
    // Use our custom flow engine API endpoint
    const baseUrl = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || env('NEXT_PUBLIC_BASE_URL') + '/flow-engine'
    super(`${baseUrl}/api/templates`, {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    })
  }

  /**
   * Get all flow templates
   */
  async getTemplates(): Promise<FlowTemplate[]> {
    const response = await this.get<ApiResponse<FlowTemplate[]>>('/?limit=50')
    return response.data
  }

  /**
   * Get templates with pagination and search support
   * Maps to templateController.getAllTemplatesController in flow engine
   */
  async getTemplatesList(params?: {
    limit?: number
    offset?: number
    onlyLatest?: boolean
    includeDrafts?: boolean
    templateType?: 'TEMPLATE' | 'SELF_SERVICE'
    search?: string
    tagFilters?: Record<string, string>
  }): Promise<{
    templates: FlowTemplate[]
    totalCount: number
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
    if (params?.tagFilters) {
      Object.entries(params.tagFilters).forEach(([key, value]) => {
        searchParams.append(`tagFilters[${key}]`, value)
      })
    }

    const url = searchParams.toString() ? `/?${searchParams.toString()}` : '/'
    const response = await this.get<ApiResponse<FlowTemplate[]>>(url)

    return {
      templates: response.data,
      totalCount: response.totalCount || response.data.length,
      limit: params?.limit || 20,
      offset: params?.offset || 0
    }
  }

  /**
   * Get a specific flow template by ID
   */
  async getTemplate(id: string): Promise<FlowTemplate> {
    const response = await this.get<ApiResponse<FlowTemplate>>(`/${id}`)
    return response.data
  }

  /**
   * Create a new flow template
   */
  async createTemplate(template: Omit<FlowTemplate, 'id'>): Promise<FlowTemplate> {
    const response = await this.post<ApiResponse<FlowTemplate>>('/', template)
    return response.data
  }

  /**
   * Update an existing flow template
   */
  async updateTemplate(id: string, template: Partial<FlowTemplate>): Promise<FlowTemplate> {
    const response = await this.put<ApiResponse<FlowTemplate>>(`/${id}`, template)
    return response.data
  }

  /**
   * Delete a flow template
   */
  async deleteTemplate(id: string): Promise<void> {
    await this.delete(`/${id}`)
  }

  /**
   * Publish a flow template
   */
  async publishTemplate(id: string): Promise<FlowTemplate> {
    const response = await this.post<ApiResponse<FlowTemplate>>(`/${id}/publish`)
    return response.data
  }

  /**
   * Save template as draft
   */
  async saveDraft(template: Omit<FlowTemplate, 'id'>): Promise<FlowTemplate> {
    const response = await this.post<ApiResponse<FlowTemplate>>('/drafts', template)
    return response.data
  }

  /**
   * Get all draft templates
   */
  async getDrafts(): Promise<FlowTemplate[]> {
    const response = await this.get<ApiResponse<FlowTemplate[]>>('/drafts')
    return response.data
  }

  /**
   * Get template with metadata
   */
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
    const response = await this.get<ApiResponse<any>>(`/${id}/metadata`)
    return response.data
  }

  /**
   * Execute/Launch a workflow from a template
   */
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
    const response = await this.post<ApiResponse<any>>(`/${id}/execute`, params)
    return response.data
  }
}
