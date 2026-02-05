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
  // Final event
  | 'build_complete'

// Progress event from SSE
export interface BuildProgressEvent {
  event_type: ProgressEventType
  job_id: string
  timestamp: string
  component_type?: ComponentType
  component_id?: string
  component_name?: string
  status: BuildStatus
  message: string
  progress_percent?: number
  created_id?: string
  error_details?: string

  // Publish/deployment data
  resource_url?: string // URL path for the published screen
  azure_url?: string // Azure CDN URL
  files_published?: number // Number of files published

  // Summary for build_complete event
  total_components?: number
  completed_components?: number
  failed_components?: number
  skipped_components?: number
}

// Build job status
export interface BuildJobStatus {
  job_id: string
  status: BuildStatus
  original_prompt: string
  started_at?: string
  completed_at?: string
  components: ComponentSpec[]
  total_components: number
  completed_components: number
  failed_components: number
  skipped_components: number
  reused_components?: number // Components reused from existing resources
  current_component?: string
  current_phase?: BuildPhase // Current phase: discovery, building, wiring
  error?: string
}
