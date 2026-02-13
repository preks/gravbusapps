/**
 * Discovery domain types for the AI Orchestrator.
 * Defines resource discovery and reuse functionality.
 */

import type { ComponentType } from './components'

// Discovery result for a component
export interface DiscoveryResult {
  componentId: string
  componentType: ComponentType
  componentName: string
  found: boolean
  existingId?: string
  matchType?: 'exact_name' | 'similar_name' | 'schema_match' | 'graphql_schema'
  matchConfidence?: number // 0.0 to 1.0
  existingResourceInfo?: Record<string, unknown>
}

// Summary of the discovery phase
export interface DiscoveryResults {
  jobId: string
  totalChecked: number
  foundExisting: number
  willCreate: number
  results: DiscoveryResult[]
}
