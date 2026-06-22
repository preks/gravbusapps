import type { FlowStepType } from '@/common/data/flow/types/flowTemplate'
import type { DecisionMode } from '../../types/studioTypes'

export type StepKindId =
  | 'user-task'
  | 'approval'
  | 'information'
  | 'acknowledge'
  | 'ai-agent'
  | 'ai-task-expert'
  | 'function'
  | 'connector'
  | 'save-to-custom-data'
  | 'decision-user'
  | 'decision-ai'
  | 'decision-logic'
  | 'parallelize'

export type FunctionCategoryHint = 'connectors' | 'functions'

export type StepKindInsertPayload =
  | {
      nodeType: 'task'
      stepType: FlowStepType
      functionCategoryHint?: FunctionCategoryHint
      preset?: 'HYBRID'
    }
  | {
      nodeType: 'decision'
      decisionMode: DecisionMode
      /** USER decisions only: approval (Approve/Reject) vs custom outcomes. */
      userDecisionPreset?: 'APPROVAL' | 'CUSTOM'
    }
  | {
      nodeType: 'fork'
    }

export type StepKindPickerMode = 'insert' | 'change'

export type StepKindGroupId = 'user-tasks' | 'ai-tasks' | 'automation' | 'decisions' | 'control-flow'
