// Orchestrator hooks
export { useOrchestratorClient } from './useOrchestratorClient'
export type { UseOrchestratorClientOptions, UseOrchestratorClientResult } from './useOrchestratorClient'

export { useBuildProgress } from './useBuildProgress'
export type { UseBuildProgressOptions, UseBuildProgressResult } from './useBuildProgress'

// New refactored state hooks (for OrchestratorViewEnhanced)
export { useOrchestratorState } from './useOrchestratorState'
export type { UseOrchestratorStateOptions, UseOrchestratorStateResult } from './useOrchestratorState'

export { useThinkingSteps } from './useThinkingSteps'
export type { UseThinkingStepsResult } from './useThinkingSteps'

export { useBuildLogs } from './useBuildLogs'
export type { UseBuildLogsResult } from './useBuildLogs'

// Legacy state hook (for OrchestratorViewConversational)
export { useOrchestratorStateOld } from './useOrchestratorStateOld'
export type { OrchestratorState, UseOrchestratorStateOldOptions } from './useOrchestratorStateOld'

export { useOrchestratorHandlers } from './useOrchestratorHandlers'
export type { OrchestratorHandlers, OrchestratorHandlerDeps } from './useOrchestratorHandlers'

export { useOrchestratorEffects } from './useOrchestratorEffects'
export type { OrchestratorEffectsDeps } from './useOrchestratorEffects'
