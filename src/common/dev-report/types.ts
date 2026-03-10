export type GravityIssueType = 'BUG' | 'SUGGESTION'

export interface GravityIssueReporter {
  nwUserId?: string
  name?: string
  userName?: string
}

export interface GravityIssueBuildInfo {
  screen?: string
  gitUser?: string
  publishTime?: string
  prUrl?: string | null
  pipelineUrl?: string | null
  buildNumber?: string | null
}

export interface GravityIssueEvidence {
  screenshot?: {
    dataUrl: string
    mimeType: 'image/jpeg'
    width: number
    height: number
  } | null
  screenshotError?: string | null
  telemetry?: {
    console: Array<{ t: string; level: 'error' | 'warn'; message: string }>
    network: Array<{ t: string; method: string; url: string; status: number | null; ok: boolean; durationMs: number }>
  } | null
}

export interface CreateGravityIssueRequest {
  screenKey: string
  type: GravityIssueType
  title: string
  description: string
  pageUrl?: string
  reportedEnvironment?: string
  reporter?: GravityIssueReporter
  buildInfo?: GravityIssueBuildInfo | null
  evidence?: GravityIssueEvidence | null
}

export interface CreateGravityIssueResponse {
  ok: boolean
  issueId?: string
  error?: string
}
