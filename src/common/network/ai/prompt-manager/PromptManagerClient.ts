import { env } from '@/common/env/EnvUtils'
import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'
import { RestClient } from '@/common/network/rest/RestClient'

// --- Types (minimal, aligned with prompt-manager.openapi.json) ---
export interface Paging {
  limit: number
  offset: number
  totalRecords: number
}

export type PromptType = 'completion' | 'chat'

export interface PromptContent {
  template: string | null
  parameters: string[]
}

export interface PromptODM {
  _id?: string
  name: string
  created_at?: string
  description?: string
  type?: PromptType
  system_content?: PromptContent | null
  user_content: PromptContent
  tools?: string // comma-separated tool codes
  model: { id: string; collection: string }
  model_settings?: Record<string, unknown>
  response_schema?: Record<string, unknown> | null
  version: number
  workspace: { id: string; collection: string }
  revision_message?: string
}

export interface PromptPage {
  data: PromptODM[]
  paging: Paging
}

export interface WorkspaceODM {
  _id?: string
  name: string
  created_at?: string
  modified_at?: string
  default?: boolean
}

export interface WorkspacePage {
  data: WorkspaceODM[]
  paging: Paging
}

export interface WorkspaceDetails {
  name: string
  default?: boolean
}

export interface WorkspacePatchDetails {
  name?: string | null
  default?: boolean | null
}

export interface PromptDetails {
  description?: string
  type?: PromptType
  systemContent?: string | null
  userContent: string
  tools?: string[]
  modelId: string
  modelSettings?: Record<string, unknown>
  responseSchema?: Record<string, unknown> | null
  name: string
  workspaceId: string
}

export interface PromptPutDetails {
  description?: string
  type?: PromptType
  systemContent?: string | null
  userContent: string
  tools?: string[]
  modelId: string
  modelSettings?: Record<string, unknown>
  responseSchema?: Record<string, unknown> | null
  revisionMessage?: string
}

export interface PromptPatchDetails {
  description?: string | null
  type?: PromptType | null
  systemContent?: string | null
  userContent?: string | null
  tools?: string[] | null
  modelId?: string | null
  modelSettings?: Record<string, unknown> | null
  responseSchema?: Record<string, unknown> | null
  revisionMessage?: string
}

export interface PromptExecuteResponse<T = unknown> {
  content: T | string | null
}

export interface AIServiceODM {
  _id?: string
  name: string
  created_at?: string
}

export interface AIModelODM {
  _id?: string
  name: string
  created_at?: string
  service: { id: string; collection: string }
}

export interface AIModelPage {
  data: AIModelODM[]
  paging: Paging
}

export interface MCPConfig {
  serverId?: string
  transport: 'sse' | 'websocket'
  url: string
  env?: Record<string, string>
}

export interface FunctionConfig {
  runtime: 'js-runtime'
  source: string
}

export interface ToolSettings {
  // Key-value pairs for runtime configuration (credentials, env vars, auth, etc.)
  // These will be provided to the function/MCP at runtime
  config?: Record<string, string>
}

export interface SchemaConfig {
  input?: Record<string, unknown> // JSON Schema for input/parameters
  output?: Record<string, unknown> // JSON Schema for output/result
}

export interface ToolODM {
  _id?: string
  name: string
  created_at?: string
  description?: string
  type: 'mcp' | 'function'
  config: MCPConfig | FunctionConfig
  settings?: ToolSettings
  schemaConfig?: SchemaConfig
  schema_config?: SchemaConfig // Backend returns snake_case
  active?: boolean
}

export interface ToolPage {
  data: ToolODM[]
  paging: Paging
}

export interface MCPToolDetails {
  name: string
  description?: string
  type: 'mcp'
  config: MCPConfig
  settings?: ToolSettings
  schemaConfig?: SchemaConfig
}

export interface FunctionToolDetails {
  name: string
  description?: string
  type: 'function'
  config: FunctionConfig
  settings?: ToolSettings
  schemaConfig?: SchemaConfig
}

export type ToolDetails = MCPToolDetails | FunctionToolDetails

