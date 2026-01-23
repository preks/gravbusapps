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
      values: params.values,
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
      values: params.values,
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
