import {
  type CustomDataFlowMutationResponse,
  type CustomDataRowCreateParams,
  type CustomDataRowDeleteParams,
  type CustomDataRowUpdateParams
} from '@/common/network/custom-data/CustomDataMutationClient'
import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'
import { RestClient } from '@/common/network/rest/RestClient'
import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'

type GraphQLResponse<T> = {
  data?: T
  errors?: unknown
}

function normalizeValueKeys(values: Record<string, unknown>): Record<string, unknown> {
  const normalizedValues: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(values)) {
    const normalizedKey = normalizeValueKey(key)

    if (normalizedKey !== key && process.env.NODE_ENV !== 'production') {
      console.warn(
        `[CustomFlowEngineDataClient] Field key "${key}" was automatically normalized to "${normalizedKey}". ` +
          'AI-generated code should use camelCase field names to match entity schema.'
      )
    }

    normalizedValues[normalizedKey] = value
  }

  return normalizedValues
}

function normalizeValueKey(key: string): string {
  const parts = key.split(/[_\-\s]+/)

  return parts
    .map((part, index) => {
      const cleanedPart = part.replace(/[^a-zA-Z0-9]/g, '')
      if (!cleanedPart) return ''
      if (index === 0) {
        return cleanedPart.charAt(0).toLowerCase() + cleanedPart.slice(1)
      }

      return cleanedPart.charAt(0).toUpperCase() + cleanedPart.slice(1)
    })
    .join('')
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
    super(CUSTOM_FLOW_ENGINE_API_URL, {})
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

  async createRow(params: CustomDataRowCreateParams): Promise<CustomDataFlowMutationResponse> {
    const namespace = (params.namespace ?? this.namespace) || 'default'
    const normalizedValues = normalizeValueKeys(params.values)

    try {
      return await this.post<CustomDataFlowMutationResponse>('/custom-data/flows/row-create', {
        namespace,
        definitionKey: params.definitionKey,
        values: normalizedValues,
        initiator: params.initiator,
        timeoutMs: params.timeoutMs
      })
    } catch (error: any) {
      if (this.shouldRetryWithOriginalValues(error, params.values, normalizedValues)) {
        return this.post<CustomDataFlowMutationResponse>('/custom-data/flows/row-create', {
          namespace,
          definitionKey: params.definitionKey,
          values: params.values,
          initiator: params.initiator,
          timeoutMs: params.timeoutMs
        })
      }

      if (error?.message?.includes('Unknown column')) {
        throw new Error(this.enhanceUnknownColumnError(error.message, params.values, params.definitionKey))
      }

      throw error
    }
  }

  async updateRow(params: CustomDataRowUpdateParams): Promise<CustomDataFlowMutationResponse> {
    const namespace = (params.namespace ?? this.namespace) || 'default'
    const normalizedValues = normalizeValueKeys(params.values)

    try {
      return await this.post<CustomDataFlowMutationResponse>('/custom-data/flows/row-update', {
        namespace,
        definitionKey: params.definitionKey,
        rowId: params.rowId,
        values: normalizedValues,
        initiator: params.initiator,
        timeoutMs: params.timeoutMs
      })
    } catch (error: any) {
      if (this.shouldRetryWithOriginalValues(error, params.values, normalizedValues)) {
        return this.post<CustomDataFlowMutationResponse>('/custom-data/flows/row-update', {
          namespace,
          definitionKey: params.definitionKey,
          rowId: params.rowId,
          values: params.values,
          initiator: params.initiator,
          timeoutMs: params.timeoutMs
        })
      }

      if (error?.message?.includes('Unknown column')) {
        throw new Error(this.enhanceUnknownColumnError(error.message, params.values, params.definitionKey))
      }

      throw error
    }
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

  private enhanceUnknownColumnError(originalError: string, values: Record<string, unknown>, entityKey: string): string {
    const providedFieldList = Object.keys(values).join(', ')

    return (
      `${originalError}\n\n` +
      `Provided fields: ${providedFieldList}\n` +
      `This usually means the screen code uses field names that do not match the entity schema.\n` +
      `The entity "${entityKey}" expects camelCase field names.`
    )
  }

  private shouldRetryWithOriginalValues(
    error: any,
    originalValues: Record<string, unknown>,
    normalizedValues: Record<string, unknown>
  ): boolean {
    if (!error?.message?.includes('Unknown column')) return false

    const originalKeys = Object.keys(originalValues)
    const normalizedKeys = Object.keys(normalizedValues)
    if (originalKeys.length !== normalizedKeys.length) return true

    return originalKeys.some(key => normalizeValueKey(key) !== key)
  }
}
