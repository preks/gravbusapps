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
  AnalyzeStreamEvent,
  ExecuteRequest,
  UpdatePlanRequest,
  RefinePlanRequest,
  ListPlansParams,
  ListPlansResponse,
  ListPlansPaging,
  ListPlansLinks,
  DraftCheckpoint,
  CreateDraftCheckpointRequest,
  RestoreDraftCheckpointRequest,
  RestoreDraftCheckpointResponse
} from './api'

// Progress tracking types
export type { ProgressEventType, BuildProgressEvent, BuildJobStatus } from './progress'

// Discovery domain types
export type { DiscoveryResult, DiscoveryResults } from './discovery'

// Wiring domain types
export type { AgentToolUpdate, FlowStepUpdate, FlowUpdate, ScreenUpdate, WiringPlan } from './wiring'

// UI state types
export type { OrchestratorViewState, ComponentTileInfo, TileState } from './ui'

// Chat types
export type {
  ChatMessageRole,
  ChatMessageType,
  ChatMessageBlock,
  ChatMessageToolCall,
  CreateChatMessage,
  CanvasTab,
  CanvasTabInfo
} from './chat'
export { CANVAS_TABS } from './chat'
