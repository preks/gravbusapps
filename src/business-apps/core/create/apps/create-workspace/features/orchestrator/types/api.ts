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
  refinement_summary?: string
  error?: string
}

// Request to execute a build plan
export interface ExecuteRequest {
  job_id: string
  plan?: BuildPlan
  skip_components?: string[]
}

// Request to update an existing build plan
export interface UpdatePlanRequest {
  components?: ComponentSpec[]
  estimated_duration_seconds?: number
  analysis_notes?: string[]
  update_reason?: string
}

// Request to refine an existing build plan with natural language feedback
export interface RefinePlanRequest {
  feedback: string
}
