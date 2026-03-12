/**
 * API contract types for the AI Orchestrator.
 * Defines request/response structures for API communication.
 */

import type { BuildPlan } from './build'
import type { ComponentSpec } from './components'

// Request to analyze a prompt
export interface AnalyzeRequest {
  prompt: string
  context?: Record<string, unknown>
  answers?: Record<string, string>
  /** Builder identity (user who initiated the build) */
  createdBy?: {
    id: string
    employeeId?: string
    firstName?: string
    lastName?: string
    displayName?: string
    email?: string
    pictureThumbnail?: string
    consentToStorePii?: boolean
  }
}

// Response from analyze endpoint
export interface AnalyzeResponse {
  success: boolean
  plan?: BuildPlan
  refinementSummary?: string
  error?: string
}

export type TurnIntent = 'auto' | 'plan_create' | 'plan_refine' | 'build_execute' | 'ui_mutate' | 'publish'
export type TurnScope = 'ui_only' | 'orchestrator_full'

export interface TurnRequest {
  intent: TurnIntent
  scope: TurnScope
  prompt?: string
  jobId?: string
  sessionId?: string
  repoId?: string
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  plan?: BuildPlan
  skipComponents?: string[]
  context?: Record<string, unknown>
  answers?: Record<string, string>
  versionType?: 'major' | 'minor'
  versionNote?: string
  customSystemPrompt?: string
  createdBy?: AnalyzeRequest['createdBy']
}

export interface TurnEvent {
  type: string
  eventType?: string
  error?: string
  message?: string
  content?: string
  data?: unknown
  plan?: BuildPlan
  metadata?: Record<string, unknown>
  result?: unknown
  jobId?: string
  status?: string
  timestamp?: string
  [key: string]: unknown
}

export interface AnalyzeStreamEvent {
  type: string
  content?: string
  progress?: number
  metadata?: Record<string, unknown>
  result?: AnalyzeResponse
  timestamp?: string
}

// Request to execute a build plan
export interface ExecuteRequest {
  jobId: string
  plan?: BuildPlan
  skipComponents?: string[]
  /** Reuse existing session when refining / executing again; omit on first run */
  sessionId?: string
  /** Reuse existing repo when refining / executing again; omit on first run */
  repoId?: string
  /** Builder identity (user who initiated the build) */
  createdBy?: {
    id: string
    employeeId?: string
    firstName?: string
    lastName?: string
    displayName?: string
    email?: string
    pictureThumbnail?: string
    consentToStorePii?: boolean
  }
}

// Request to update an existing build plan
export interface UpdatePlanRequest {
  components?: ComponentSpec[]
  estimatedDurationSeconds?: number
  analysisNotes?: string[]
  updateReason?: string
}

// Request to refine an existing build plan with natural language feedback
export interface RefinePlanRequest {
  feedback: string
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
}

// Query params for list plans (GET /orchestration/plans)
export interface ListPlansParams {
  /** Page size (1–100), default 50 */
  limit?: number
  /** Number of plans to skip, default 0 */
  offset?: number
  /** Sort: -createdAt (newest first), +createdAt (oldest first), default -createdAt */
  sort?: string
}

// Response from GET /orchestration/plans
export interface ListPlansPaging {
  limit: number
  offset: number
  totalRecords: number
}

export interface ListPlansLinks {
  self: string
  first: string
  prev: string | null
  next: string | null
  last: string
}

export interface ListPlansResponse {
  data: BuildPlan[]
  paging: ListPlansPaging
  _links: ListPlansLinks
}

export interface DraftCheckpoint {
  checkpointId: string
  jobId: string
  sessionId: string
  repoId?: string | null
  name?: string | null
  chatCheckpointMessageId?: string | null
  snapshot: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface CreateDraftCheckpointRequest {
  jobId: string
  sessionId: string
  repoId?: string
  name?: string
  chatCheckpointMessageId?: string
  snapshot?: Record<string, unknown>
}

export interface RestoreDraftCheckpointRequest {
  checkpointId: string
  sessionId?: string
  applyPlanSnapshot?: boolean
}

export interface RestoreDraftCheckpointResponse {
  checkpoint: DraftCheckpoint
  planRestored?: boolean
  draftDatamodels: Array<Record<string, unknown>>
  datamodelArtifacts: Array<Record<string, unknown>>
}

export interface ResolveDraftCheckpointByMessageParams {
  sessionId: string
  chatCheckpointMessageId: string
  jobId?: string
}

export interface OrchestrationStateNode {
  id: string
  label: string
  terminal: boolean
}

export interface OrchestrationStateTransition {
  from: string
  to: string
  label: string
}

export interface OrchestrationStateMachineResponse {
  states: OrchestrationStateNode[]
  transitions: OrchestrationStateTransition[]
}

export interface JobsByStateJobSummary {
  jobId: string
  state: string
  originalPrompt: string
  currentPhase?: string | null
  sessionId?: string | null
  repoId?: string | null
  startedAt?: string | null
  completedAt?: string | null
  createdAt: string
}

export interface JobsByStateBucket {
  state: string
  count: number
  jobs: JobsByStateJobSummary[]
}

export interface JobsByStateResponse {
  buckets: JobsByStateBucket[]
}

export interface JobsPageResponse {
  data: JobsByStateJobSummary[]
  paging: {
    limit: number
    offset: number
    totalRecords: number
  }
}
