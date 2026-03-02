import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'
import { getFlowEngineApiBaseUrl } from '@/common/network/flows/flowEngineUrl'

type GraphQLResponse<T> = {
  data?: T
  errors?: unknown
}

export class CustomDataGraphQLClient {
  private endpoint: string
  private headers: Record<string, string> = {}

  constructor(params?: { accessToken?: string; namespace?: string }) {
    this.endpoint = `${getFlowEngineApiBaseUrl()}/custom-data/graphql`
    if (params?.namespace) {
      this.setNamespace(params.namespace)
    }
    if (params?.accessToken) {
      this.setAccessToken(params.accessToken)
    }
  }

  setAccessToken(accessToken: string) {
    this.headers['Authorization'] = setAccessTokenToAuthorizationHeader(accessToken)
  }

  /**
   * Adds/removes `x-schema-namespace` header.
   * If not set, requests behave like the default platform GraphQL client (no namespace header),
   * but the custom-data endpoint will likely return an empty schema/data.
   */
  setNamespace(namespace?: string) {
    const ns = String(namespace || '').trim()
    if (!ns) {
      delete this.headers['x-schema-namespace']
      return
    }
    this.headers['x-schema-namespace'] = ns
  }

  async request<T = any>(query: string, variables?: Record<string, any>): Promise<T> {
    if (!this.endpoint) {
      throw new Error('Custom Data GraphQL endpoint is not configured.')
    }

    const operationMatch = /\b(query|mutation)\s+(\w+)/.exec(query)
    const operationName = operationMatch?.[2] ?? 'anonymous'
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ed611493-841a-49f3-bdb3-51459a47d6c7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runId: 'run-3',
        hypothesisId: 'H6',
        location: 'CustomDataGraphQLClient.ts:49',
        message: 'CustomData GraphQL request start',
        data: { operationName, hasVariables: Boolean(variables && Object.keys(variables).length > 0) },
        timestamp: Date.now()
      })
    }).catch(() => {})
    // #endregion

    const response = await fetch(this.endpoint, {
      method: 'POST',
      credentials: 'same-origin',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers
      },
      body: JSON.stringify({
        query,
        variables
      })
    })

    if (response.status === 302 || response.status === 301) {
      const location = response.headers.get('location')
      console.error(`Custom Data GraphQL request redirected (${response.status}) to: ${location}`)
      throw new Error(`Redirect detected: ${response.status} ${response.statusText} -> ${location}`)
    }

    if (!response.ok) {
      try {
        const errorText = await response.text()
        console.error('Custom Data GraphQL error response body:', errorText)
        throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}\nResponse: ${errorText}`)
      } catch {
        throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`)
      }
    }

    const result = (await response.json()) as GraphQLResponse<T>

    if ((result as any).errors) {
      console.error('Custom Data GraphQL errors:', (result as any).errors)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed611493-841a-49f3-bdb3-51459a47d6c7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId: 'run-3',
          hypothesisId: 'H6',
          location: 'CustomDataGraphQLClient.ts:88',
          message: 'CustomData GraphQL errors returned',
          data: {
            operationName,
            errorCount: Array.isArray((result as any).errors) ? (result as any).errors.length : 1
          },
          timestamp: Date.now()
        })
      }).catch(() => {})
      // #endregion
      throw new Error(`GraphQL error: ${JSON.stringify((result as any).errors)}`)
    }

    return (result as any).data as T
  }

  /**
   * Fetches the GraphQL schema metadata for a specific entity type.
   * Returns field names and their types to help render appropriate input controls.
   */
  async introspectEntityType(entityTypeName: string): Promise<Record<string, string>> {
    const introspectionQuery = `
      query IntrospectEntityType($name: String!) {
        __type(name: $name) {
          name
          fields {
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
      const result = await this.request<{
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
}
