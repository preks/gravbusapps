import { env } from '@/common/env/EnvUtils'
import { normalizeBearerAccessToken, setAccessTokenToAuthorizationHeader } from '../HeaderUtils'

export type ConnectorKind = 'structured' | 'unstructured'

/**
 * Closed enum of first-class categories recognized by functions-service
 * (matches `FUNCTION_CATEGORIES` in the backend). Used to drive the
 * Function Manager tabs and to scope `GET /functions/latest?category=...`.
 */
export const FUNCTION_CATEGORIES = ['General', 'HR', 'CRM', 'Expenses', 'Office', 'Service', 'Custom'] as const
export type FunctionCategory = (typeof FUNCTION_CATEGORIES)[number]

export interface FunctionConnectionBinding {
  connectionId: string
  configMapping?: Record<string, string>
}

export interface FunctionMetadata {
  id: string
  name: string
  description?: string | null
  category: FunctionCategory
  subcategory?: string | null
  agentEnabled: boolean
  workflowEnabled?: boolean
  connectorEnabled?: boolean
  connectorKind?: ConnectorKind | null
  enabled: boolean
  config: Record<string, string>
  connectionBinding?: FunctionConnectionBinding | null
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
  category: FunctionCategory
  subcategory?: string | null
  agentEnabled: boolean
  workflowEnabled?: boolean
  connectorEnabled?: boolean
  connectorKind?: ConnectorKind | null
  enabled: boolean
  config: Record<string, string>
  connectionBinding?: FunctionConnectionBinding | null
  latestVersion: FunctionVersionMeta
}

export interface FunctionVersionsResponse {
  function: FunctionMetadata
  versions: FunctionVersionMeta[]
}

export type FunctionAssistantMode = 'create' | 'refine'

export type FunctionAssistantDocSource =
  | { type: 'url'; url: string }
  | { type: 'content'; content: string }
  | { type: 'openapiDirectory'; name: string }

export type FunctionAssistantExistingSnapshot = {
  name?: string
  description?: string
  source?: string
  inputSchema?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
  configKeys?: string[]
}

export type FunctionAssistantDraftRequest = {
  prompt: string
  mode: FunctionAssistantMode
  clarifyCount?: number
  clarifyLimit?: number
  docSource?: FunctionAssistantDocSource
  existing?: FunctionAssistantExistingSnapshot
  answers?: Record<
    string,
    {
      // Legacy label-based selection (deprecated)
      selectedOption?: string
      // New value/id based selection (preferred)
      selectedOptionValue?: string
      selectedOptionId?: string
      freeText?: string
    }
  >
  sessionId?: string
}

export type FunctionAssistantQuestionOption = {
  id: string
  label: string
  value: string
  freeText?: { required?: boolean; placeholder?: string }
  meta?: { docSourceType?: 'content' | 'openapiDirectory' | 'url' | 'preset' }
}

export type FunctionAssistantDraftResponse = {
  kind?: 'draft' | 'clarify'
  track?:
    | 'integration'
    | 'webhook'
    | 'transformer'
    | 'rules'
    | 'computation'
    | 'tokenExchange'
    | 'connector'
    | 'documentConnector'
  connectorEnabled?: boolean
  connectorKind?: ConnectorKind
  applyToEditor?: boolean
  name?: string
  description?: string
  appliedHeadline: string
  keyChanges: string[]
  nextSteps?: string[]
  questions?: Array<{
    id: string
    question: string
    options?: string[]
    optionsV2?: FunctionAssistantQuestionOption[]
    freeText?: {
      required?: boolean
      placeholder?: string
      requiredWhenOptionIn?: string[]
      placeholderByOption?: Record<string, string>
    }
  }>
  source: string
  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown>
  configKeys: string[]
  configHelp?: Array<{ key: string; label?: string; description?: string; example?: string; whereToFind?: string }>
  examplePayload?: unknown
  notes?: string
  testInstructions?: string
  implementationSummary?: string[]
}

export type FunctionExecutionLogEntry = { level: string; message: string }

export type CredentialListItem = {
  id: string
  displayName: string
  namespace?: string
  updatedAt?: string
  fieldKeys?: string[]
}

export type CredentialDetailDto = {
  id: string
  displayName: string
  namespace: string
  updatedAt: string
  fieldKeys: string[]
  fieldCount: number
}

export type CredentialReferenceLocation = {
  kind: 'function' | 'external_connection' | 'pm_tool'
  id: string
  field: string
  label?: string
}

