import { env } from '../../env/EnvUtils'
import { setAccessTokenToAuthorizationHeader } from '../HeaderUtils'

export class GraphQLClient {
  private endpoint: string
  private headers: Record<string, string> = {}

  constructor(endpoint: string, headers: Record<string, string> = {}) {
    this.endpoint = endpoint
    this.headers = headers
  }

  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {}
    }

    this.headers['Authorization'] = setAccessTokenToAuthorizationHeader(accessToken)
  }

  async request<T = any>(
    query: string,
    variables?: Record<string, any>,
    options?: { signal?: AbortSignal }
  ): Promise<T> {
    if (!this.endpoint) {
      throw new Error(
        'GraphQL endpoint is not configured. Please check NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK environment variable.'
      )
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
      }),
      signal: options?.signal
    })

    if (response.status === 302 || response.status === 301) {
      const location = response.headers.get('location')
      console.error(`GraphQL request redirected (${response.status}) to: ${location}`)
      throw new Error(`Redirect detected: ${response.status} ${response.statusText} -> ${location}`)
    }

    if (!response.ok) {
      try {
        const errorText = await response.text()
        console.error('Error response body:', errorText)
        throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}\nResponse: ${errorText}`)
      } catch {
        throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`)
      }
    }

    const result = await response.json()

    if (result.errors) {
      console.error('GraphQL errors:', result.errors)
      throw new Error(`GraphQL error: ${JSON.stringify(result.errors)}`)
    }

    return result.data
  }
}

export const graphQLClient = new GraphQLClient(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK') ?? '')
