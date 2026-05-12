import { RestClient } from '@/common/network/rest/RestClient'
import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'
import { getFlowEngineApiBaseUrl } from '@/common/network/flows/flowEngineUrl'

export type CustomDataRowMutationResponse = {
  success: boolean
  resultData?: Record<string, unknown>
  error?: string
}

export type CustomDataRowCreateParams = {
  entityName: string
  values: Record<string, unknown>
  namespace?: string
}

export type CustomDataRowUpdateParams = {
  entityName: string
  rowId: string
  values: Record<string, unknown>
  namespace?: string
}

export type CustomDataRowDeleteParams = {
  entityName: string
  rowId: string
  namespace?: string
}

function buildRowPath(namespace: string, entityName: string, rowId?: string): string {
  const basePath =
    `/v1/custom-data/namespaces/${encodeURIComponent(namespace)}` +
    `/custom-entities/${encodeURIComponent(entityName)}/rows`

  if (!rowId) {
    return basePath
  }

  return `${basePath}/${encodeURIComponent(rowId)}`
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

  async createRow(params: CustomDataRowCreateParams): Promise<CustomDataRowMutationResponse> {
    const namespace = (params.namespace ?? this.namespace) || 'default'
    return this.post<CustomDataRowMutationResponse>(buildRowPath(namespace, params.entityName), {
      values: params.values
    })
  }

  async updateRow(params: CustomDataRowUpdateParams): Promise<CustomDataRowMutationResponse> {
    const namespace = (params.namespace ?? this.namespace) || 'default'
    return this.patch<CustomDataRowMutationResponse>(buildRowPath(namespace, params.entityName, params.rowId), {
      values: params.values
    })
  }

  async deleteRow(params: CustomDataRowDeleteParams): Promise<CustomDataRowMutationResponse> {
    const namespace = (params.namespace ?? this.namespace) || 'default'
    return this.delete<CustomDataRowMutationResponse>(buildRowPath(namespace, params.entityName, params.rowId))
  }
}