export interface ToolPutDetails {
  name?: string
  description?: string
  type?: 'mcp' | 'function'
  config?: MCPConfig | FunctionConfig
  settings?: ToolSettings
  schemaConfig?: SchemaConfig
}

export interface ToolPatchDetails {
  name?: string | null
  description?: string | null
  type?: 'mcp' | 'function' | null
  config?: MCPConfig | FunctionConfig | null
  settings?: ToolSettings | null
  schemaConfig?: SchemaConfig | null
  active?: boolean | null
}

export interface AIServicePage {
  data: AIServiceODM[]
  paging: Paging
}

// --- Client ---
export class PromptManagerClient extends RestClient {
  constructor() {
    // Follow the same pattern as other clients: use specific API URL or fallback to BASE_URL
    // Priority: NEXT_PUBLIC_PROMPT_MANAGER_API_URL (incl. local override) >
    //           localhost default (when running on localhost) >
    //           NEXT_PUBLIC_BASE_URL/prompt-manager >
    //           localhost
    let url = env('NEXT_PUBLIC_PROMPT_MANAGER_API_URL')
    // Prefer localhost when the app runs locally and no explicit URL is set
    if (!url && typeof window !== 'undefined') {
      const host = window.location.hostname
      if (host === 'localhost' || host === '127.0.0.1') {
        url = 'http://localhost:8000'
      }
    }
    if (!url) {
      // Fallback to BASE_URL/prompt-manager pattern (same as other services) or localhost
      const baseUrl = env('NEXT_PUBLIC_BASE_URL') ?? ''
      url = baseUrl ? `${baseUrl}/prompt-manager` : 'http://localhost:8000'
    }

    // Ensure URL doesn't end with slash (RestClient handles this)
    if (url.endsWith('/')) {
      url = url.slice(0, -1)
    }

    super(url, {})
  }

  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {}
    }
    this.headers['Authorization'] = setAccessTokenToAuthorizationHeader(accessToken)
  }

  // --- Workspaces ---
  async getWorkspaces(params?: {
    limit?: number
    offset?: number
    returnTotalRecords?: boolean
  }): Promise<WorkspacePage> {
    return this.get<WorkspacePage>('/api/v1/workspaces/', { params })
  }

  async getWorkspace(id: string): Promise<WorkspaceODM> {
    return this.get<WorkspaceODM>(`/api/v1/workspaces/${encodeURIComponent(id)}`)
  }

  async createWorkspace(body: WorkspaceDetails): Promise<WorkspaceODM> {
    return this.post<WorkspaceODM>('/api/v1/workspaces/', body)
  }

  async updateWorkspace(id: string, body: WorkspaceDetails): Promise<WorkspaceODM> {
    return this.put<WorkspaceODM>(`/api/v1/workspaces/${encodeURIComponent(id)}`, body)
  }

  async patchWorkspace(id: string, body: WorkspacePatchDetails): Promise<WorkspaceODM> {
    return this.patch<WorkspaceODM>(`/api/v1/workspaces/${encodeURIComponent(id)}`, body)
  }

  async deleteWorkspace(id: string): Promise<void> {
    await this.delete<void>(`/api/v1/workspaces/${encodeURIComponent(id)}`)
  }

  // --- Prompts (Agents) ---
  async getPrompts(params?: {
    workspaceId?: string | null
    promptName?: string | null
    limit?: number
    offset?: number
    returnTotalRecords?: boolean
  }): Promise<PromptPage> {
    return this.get<PromptPage>('/api/v1/prompts/', { params: params as Record<string, any> })
  }

  async getPrompt(id: string): Promise<PromptODM> {
    return this.get<PromptODM>(`/api/v1/prompts/${encodeURIComponent(id)}`)
  }

  async getPromptParameters(id: string): Promise<{ system_parameters: string[]; user_parameters: string[] }> {
    return this.get<{ system_parameters: string[]; user_parameters: string[] }>(
      `/api/v1/prompts/${encodeURIComponent(id)}/parameters`
    )
  }

  async createPrompt(body: PromptDetails): Promise<PromptODM> {
    return this.post<PromptODM>('/api/v1/prompts/', body)
  }

  async putPrompt(id: string, body: PromptPutDetails): Promise<PromptODM> {
    return this.put<PromptODM>(`/api/v1/prompts/${encodeURIComponent(id)}`, body)
  }

  async patchPrompt(id: string, body: PromptPatchDetails): Promise<PromptODM> {
    return this.patch<PromptODM>(`/api/v1/prompts/${encodeURIComponent(id)}`, body)
  }

  async deletePrompt(id: string): Promise<void> {
    await this.delete<void>(`/api/v1/prompts/${encodeURIComponent(id)}`)
  }

  async getPromptVersions(
    id: string,
    params?: {
      limit?: number
      offset?: number
      returnTotalRecords?: boolean
    }
  ): Promise<{ data: PromptODM[]; paging: Paging }> {
    return this.get<{ data: PromptODM[]; paging: Paging }>(`/api/v1/prompts/${encodeURIComponent(id)}/versions`, {
      params
    })
  }

  // --- Execution ---
  async executePrompt(formData: FormData): Promise<PromptExecuteResponse> {
    return this.post<PromptExecuteResponse>('/api/v1/prompts/execute', formData)
  }

  async executePromptById(id: string, formData: FormData): Promise<PromptExecuteResponse> {
    return this.post<PromptExecuteResponse>(`/api/v1/prompts/${encodeURIComponent(id)}/execute`, formData)
  }

  // --- AI Services / Models ---
  async getAiServices(params?: {
    limit?: number
    offset?: number
    returnTotalRecords?: boolean
  }): Promise<AIServicePage> {
    return this.get<AIServicePage>('/api/v1/ai-services/', { params })
  }

  async getAiModels(params?: {
    serviceId?: string | null
    modelName?: string | null
    limit?: number
    offset?: number
    returnTotalRecords?: boolean
  }): Promise<AIModelPage> {
    return this.get<AIModelPage>('/api/v1/ai-models/', {
      params: params as Record<string, any>
    })
  }

  // --- Tools (Common List API) ---
  async getTools(params?: {
    toolName?: string | null
    toolType?: 'mcp' | 'function' | null
    limit?: number
    offset?: number
    returnTotalRecords?: boolean
  }): Promise<ToolPage> {
    return this.get<ToolPage>('/api/v1/tools/', { params: params as Record<string, any> })
  }

  // --- MCP Tools ---
  async getMcpTool(id: string): Promise<ToolODM> {
    return this.get<ToolODM>(`/api/v1/tools/mcp/${encodeURIComponent(id)}`)
  }

  async createMcpTool(body: MCPToolDetails): Promise<ToolODM> {
    return this.post<ToolODM>('/api/v1/tools/mcp/', body)
  }

  async putMcpTool(id: string, body: MCPToolDetails): Promise<ToolODM> {
    return this.put<ToolODM>(`/api/v1/tools/mcp/${encodeURIComponent(id)}`, body)
  }

  async patchMcpTool(id: string, body: ToolPatchDetails): Promise<ToolODM> {
    return this.patch<ToolODM>(`/api/v1/tools/mcp/${encodeURIComponent(id)}`, body)
  }

  async deleteMcpTool(id: string): Promise<void> {
    await this.delete<void>(`/api/v1/tools/mcp/${encodeURIComponent(id)}`)
  }

  // --- Function Tools ---
  async getFunctionTool(id: string): Promise<ToolODM> {
    return this.get<ToolODM>(`/api/v1/tools/function/${encodeURIComponent(id)}`)
  }

  async createFunctionTool(body: FunctionToolDetails): Promise<ToolODM> {
    return this.post<ToolODM>('/api/v1/tools/function/', body)
  }

  async putFunctionTool(id: string, body: FunctionToolDetails): Promise<ToolODM> {
    return this.put<ToolODM>(`/api/v1/tools/function/${encodeURIComponent(id)}`, body)
  }

  async patchFunctionTool(id: string, body: ToolPatchDetails): Promise<ToolODM> {
    return this.patch<ToolODM>(`/api/v1/tools/function/${encodeURIComponent(id)}`, body)
  }

  async deleteFunctionTool(id: string): Promise<void> {
    await this.delete<void>(`/api/v1/tools/function/${encodeURIComponent(id)}`)
  }
}

export const promptManagerClient = new PromptManagerClient()
