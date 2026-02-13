/**
 * UI state types for the AI Orchestrator.
 * Defines UI-specific state and display structures.
 */

import type { BuildStatus } from './build'
import type { ComponentType } from './components'

// Orchestrator view state
export type OrchestratorViewState =
  | 'idle' // Waiting for user input
  | 'analyzing' // Analyzing prompt
  | 'review' // Showing build plan for review
  | 'discovering' // Discovering existing resources
  | 'building' // Building components
  | 'wiring' // Wiring components together
  | 'complete' // Build finished
  | 'error' // Error occurred

// Component display information for tiles
export interface ComponentTileInfo {
  type: ComponentType
  icon: string
  title: string
  description: string
  status: BuildStatus
  items: Array<{
    id: string
    name: string
    status: BuildStatus
    createdId?: string
    error?: string
    reused?: boolean // Whether this item was reused from existing resource
    discoveryMatch?: string // How it was discovered (exact_name, similar_name, etc.)
  }>
  currentOperation?: string
  progressPercent?: number
  reusedCount?: number // Number of items reused from existing resources
}

// Tile state for the progress grid (keys match ComponentType)
export interface TileState {
  screen: ComponentTileInfo
  agent: ComponentTileInfo
  function: ComponentTileInfo
  flow: ComponentTileInfo
  data_model: ComponentTileInfo
}
