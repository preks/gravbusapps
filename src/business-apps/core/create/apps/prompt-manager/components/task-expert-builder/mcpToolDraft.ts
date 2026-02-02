export type McpToolAuthType = 'none' | 'session' | 'bearer' | 'header'

export type McpToolDraft = {
  name: string
  description: string
  url: string
  transport: 'http' | 'sse' | 'websocket'
  envJson: string
  authType: McpToolAuthType
  bearerToken: string
  headerName: string
  headerValue: string
  headersJson: string
}
