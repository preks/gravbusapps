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
  constructor() {
    const explicit = env('NEXT_PUBLIC_FUNCTIONS_SERVICE_URL')
    if (explicit) {
      const trimmed = explicit.endsWith('/') ? explicit.slice(0, -1) : explicit
      this.baseUrl = trimmed + '/api/v1'
    } else {
      // Prefer local when running on localhost
      if (typeof window !== 'undefined') {
        const host = window.location.hostname
        if (host === 'localhost' || host === '127.0.0.1') {
          this.baseUrl = 'http://localhost:8081/api/v1'
          return
        }
      }
      const platformBase = env('NEXT_PUBLIC_BASE_URL')
      if (platformBase) {
        // Gravity Platform default: <BASE_URL>/functions/api/v1
        const baseTrimmed = platformBase.endsWith('/') ? platformBase.slice(0, -1) : platformBase
        this.baseUrl = baseTrimmed + '/functions/api/v1'
      } else {
        // Local default
        this.baseUrl = 'http://localhost:8081/api/v1'
      }
    }
  }

  private async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const url = new URL(this.baseUrl + path)
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
      })
    }
    const res = await fetch(url.toString(), { method: 'GET' })
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
}