export type FunctionAssistantDraftStreamEvent =
  | { type: 'progress'; phase?: string; message: string; data?: Record<string, unknown> }
  | { type: 'result'; result: FunctionAssistantDraftResponse }
  | { type: 'error'; message: string }

export type FunctionAssistantIterateRequest = {
  instruction: string
  source: string
  inputSchema?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
  configKeys?: string[]
  config?: Record<string, string>
  payload?: Record<string, unknown>
  frontendError?: string
  frontendResult?: string
  maxFixIterations?: number
}

export class FunctionsServiceClient {
  readonly baseUrl: string
  private accessToken?: string

  constructor(accessToken?: string) {
    const override = env('NEXT_PUBLIC_FUNCTIONS_API_URL')
    if (override && override.trim()) {
      const trimmed = override.endsWith('/') ? override.slice(0, -1) : override
      this.baseUrl = trimmed.endsWith('/api/v1') ? trimmed : trimmed + '/api/v1'
    } else {
      const base = env('NEXT_PUBLIC_BASE_URL')
      if (!base || !base.trim()) {
        throw new Error(
          'Missing Functions Service URL. Set NEXT_PUBLIC_FUNCTIONS_API_URL (full override) or NEXT_PUBLIC_BASE_URL (fallback).'
        )
      }
      const functionsServiceUrl = base + '/functions'
      const trimmed = functionsServiceUrl.endsWith('/') ? functionsServiceUrl.slice(0, -1) : functionsServiceUrl
      this.baseUrl = trimmed + '/api/v1'
    }
    this.accessToken = normalizeBearerAccessToken(accessToken) ?? undefined
  }

