/**
 * Progress tracking types for the AI Orchestrator.
 * Defines SSE progress events and build job status.
 */

import type { BuildPhase } from './build'
import type { ComponentType, ComponentSpec, BuildStatus } from './components'

// Event types for SSE progress events
export type ProgressEventType =
  // Transport-level keepalive
  | 'heartbeat'
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
  | 'wiring_completed'
  | 'wiring_error'
  // Final event
  | 'build_complete'
  | 'build_error'

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
  currentPhase?: BuildPhase // Current phase: discovery, building, wiring, complete
  errorMessage?: string
}
