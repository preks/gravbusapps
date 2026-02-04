/**
 * Build domain types for the AI Orchestrator.
 * Defines build planning, analysis, and execution state.
 */

import type { ComponentSpec, BuildStatus } from './components'

// Current phase of the build process
export type BuildPhase = 'discovery' | 'building' | 'wiring' | 'complete'

// A question to clarify user intent before building
export interface ClarifyingQuestion {
  id: string
  question: string
  options?: string[] // If multiple choice
  required: boolean
  context?: string // Why this question is being asked
}

// Analysis of what needs to be built
export interface BuildAnalysis {
  summary: string
  intent: string
  complexity: 'simple' | 'moderate' | 'complex'
  requires_data_model: boolean
  requires_functions: boolean
  requires_agents: boolean
  requires_flows: boolean
  requires_screens: boolean
  notes?: string[]
}

// User-friendly summary for non-technical users
export interface UserSummary {
  title: string
  what_you_get: string[]
  what_you_can_do: string[]
  business_value: string
  estimated_time: string
}

// Complete build plan
export interface BuildPlan {
  job_id: string
  original_prompt: string
  analysis: BuildAnalysis
  user_summary?: UserSummary
  components: ComponentSpec[]
  questions?: ClarifyingQuestion[]
  estimated_duration_seconds: number
  created_at: string
  status: BuildStatus
}
