import {
  type CustomDataRowMutationResponse,
  type CustomDataRowCreateParams,
  type CustomDataRowDeleteParams,
  type CustomDataRowUpdateParams
} from '@/common/network/custom-data/CustomDataMutationClient'
import { getFlowEngineApiBaseUrl } from '@/common/network/flows/flowEngineUrl'
import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'
import { RestClient } from '@/common/network/rest/RestClient'

type GraphQLResponse<T> = {
  data?: T
  errors?: unknown
}

function buildRowPath(namespace: string, definitionKey: string, rowId?: string): string {
  const basePath =
    `/v1/custom-data/namespaces/${encodeURIComponent(namespace)}` +
    `/custom-entities/${encodeURIComponent(definitionKey)}/rows`

  if (!rowId) {
    return basePath
  }

  return `${basePath}/${encodeURIComponent(rowId)}`
}

export class CustomFlowEngineDataClient extends RestClient {
  private namespace?: string

  readonly graphql = {
    request: <T = any>(query: string, variables?: Record<string, any>) => this.requestGraphql<T>(query, variables),
    introspectEntityType: (entityTypeName: string) => this.introspectEntityType(entityTypeName)
  }

  readonly mutation = {
    createRow: (params: CustomDataRowCreateParams) => this.createRow(params),
    updateRow: (params: CustomDataRowUpdateParams) => this.updateRow(params),
    deleteRow: (params: CustomDataRowDeleteParams) => this.deleteRow(params)
  }

  constructor() {
    super(getFlowEngineApiBaseUrl(), {})
  }

  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {}
    }

    this.headers.Authorization = setAccessTokenToAuthorizationHeader(accessToken)
  }

  setNamespace(namespace?: string) {
    const normalizedNamespace = String(namespace || '').trim()
    this.namespace = normalizedNamespace || undefined
  }

  async requestGraphql<T = any>(query: string, variables?: Record<string, any>): Promise<T> {
    const response = await fetch(`${this.baseUrl}/custom-data/graphql`, {
      method: 'POST',
      credentials: 'same-origin',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
        ...(this.namespace ? { 'x-schema-namespace': this.namespace } : {})
      },
      body: JSON.stringify({
        query,
        variables
      })
    })

    if (response.status === 301 || response.status === 302) {
      const location = response.headers.get('location')
      throw new Error(`Redirect detected: ${response.status} ${response.statusText} -> ${location}`)
    }

    if (!response.ok) {
      try {
        const errorText = await response.text()
        throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}\nResponse: ${errorText}`)
      } catch {
        throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`)
      }
    }

    const result = (await response.json()) as GraphQLResponse<T>

    if (result.errors) {
      throw new Error(`GraphQL error: ${JSON.stringify(result.errors)}`)
    }

    return result.data as T
  }

  async introspectEntityType(entityTypeName: string): Promise<Record<string, string>> {
    const introspectionQuery = `
      query IntrospectEntityType($name: String!) {
        __type(name: $name) {
          name
          fields(includeDeprecated: true) {
            name
            type {
              name
              kind
              ofType {
                name
                kind
              }
            }
          }
        }
      }
    `

    try {
      const result = await this.requestGraphql<{
        __type: {
          name: string
          fields: Array<{
            name: string
            type: {
              name: string | null
              kind: string
              ofType: { name: string | null; kind: string } | null
            }
          }>
        }
      }>(introspectionQuery, { name: entityTypeName })

      if (!result.__type?.fields) {
        return {}
      }

      const fieldTypes: Record<string, string> = {}
      result.__type.fields.forEach(field => {
        const typeName = field.type.name || field.type.ofType?.name || 'String'
        fieldTypes[field.name] = typeName
      })

      return fieldTypes
    } catch (error) {
      console.warn('Failed to introspect entity type:', error)
      return {}
    }
  }

  async createRow(params: CustomDataRowCreateParams): Promise<CustomDataRowMutationResponse> {
    const namespace = (params.namespace ?? this.namespace) || 'default'
    return this.post<CustomDataRowMutationResponse>(buildRowPath(namespace, params.definitionKey), {
      values: params.values
    })
  }

  async updateRow(params: CustomDataRowUpdateParams): Promise<CustomDataRowMutationResponse> {
    const namespace = (params.namespace ?? this.namespace) || 'default'
    return this.patch<CustomDataRowMutationResponse>(buildRowPath(namespace, params.definitionKey, params.rowId), {
      values: params.values
    })
  }

  async deleteRow(params: CustomDataRowDeleteParams): Promise<CustomDataRowMutationResponse> {
    const namespace = (params.namespace ?? this.namespace) || 'default'
    return this.delete<CustomDataRowMutationResponse>(buildRowPath(namespace, params.definitionKey, params.rowId))
  }
}
