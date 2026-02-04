/**
 * Discovery domain types for the AI Orchestrator.
 * Defines resource discovery and reuse functionality.
 */

import type { ComponentType } from './components'

// Discovery result for a component
export interface DiscoveryResult {
  component_id: string
  component_type: ComponentType
  component_name: string
  found: boolean
  existing_id?: string
  match_type?: 'exact_name' | 'similar_name' | 'schema_match' | 'graphql_schema'
  match_confidence?: number // 0.0 to 1.0
  existing_resource_info?: Record<string, unknown>
}

// Summary of the discovery phase
export interface DiscoveryResults {
  job_id: string
  total_checked: number
  found_existing: number
  will_create: number
  results: DiscoveryResult[]
}
