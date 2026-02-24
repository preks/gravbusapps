import { RestClient } from '@/common/network/rest/RestClient'
import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'
import { getFlowEngineApiBaseUrl } from '@/common/network/flows/flowEngineUrl'

export type CustomDataFlowMutationResponse = {
  workflowId: string
  success: boolean
  resultData?: Record<string, unknown>
  error?: string
}

export type CustomDataRowCreateParams = {
  definitionKey: string
  values: Record<string, unknown>
  initiator?: string
  timeoutMs?: number
  namespace?: string
}

export type CustomDataRowUpdateParams = {
  definitionKey: string
  rowId: string
  values: Record<string, unknown>
  initiator?: string
  timeoutMs?: number
  namespace?: string
}

export type CustomDataRowDeleteParams = {
  definitionKey: string
  rowId: string
  initiator?: string
  timeoutMs?: number
  namespace?: string
}

/**
 * Convert snake_case keys to camelCase.
 * Guards against AI-generated code that uses snake_case field names in the
 * values object — the flow-engine stores columns in camelCase and returns
 * 400 "Unknown column" for any snake_case mismatch.
 */
function normalizeValueKeys(values: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(values)) {
    const camel = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
    if (camel !== key && process.env.NODE_ENV !== 'production') {
      console.warn(
        `[CustomDataMutationClient] Field key "${key}" was automatically converted to "${camel}". ` +
          'Use camelCase field names to match the entity schema.'
      )
    }
    result[camel] = val
  }
  return result
}

export class CustomDataMutationClient extends RestClient {
  private namespace?: string

  constructor(params?: { accessToken?: string; namespace?: string }) {
    super(getFlowEngineApiBaseUrl())
    this.namespace = params?.namespace
    if (params?.accessToken) {
      this.setAccessToken(params.accessToken)
    }
  }

  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {}
    }
    this.headers['Authorization'] = setAccessTokenToAuthorizationHeader(accessToken)
  }

  setNamespace(namespace?: string) {
    const ns = String(namespace || '').trim()
    this.namespace = ns || undefined
  }

  withNamespace(namespace: string): CustomDataMutationClient {
    const client = new CustomDataMutationClient()
    client.headers = { ...this.headers }
    client.setNamespace(namespace)
    return client
  }

  async createRow(params: CustomDataRowCreateParams): Promise<CustomDataFlowMutationResponse> {
    const namespace = (params.namespace ?? this.namespace) || 'default'
    return this.post<CustomDataFlowMutationResponse>('/custom-data/flows/row-create', {
      namespace,
      definitionKey: params.definitionKey,
      values: normalizeValueKeys(params.values),
      initiator: params.initiator,
      timeoutMs: params.timeoutMs
    })
  }

  async updateRow(params: CustomDataRowUpdateParams): Promise<CustomDataFlowMutationResponse> {
    const namespace = (params.namespace ?? this.namespace) || 'default'
    return this.post<CustomDataFlowMutationResponse>('/custom-data/flows/row-update', {
      namespace,
      definitionKey: params.definitionKey,
      rowId: params.rowId,
      values: normalizeValueKeys(params.values),
      initiator: params.initiator,
      timeoutMs: params.timeoutMs
    })
  }

  async deleteRow(params: CustomDataRowDeleteParams): Promise<CustomDataFlowMutationResponse> {
    const namespace = (params.namespace ?? this.namespace) || 'default'
    return this.post<CustomDataFlowMutationResponse>('/custom-data/flows/row-delete', {
      namespace,
      definitionKey: params.definitionKey,
      rowId: params.rowId,
      initiator: params.initiator,
      timeoutMs: params.timeoutMs
    })
  }
}
