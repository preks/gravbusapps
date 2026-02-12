/**
 * Progress tracking types for the AI Orchestrator.
 * Defines SSE progress events and build job status.
 */

import type { BuildPhase } from './build'
import type { ComponentType, ComponentSpec, BuildStatus } from './components'

// Event types for SSE progress events
export type ProgressEventType =
  // Discovery phase events
  | 'discovery_started'
  | 'discovery_complete'
  | 'component_reused'
  // Building phase events
  | 'build_started'
  | 'component_started'
  | 'component_progress'
  | 'component_completed'
  | 'component_error'
  // Wiring phase events
  | 'wiring_started'
  | 'wiring_progress'
  | 'wiring_completed'
  // Publish phase events (deployment)
  | 'publish_started'
  | 'publish_progress'
  | 'publish_completed'
  | 'publish_error'
  | 'publish_skipped'
  // AI Builder streaming events
  | 'ai_builder_started'
  | 'ai_builder_response' // Streaming AI text chunks
  | 'ai_builder_tool_call'
  | 'ai_builder_tool_result'
  | 'ai_builder_done'
  | 'ai_builder_error'
  | 'screen_generation_complete'
  // Final event
  | 'build_complete'

// Progress event from SSE
export interface BuildProgressEvent {
  eventType: ProgressEventType
  jobId: string
  timestamp: string
  componentType?: ComponentType
  componentId?: string
  componentName?: string
  status: BuildStatus
  message: string
  progressPercent?: number
  createdId?: string
  errorDetails?: string

  // Publish/deployment data
  resourceUrl?: string // URL path for the published screen
  azureUrl?: string // Azure CDN URL
  filesPublished?: number // Number of files published

  // AI Builder streaming data
  content?: string // Streaming text content from AI Builder responses

  // Additional metadata (e.g., generated code, partial results)
  metadata?: Record<string, unknown>

  // Summary for build_complete event
  totalComponents?: number
  completedComponents?: number
  failedComponents?: number
  skippedComponents?: number
}

// Build job status
export interface BuildJobStatus {
  jobId: string
  status: BuildStatus
  originalPrompt: string
  startedAt?: string
  completedAt?: string
  components: ComponentSpec[]
  totalComponents: number
  completedComponents: number
  failedComponents: number
  skippedComponents: number
  reusedComponents?: number // Components reused from existing resources
  currentComponent?: string
  currentPhase?: BuildPhase // Current phase: discovery, building, wiring
  error?: string
}
