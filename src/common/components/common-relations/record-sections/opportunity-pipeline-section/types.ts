import type { Stage, StageCondition } from '@/components/stage-progression/types'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

// Generic reference data interface for pipeline stages
export interface ReferenceData {
  id: string
  code: string
  value: string
  alternativeCode?: string
  additionalValue1?: string
}

// Function type for extracting stage conditions from raw data
// Receives the full Stage object so contexts can use id, code, or value as needed
export type StageConditionsExtractor = (stageConditionStatuses: any[], stage: Stage) => StageCondition[]

// Function type for converting reference data to stage format
export type ReferenceDataConverter = (referenceData: ReferenceData[] | undefined) => Stage[]

// Function type for checking if tooltips should be enabled
export type TooltipEnabledChecker = (status?: string) => boolean

// Configuration for context-specific behavior
export interface OpportunityPipelineContextConfig {
  // Flow context name for stage transitions
  transitionFlowContext: FlowContextName
  // External context data field names
  opportunityIdField: string
  targetStageRefField: string
  // Function to extract stage conditions from raw data
  extractStageConditions: StageConditionsExtractor
  // Function to check if tooltips should be enabled
  isTooltipEnabled?: TooltipEnabledChecker
}

// Props for the context-agnostic OpportunityStageProgression
export interface OpportunityStageProgressionProps {
  currentStage: string
  stages: ReferenceData[]
  opportunityId: string
  stageConditionStatuses: any[]
  accessToken: string
  contextConfig: OpportunityPipelineContextConfig
  opportunityVersion?: number
  onStageUpdate?: () => void
  readonly?: boolean
  opportunityStatus?: string
  dataTestIdPrefix?: string
}