  setAccessToken(accessToken: string) {
    this.accessToken = normalizeBearerAccessToken(accessToken) ?? undefined
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}
    if (this.accessToken) {
      headers.Authorization = setAccessTokenToAuthorizationHeader(this.accessToken)
    }
    return headers
  }

  private async readErrorMessage(res: Response): Promise<string> {
    const text = await res.text()
    try {
      const json = JSON.parse(text) as any
      const msg = json?.message
      if (typeof msg === 'string' && msg.trim()) return msg
      if (Array.isArray(msg) && msg.length) return msg.map(String).join('\n')
    } catch {
      // ignore
    }
    return text
  }

  private async postJson<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(this.baseUrl + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify(body ?? {})
    })
    if (!res.ok) {
      const msg = await this.readErrorMessage(res)
      throw new Error(msg || `POST ${path} failed: ${res.status}`)
    }
    return (await res.json()) as T
  }

  private async patchJson<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(this.baseUrl + path, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify(body ?? {})
    })
    if (!res.ok) {
      const msg = await this.readErrorMessage(res)
      throw new Error(msg || `PATCH ${path} failed: ${res.status}`)
    }
    return (await res.json()) as T
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

  async listLatest(params?: {
    agentEnabled?: boolean
    workflowEnabled?: boolean
    connectorEnabled?: boolean
    connectorKind?: ConnectorKind | null
    category?: FunctionCategory
    subcategory?: string
  }): Promise<LatestFunctionItem[]> {
    return await this.get<LatestFunctionItem[]>('/functions/latest', params as any)
  }

  async list(params?: {
    agentEnabled?: boolean
    workflowEnabled?: boolean
    connectorEnabled?: boolean
    connectorKind?: ConnectorKind | null
    category?: FunctionCategory
    subcategory?: string
  }): Promise<FunctionMetadata[]> {
    return await this.get<FunctionMetadata[]>('/functions', params as any)
  }

  async getVersions(functionId: string): Promise<FunctionVersionsResponse> {
    return await this.get<FunctionVersionsResponse>(`/functions/${functionId}/versions`)
  }

  // Authenticated methods for creating/updating functions
  async createFunctionWithVersion(data: {
    name: string
    description?: string
    category?: FunctionCategory
    subcategory?: string | null
    agentEnabled?: boolean
    workflowEnabled?: boolean
    connectorEnabled?: boolean
    connectorKind?: ConnectorKind | null
    config?: Record<string, string>
    connectionBinding?: FunctionConnectionBinding | null
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
      name?: string
      description?: string
      category?: FunctionCategory
      subcategory?: string | null
      agentEnabled?: boolean
      workflowEnabled?: boolean
      connectorEnabled?: boolean
      connectorKind?: ConnectorKind | null
      config?: Record<string, string>
      connectionBinding?: FunctionConnectionBinding | null
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

  async listCredentials(namespace?: string, includeFieldKeys = true): Promise<CredentialListItem[]> {
    const params: Record<string, string> = {}
    if (namespace !== undefined && namespace !== '') params.namespace = namespace
    if (includeFieldKeys) params.includeFieldKeys = 'true'
    return await this.get<CredentialListItem[]>('/credentials', params)
  }

  async getCredential(credentialId: string): Promise<CredentialDetailDto> {
    return await this.get<CredentialDetailDto>(`/credentials/${encodeURIComponent(credentialId)}`)
  }

  async getCredentialReferences(credentialId: string): Promise<{ locations: CredentialReferenceLocation[] }> {
    return await this.get<{ locations: CredentialReferenceLocation[] }>(
      `/credentials/${encodeURIComponent(credentialId)}/references`
    )
  }

  async createCredential(input: {
    displayName: string
    namespace?: string
    live: Record<string, string>
    preview?: Record<string, string>
  }): Promise<{ id: string }> {
    return await this.postJson<{ id: string }>('/credentials', {
      displayName: input.displayName,
      namespace: input.namespace,
      live: input.live || {},
      preview: input.preview ?? {}
    })
  }

  async updateCredentialDisplayName(
    credentialId: string,
    input: { displayName: string }
  ): Promise<{ id: string; displayName: string }> {
    return await this.patchJson<{ id: string; displayName: string }>(
      `/credentials/${encodeURIComponent(credentialId)}`,
      input
    )
  }

  async replaceCredentialFields(
    credentialId: string,
    fields: Record<string, string>,
    options: { profile: 'live' | 'preview'; merge?: boolean; removeFieldKeys?: string[] }
  ): Promise<{ version: number }> {
    const removeFieldKeys = options.removeFieldKeys?.filter(Boolean)
    return await this.postJson<{ version: number }>(`/credentials/${encodeURIComponent(credentialId)}/fields`, {
      profile: options.profile,
      fields,
      merge: options.merge === true,
      ...(removeFieldKeys?.length ? { removeFieldKeys } : {})
    })
  }

  async deleteCredential(credentialId: string): Promise<void> {
    const res = await fetch(this.baseUrl + `/credentials/${encodeURIComponent(credentialId)}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    })
    if (!res.ok) {
      const msg = await this.readErrorMessage(res)
      throw new Error(msg || `DELETE /credentials failed: ${res.status}`)
    }
  }

  async resolveCredentialsBatch(
    refs: string[],
    credentialProfile?: 'live' | 'preview'
  ): Promise<Record<string, string>> {
    const data = await this.postJson<{ values: Record<string, string> }>('/credentials/resolve-batch', {
      refs,
      ...(credentialProfile ? { credentialProfile } : {})
    })
    return data.values || {}
  }

  async listSecrets(namespace?: string): Promise<CredentialListItem[]> {
    return this.listCredentials(namespace, true)
  }

  async testFunction(data: {
    source: string
    payload: Record<string, unknown>
    inputSchema?: Record<string, unknown>
    outputSchema?: Record<string, unknown>
    config?: Record<string, string>
    connectionBinding?: FunctionConnectionBinding | null
    /** Plaintext overrides merged after fncred resolution; not persisted. */
    testConfigOverrides?: Record<string, string>
  }): Promise<{ result: unknown; logs?: FunctionExecutionLogEntry[] }> {
    const res = await fetch(this.baseUrl + '/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify(data)
    })
    const raw = await res.text()
    let parsed: any = null
    try {
      parsed = raw ? JSON.parse(raw) : null
    } catch {
      parsed = null
    }

    if (!res.ok) {
      const msg =
        typeof parsed?.message === 'string' && parsed.message.trim()
          ? parsed.message.trim()
          : raw || `Test function failed (${res.status})`
      const err = new Error(msg)
      if (Array.isArray(parsed?.logs)) (err as any).logs = parsed.logs
      throw err
    }

    const result = parsed && typeof parsed === 'object' && 'result' in parsed ? parsed.result : parsed
    const logs =
      parsed && typeof parsed === 'object' && Array.isArray(parsed.logs)
        ? (parsed.logs as FunctionExecutionLogEntry[])
        : undefined
    return { result, logs }
  }

  async getFunction(functionId: string): Promise<{
    metadata: FunctionMetadata
    version?: FunctionVersionMeta & { source?: string }
  }> {
    return await this.get<{
      metadata: FunctionMetadata
      version?: FunctionVersionMeta & { source?: string }
    }>(`/functions/${functionId}`)
  }

  /** Map GET /functions/:id (latest version) to the list row shape used by Function Manager. */
  toLatestFunctionItem(detail: {
    metadata: FunctionMetadata
    version?: FunctionVersionMeta & { source?: string }
  }): LatestFunctionItem | null {
    const { metadata, version } = detail
    if (!metadata?.id || !version?.version) return null
    return {
      id: metadata.id,
      name: metadata.name,
      description: metadata.description,
      category: metadata.category,
      subcategory: metadata.subcategory,
      agentEnabled: metadata.agentEnabled,
      workflowEnabled: metadata.workflowEnabled,
      connectorEnabled: metadata.connectorEnabled,
      connectorKind: metadata.connectorKind,
      enabled: metadata.enabled,
      config: metadata.config ?? {},
      connectionBinding: metadata.connectionBinding,
      latestVersion: {
        version: version.version,
        inputSchema: version.inputSchema,
        outputSchema: version.outputSchema,
        createdAt: version.createdAt
      }
    }
  }

  async functionAssistantDraft(data: FunctionAssistantDraftRequest): Promise<FunctionAssistantDraftResponse> {
    const res = await fetch(this.baseUrl + '/ai/function-draft', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify(data)
    })
    if (!res.ok) {
      const msg = await this.readErrorMessage(res)
      throw new Error(msg || `Function assistant failed (${res.status})`)
    }
    return (await res.json()) as FunctionAssistantDraftResponse
  }

  async functionAssistantDraftStream(
    data: FunctionAssistantDraftRequest,
    onEvent: (evt: FunctionAssistantDraftStreamEvent) => void
  ): Promise<FunctionAssistantDraftResponse> {
    const res = await fetch(this.baseUrl + '/ai/function-draft/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify(data)
    })
    if (!res.ok) {
      const msg = await this.readErrorMessage(res)
      throw new Error(msg || `Function assistant failed (${res.status})`)
    }
    if (!res.body) throw new Error('Streaming not supported (no response body)')

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let finalResult: FunctionAssistantDraftResponse | null = null
    let lastError: string | null = null

    const emit = (evt: FunctionAssistantDraftStreamEvent) => {
      try {
        onEvent(evt)
      } catch {
        // ignore consumer errors
      }
    }

    const processBuffer = () => {
      // Normalize CRLF so we can reliably split on \n\n
      buffer = buffer.replace(/\r/g, '')

      while (true) {
        const idx = buffer.indexOf('\n\n')
        if (idx < 0) break
        const raw = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 2)

        const lines = raw.split('\n')
        let eventName = 'message'
        const dataLines: string[] = []
        for (const line of lines) {
          if (!line) continue
          if (line.startsWith(':')) continue
          if (line.startsWith('event:')) {
            eventName = line.slice('event:'.length).trim()
          } else if (line.startsWith('data:')) {
            dataLines.push(line.slice('data:'.length).trimStart())
          }
        }
        const dataStr = dataLines.join('\n').trim()
        if (!dataStr) continue

        try {
          const parsed = JSON.parse(dataStr) as any
          if (eventName === 'progress') {
            emit({
              type: 'progress',
              phase: typeof parsed?.phase === 'string' ? parsed.phase : undefined,
              message: String(parsed?.message || ''),
              data: parsed?.data && typeof parsed.data === 'object' ? parsed.data : undefined
            })
          } else if (eventName === 'result') {
            finalResult = parsed as FunctionAssistantDraftResponse
            emit({ type: 'result', result: finalResult })
          } else if (eventName === 'error') {
            lastError = String(parsed?.message || 'Stream error')
            emit({ type: 'error', message: lastError })
          }
        } catch {
          // ignore malformed events
        }
      }
    }

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      processBuffer()
      if (finalResult || lastError) break
    }

    // Flush remaining decoder output + trailing buffer (in case stream ended without final \n\n)
    buffer += decoder.decode()
    buffer += '\n\n'
    processBuffer()

    if (finalResult) return finalResult
    if (lastError) throw new Error(lastError)
    throw new Error('Stream ended without result')
  }

  async functionAssistantIterate(data: FunctionAssistantIterateRequest): Promise<FunctionAssistantDraftResponse> {
    const res = await fetch(this.baseUrl + '/ai/function-iterate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify(data)
    })
    if (!res.ok) {
      const msg = await this.readErrorMessage(res)
      throw new Error(msg || `Function assistant iterate failed (${res.status})`)
    }
    return (await res.json()) as FunctionAssistantDraftResponse
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
