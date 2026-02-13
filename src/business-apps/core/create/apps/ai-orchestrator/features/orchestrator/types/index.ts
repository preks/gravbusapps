/**
 * TypeScript types for the AI Orchestrator feature.
 *
 * These types mirror the Python Pydantic models in prompt-manager
 * for type-safe communication between frontend and backend.
 */

// Component domain types
export type {
  ComponentType,
  ScreenSpec,
  AgentSpec,
  FunctionSpec,
  FlowSpec,
  FlowStepSpec,
  DataModelSpec,
  DataModelFieldSpec,
  ComponentSpec
} from './components'

// Build domain types
export type { BuildStatus, BuildPhase, ClarifyingQuestion, BuildAnalysis, UserSummary, BuildPlan } from './build'

// API contract types
export type {
  AnalyzeRequest,
  AnalyzeResponse,
  ExecuteRequest,
  UpdatePlanRequest,
  RefinePlanRequest,
  ListPlansParams,
  ListPlansResponse,
  ListPlansPaging,
  ListPlansLinks
} from './api'

// Progress tracking types
export type { ProgressEventType, BuildProgressEvent, BuildJobStatus } from './progress'

// Discovery domain types
export type { DiscoveryResult, DiscoveryResults } from './discovery'

// Wiring domain types
export type { AgentToolUpdate, FlowStepUpdate, FlowUpdate, ScreenUpdate, WiringPlan } from './wiring'

// UI state types
export type { OrchestratorViewState, ComponentTileInfo, TileState } from './ui'
