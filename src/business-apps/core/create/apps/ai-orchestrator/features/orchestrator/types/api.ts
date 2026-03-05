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
}

// Response from analyze endpoint
export interface AnalyzeResponse {
  success: boolean
  plan?: BuildPlan
  refinementSummary?: string
  error?: string
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
