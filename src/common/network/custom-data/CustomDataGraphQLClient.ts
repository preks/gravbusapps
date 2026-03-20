import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'
import { getFlowEngineApiBaseUrl } from '@/common/network/flows/flowEngineUrl'
import { FieldNameResolver } from './FieldNameResolver'

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
      const errors = (result as any).errors
      console.error('Custom Data GraphQL errors:', errors)

      // Try to provide helpful field name suggestions
      const enhancedError = await this.enhanceFieldNameErrors(errors)

      throw new Error(`GraphQL error: ${enhancedError}`)
    }

    return (result as any).data as T
  }

  /**
   * Enhance GraphQL errors with field name suggestions for common field mismatch errors.
   */
  private async enhanceFieldNameErrors(errors: any[]): Promise<string> {
    const fieldErrorPattern = /Cannot query field "(\w+)" on type "(\w+)"/
    const errorMessages: string[] = []

    for (const err of errors) {
      const message = err.message || JSON.stringify(err)
      const match = message.match(fieldErrorPattern)

      if (match) {
        const [, requestedField, entityType] = match

        try {
          const resolver = new FieldNameResolver(this)
          const suggestion = await resolver.suggestFieldName(entityType, requestedField)

          if (suggestion.suggestedField) {
            errorMessages.push(
              `Cannot query field "${requestedField}" on type "${entityType}". ` +
                `Did you mean "${suggestion.suggestedField}"? ` +
                `(Available fields: ${suggestion.allAvailableFields.slice(0, 5).join(', ')}...)`
            )
          } else {
            errorMessages.push(
              `Cannot query field "${requestedField}" on type "${entityType}". ` +
                `Available fields: ${suggestion.allAvailableFields.join(', ')}`
            )
          }
        } catch {
          errorMessages.push(message)
        }
      } else {
        errorMessages.push(message)
      }
    }

    return errorMessages.join('; ')
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
