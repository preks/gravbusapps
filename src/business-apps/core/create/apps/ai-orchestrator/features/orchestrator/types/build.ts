/**
 * Build domain types for the AI Orchestrator.
 * Defines build planning, analysis, and execution state.
 */

import type { ComponentSpec, BuildStatus } from './components'

export type { BuildStatus } from './components'

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
  requiresDataModel: boolean
  requiresFunctions: boolean
  requiresAgents: boolean
  requiresFlows: boolean
  requiresScreens: boolean
  notes?: string[]
}

// User-friendly summary for non-technical users
export interface UserSummary {
  title: string
  whatYouGet: string[]
  whatYouCanDo: string[]
  businessValue: string
  estimatedTime: string
}

// App-level identity metadata
export interface AppMetadata {
  name: string
  icon: string
  description: string
  longDescription?: string
  category?: string
  tags?: string[]
  version?: string
}

// Complete build plan
export interface BuildPlan {
  jobId: string
  originalPrompt: string
  analysis: BuildAnalysis
  userSummary?: UserSummary
  components: ComponentSpec[]
  questions?: ClarifyingQuestion[]
  estimatedDurationSeconds: number
  createdAt: string
  status: BuildStatus
  appMetadata?: AppMetadata
}
