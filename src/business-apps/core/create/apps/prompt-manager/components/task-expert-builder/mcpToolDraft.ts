export type McpToolAuthType = 'none' | 'bearer' | 'header' | 'basic' | 'oauth_client_credentials'

export type McpToolDraft = {
  name: string
  description: string
  url: string
  transport: 'http' | 'sse' | 'websocket'
  envJson: string
  /** If true, use the current session token if present (fallback to authType). */
  preferSession: boolean
  authType: McpToolAuthType
  bearerToken: string
  basicUsername: string
  basicPassword: string
  headerName: string
  headerValue: string
  oauthTokenUrl: string
  oauthClientId: string
  oauthClientSecret: string
  oauthScope: string
  headersJson: string
}
