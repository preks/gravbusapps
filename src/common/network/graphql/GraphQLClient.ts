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

  async request<T = any>(query: string, variables?: Record<string, any>): Promise<T> {
    if (!this.endpoint) {
      throw new Error(
        'GraphQL endpoint is not configured. Please check NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK environment variable.'
      )
    }

    const operationMatch = /\b(query|mutation)\s+(\w+)/.exec(query)
    const operationType = operationMatch?.[1] ?? 'unknown'
    const operationName = operationMatch?.[2] ?? 'anonymous'
    const variableKeys = variables
      ? Object.keys(variables).sort((left, right) => left.localeCompare(right, 'en', { sensitivity: 'base' }))
      : []
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ed611493-841a-49f3-bdb3-51459a47d6c7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runId: 'run-1',
        hypothesisId: 'H1',
        location: 'GraphQLClient.ts:32',
        message: 'GraphQL request start',
        data: { operationType, operationName, variableKeys },
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
      console.error(`GraphQL request redirected (${response.status}) to: ${location}`)
      throw new Error(`Redirect detected: ${response.status} ${response.statusText} -> ${location}`)
    }

    if (!response.ok) {
      try {
        const errorText = await response.text()
        console.error('Error response body:', errorText)
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ed611493-841a-49f3-bdb3-51459a47d6c7', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runId: 'run-1',
            hypothesisId: 'H4',
            location: 'GraphQLClient.ts:57',
            message: 'GraphQL non-OK response',
            data: {
              operationName,
              status: response.status,
              statusText: response.statusText,
              bodyPreview: errorText.slice(0, 180)
            },
            timestamp: Date.now()
          })
        }).catch(() => {})
        // #endregion
        throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}\nResponse: ${errorText}`)
      } catch {
        throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`)
      }
    }

    const result = await response.json()

    if (result.errors) {
      console.error('GraphQL errors:', result.errors)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed611493-841a-49f3-bdb3-51459a47d6c7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId: 'run-1',
          hypothesisId: 'H1',
          location: 'GraphQLClient.ts:70',
          message: 'GraphQL result.errors returned',
          data: {
            operationName,
            errorCount: Array.isArray(result.errors) ? result.errors.length : 1,
            firstError: result.errors?.[0]?.message,
            firstCode: result.errors?.[0]?.extensions?.code
          },
          timestamp: Date.now()
        })
      }).catch(() => {})
      // #endregion
      throw new Error(`GraphQL error: ${JSON.stringify(result.errors)}`)
    }

    if (['getUserProfile', 'GetOrganizationalUnits', 'GetBackofficeAnalyticsData'].includes(operationName)) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed611493-841a-49f3-bdb3-51459a47d6c7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId: 'run-3',
          hypothesisId: 'H7',
          location: 'GraphQLClient.ts:78',
          message: 'Tracked GraphQL operation succeeded',
          data: { operationName },
          timestamp: Date.now()
        })
      }).catch(() => {})
      // #endregion
    }

    return result.data
  }
}

export const graphQLClient = new GraphQLClient(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK') ?? '')
