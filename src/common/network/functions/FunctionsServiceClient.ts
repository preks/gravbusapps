import { env } from '@/common/env/EnvUtils'

export interface FunctionMetadata {
  id: string
  name: string
  description?: string | null
  agentEnabled: boolean
  workflowEnabled?: boolean
  enabled: boolean
  config: Record<string, string>
}

export interface FunctionVersionMeta {
  version: number
  inputSchema?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
  createdAt?: string
}

export interface LatestFunctionItem {
  id: string
  name: string
  description?: string | null
  agentEnabled: boolean
  workflowEnabled?: boolean
  enabled: boolean
  config: Record<string, string>
  latestVersion: FunctionVersionMeta
}

export interface FunctionVersionsResponse {
  function: FunctionMetadata
  versions: FunctionVersionMeta[]
}

export class FunctionsServiceClient {
  readonly baseUrl: string
  private accessToken?: string

  constructor(accessToken?: string) {
    const explicitFunctionsUrl = env('NEXT_PUBLIC_FUNCTIONS_SERVICE_URL')
    const baseUrl = env('NEXT_PUBLIC_BASE_URL') || ''
    if (!explicitFunctionsUrl && !baseUrl) {
      throw new Error('NEXT_PUBLIC_FUNCTIONS_SERVICE_URL or NEXT_PUBLIC_BASE_URL is required')
    }
    const functionsServiceUrl = explicitFunctionsUrl ?? `${baseUrl.replace(/\/+$/, '')}/functions`
    const trimmed = functionsServiceUrl.endsWith('/') ? functionsServiceUrl.slice(0, -1) : functionsServiceUrl
    this.baseUrl = trimmed + '/api/v1'
    this.accessToken = accessToken
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }
    return headers
  }

  private async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const url = new URL(this.baseUrl + path)
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
      })
    }
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getAuthHeaders()
    })
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
    return (await res.json()) as T
  }

  async listLatest(params?: { agentEnabled?: boolean; workflowEnabled?: boolean }): Promise<LatestFunctionItem[]> {
    return await this.get<LatestFunctionItem[]>('/functions/latest', params as any)
  }

  async list(params?: { agentEnabled?: boolean; workflowEnabled?: boolean }): Promise<FunctionMetadata[]> {
    return await this.get<FunctionMetadata[]>('/functions', params as any)
  }

  async getVersions(functionId: string): Promise<FunctionVersionsResponse> {
    return await this.get<FunctionVersionsResponse>(`/functions/${functionId}/versions`)
  }

  // Authenticated methods for creating/updating functions
  async createFunctionWithVersion(data: {
    name: string
    description?: string
    agentEnabled?: boolean
    workflowEnabled?: boolean
    config?: Record<string, string>
    firstVersion: {
      source: string
      inputSchema?: Record<string, unknown>
      outputSchema?: Record<string, unknown>
      settings?: Record<string, unknown>
    }
  }): Promise<{ id: string }> {
    const res = await fetch(this.baseUrl + '/functions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify(data)
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Create function failed: ${res.status} - ${text}`)
    }
    return (await res.json()) as { id: string }
  }

  async updateFunction(
    functionId: string,
    data: {
      description?: string
      agentEnabled?: boolean
      workflowEnabled?: boolean
      config?: Record<string, string>
    }
  ): Promise<void> {
    const res = await fetch(this.baseUrl + `/functions/${functionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify(data)
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Update function failed: ${res.status} - ${text}`)
    }
  }

  async createVersion(
    functionId: string,
    version: number,
    data: {
      source: string
      inputSchema?: Record<string, unknown>
      outputSchema?: Record<string, unknown>
      settings?: Record<string, unknown>
    }
  ): Promise<{ id: string; version: number }> {
    const res = await fetch(this.baseUrl + `/functions/${functionId}/versions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify({ version, ...data })
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Create version failed: ${res.status} - ${text}`)
    }
    return (await res.json()) as { id: string; version: number }
  }

  async testFunction(data: {
    source: string
    payload: Record<string, unknown>
    inputSchema?: Record<string, unknown>
    outputSchema?: Record<string, unknown>
    config?: Record<string, string>
  }): Promise<{ result: unknown }> {
    const res = await fetch(this.baseUrl + '/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify(data)
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Test function failed: ${res.status} - ${text}`)
    }
    return (await res.json()) as { result: unknown }
  }

  async getFunction(functionId: string): Promise<FunctionMetadata & { version?: { source?: string } }> {
    return await this.get<FunctionMetadata & { version?: { source?: string } }>(`/functions/${functionId}`)
  }

  async findFunctionByName(name: string): Promise<FunctionMetadata | null> {
    const all = await this.list()
    return all.find(f => f.name === name) || null
  }

  async getLatestVersion(functionId: string): Promise<number> {
    const data = await this.getVersions(functionId)
    if (data.versions.length === 0) return 0
    return Math.max(...data.versions.map(v => v.version))
  }

  async deleteFunction(functionId: string): Promise<void> {
    const res = await fetch(this.baseUrl + `/functions/${functionId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Delete function failed: ${res.status} - ${text}`)
    }
  }
}
