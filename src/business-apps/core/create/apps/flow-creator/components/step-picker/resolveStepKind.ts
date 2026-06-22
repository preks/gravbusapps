import { FlowStepType } from '@/common/data/flow/types/flowTemplate'
import type { StudioNode } from '../../types/studioTypes'
import type { StepKindId } from './stepKindTypes'

export function resolveStepKind(node: StudioNode, options?: { connectorEnabled?: boolean }): StepKindId | undefined {
  if (node.type === 'fork') return 'parallelize'

  if (node.type === 'decision' && node.config.nodeType === 'decision') {
    if (node.config.decisionMode === 'AI') return 'decision-ai'
    if (node.config.decisionMode === 'LOGIC') return 'decision-logic'
    if (node.config.userConfig?.userDecisionType === 'APPROVAL') return 'approval'
    return 'decision-user'
  }

  if (node.type !== 'task' || node.config.nodeType !== 'task') return undefined

  const { stepType, functionConfig } = node.config

  if (stepType === FlowStepType.FUNCTION) {
    const hint = functionConfig?.categoryHint
    if (hint === 'connectors') return 'connector'
    if (hint === 'functions') return 'function'
    if (options?.connectorEnabled === true) return 'connector'
    return 'function'
  }

  switch (stepType) {
    case FlowStepType.TASK:
      return 'user-task'
    case FlowStepType.APPROVAL:
      return 'approval'
    case FlowStepType.INFORMATION:
      return 'information'
    case FlowStepType.ACKNOWLEDGE:
      return 'acknowledge'
    case FlowStepType.AI_AGENT:
      return 'ai-agent'
    case FlowStepType.AI_TASK_EXPERT:
      return 'ai-task-expert'
    case FlowStepType.CUSTOM_DATA_MUTATION:
      return 'save-to-custom-data'
    default:
      return 'user-task'
  }
}

export function resolveStepKindFromStudioNode(
  node: StudioNode,
  functions: Array<{ id: string; connectorEnabled?: boolean }>
): StepKindId | undefined {
  let connectorEnabled: boolean | undefined
  if (node.config.nodeType === 'task' && node.config.stepType === FlowStepType.FUNCTION) {
    const fnId = node.config.functionConfig?.functionId
    const selectedFn = fnId ? functions.find(f => f.id === fnId) : undefined
    connectorEnabled = selectedFn?.connectorEnabled === true
  }
  return resolveStepKind(node, { connectorEnabled })
}
