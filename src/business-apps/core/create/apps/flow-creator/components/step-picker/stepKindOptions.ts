import type React from 'react'
import {
  Bot,
  Brain,
  CheckCircle2,
  ClipboardList,
  Code,
  Code2,
  Database,
  Info,
  Plug,
  Sparkles,
  SplitSquareHorizontal,
  User,
  UserCheck
} from 'lucide-react'
import { FlowStepType } from '@/common/data/flow/types/flowTemplate'
import type { DesignerMode } from '../../types/studioTypes'
import type { StepKindGroupId, StepKindId, StepKindInsertPayload } from './stepKindTypes'
import { isStepKindChangeAllowed } from './stepKindSwitchImpact'

export interface StepKindOption {
  id: StepKindId
  group: StepKindGroupId
  labelKey: string
  descriptionKey: string
  Icon: React.FC<{ className?: string }>
  /** Hidden in simple designer mode when adding or switching step kinds. */
  advancedOnly?: boolean
  /** Hidden when switching kind on an existing node (e.g. parallelize needs edge insert). */
  insertOnly?: boolean
  payload: StepKindInsertPayload
}

export const STEP_KIND_GROUP_ORDER: StepKindGroupId[] = [
  'user-tasks',
  'decisions',
  'ai-tasks',
  'automation',
  'control-flow'
]

export const STEP_KIND_GROUP_LABEL_KEYS: Record<StepKindGroupId, string> = {
  'user-tasks': 'step-kind-group-user-tasks',
  'ai-tasks': 'step-kind-group-ai-tasks',
  automation: 'step-kind-group-automation',
  decisions: 'step-kind-group-decisions',
  'control-flow': 'step-kind-group-control-flow'
}

export const STEP_KIND_OPTIONS: StepKindOption[] = [
  {
    id: 'user-task',
    group: 'user-tasks',
    labelKey: 'step-kind-custom-task',
    descriptionKey: 'step-kind-desc-custom-task',
    Icon: ClipboardList,
    payload: { nodeType: 'task', stepType: FlowStepType.TASK }
  },
  {
    id: 'information',
    group: 'user-tasks',
    labelKey: 'task-type-information',
    descriptionKey: 'step-kind-desc-information',
    Icon: Info,
    payload: { nodeType: 'task', stepType: FlowStepType.INFORMATION }
  },
  {
    id: 'acknowledge',
    group: 'user-tasks',
    labelKey: 'task-type-acknowledge',
    descriptionKey: 'step-kind-desc-acknowledge',
    Icon: CheckCircle2,
    payload: { nodeType: 'task', stepType: FlowStepType.ACKNOWLEDGE }
  },
  {
    id: 'decision-user',
    group: 'decisions',
    labelKey: 'step-kind-custom-decision',
    descriptionKey: 'step-kind-desc-custom-decision',
    Icon: User,
    payload: { nodeType: 'decision', decisionMode: 'USER', userDecisionPreset: 'CUSTOM' }
  },
  {
    id: 'approval',
    group: 'decisions',
    labelKey: 'task-type-approval',
    descriptionKey: 'step-kind-desc-approval',
    Icon: UserCheck,
    payload: { nodeType: 'decision', decisionMode: 'USER', userDecisionPreset: 'APPROVAL' }
  },
  {
    id: 'decision-ai',
    group: 'decisions',
    labelKey: 'decision-mode-ai',
    descriptionKey: 'step-kind-desc-decision-ai',
    Icon: Sparkles,
    payload: { nodeType: 'decision', decisionMode: 'AI' }
  },
  {
    id: 'decision-logic',
    group: 'decisions',
    labelKey: 'decision-mode-logic',
    descriptionKey: 'step-kind-desc-decision-logic',
    Icon: Code,
    advancedOnly: true,
    payload: { nodeType: 'decision', decisionMode: 'LOGIC' }
  },
  {
    id: 'ai-agent',
    group: 'ai-tasks',
    labelKey: 'task-type-ai_agent',
    descriptionKey: 'step-kind-desc-ai-agent',
    Icon: Brain,
    payload: { nodeType: 'task', stepType: FlowStepType.AI_AGENT }
  },
  {
    id: 'ai-task-expert',
    group: 'ai-tasks',
    labelKey: 'task-type-ai_task_expert',
    descriptionKey: 'step-kind-desc-ai-task-expert',
    Icon: Bot,
    advancedOnly: true,
    payload: { nodeType: 'task', stepType: FlowStepType.AI_TASK_EXPERT }
  },
  {
    id: 'function',
    group: 'automation',
    labelKey: 'task-type-function',
    descriptionKey: 'step-kind-desc-function',
    Icon: Code2,
    advancedOnly: true,
    payload: { nodeType: 'task', stepType: FlowStepType.FUNCTION, functionCategoryHint: 'functions' }
  },
  {
    id: 'connector',
    group: 'automation',
    labelKey: 'step-kind-connector',
    descriptionKey: 'step-kind-desc-connector',
    Icon: Plug,
    advancedOnly: true,
    payload: { nodeType: 'task', stepType: FlowStepType.FUNCTION, functionCategoryHint: 'connectors' }
  },
  {
    id: 'save-to-custom-data',
    group: 'automation',
    labelKey: 'task-type-custom_data_mutation',
    descriptionKey: 'step-kind-desc-save-to-custom-data',
    Icon: Database,
    advancedOnly: true,
    payload: { nodeType: 'task', stepType: FlowStepType.CUSTOM_DATA_MUTATION }
  },
  {
    id: 'parallelize',
    group: 'control-flow',
    labelKey: 'step-kind-parallelize',
    descriptionKey: 'step-kind-desc-parallelize',
    Icon: SplitSquareHorizontal,
    advancedOnly: true,
    insertOnly: true,
    payload: { nodeType: 'fork' }
  }
]

export function getStepKindOption(id: StepKindId): StepKindOption | undefined {
  return STEP_KIND_OPTIONS.find(opt => opt.id === id)
}

export function visibleStepKindOptions(
  designerMode: DesignerMode,
  pickerMode: 'insert' | 'change',
  selectedId?: StepKindId
): StepKindOption[] {
  return STEP_KIND_OPTIONS.filter(opt => {
    if (pickerMode === 'change' && selectedId && opt.id === selectedId) return true
    if (pickerMode === 'change' && opt.insertOnly) return false
    if (pickerMode === 'change' && selectedId && !isStepKindChangeAllowed(selectedId, opt.id)) return false
    if (designerMode === 'advanced' || !opt.advancedOnly) return true
    return pickerMode === 'change' && opt.id === selectedId
  })
}

export function visibleStepKindGroups(
  designerMode: DesignerMode,
  pickerMode: 'insert' | 'change',
  selectedId?: StepKindId
): Array<{ id: StepKindGroupId; options: StepKindOption[] }> {
  const visible = visibleStepKindOptions(designerMode, pickerMode, selectedId)
  return STEP_KIND_GROUP_ORDER.map(groupId => ({
    id: groupId,
    options: visible.filter(opt => opt.group === groupId)
  })).filter(group => group.options.length > 0)
}
