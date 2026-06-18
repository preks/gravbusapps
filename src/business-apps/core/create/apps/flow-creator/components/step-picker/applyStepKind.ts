import { v4 as uuid } from 'uuid'
import { AssignmentMode, FlowStepType } from '@/common/data/flow/types/flowTemplate'
import type { FlowGraphEdge } from '@/common/components/flow/flow-viewer'
import type { DesignerMode, DecisionNodeConfig, StudioNode, TaskNodeConfig } from '../../types/studioTypes'
import { collapseOutgoingEdgesForTaskNode, createDefaultConfig, createEdge } from '../../utils/graphStoreUtils'
import type { FunctionCategoryHint, StepKindId, StepKindInsertPayload } from './stepKindTypes'
import { getStepKindOption } from './stepKindOptions'
import { userDecisionBranchLabels } from './decisionUserKind'

const AUTOMATION_STEP_TYPES = [FlowStepType.FUNCTION, FlowStepType.AI_AGENT, FlowStepType.AI_TASK_EXPERT]

function isAutomationStepType(stepType: FlowStepType): boolean {
  return AUTOMATION_STEP_TYPES.includes(stepType)
}

const NEUTRAL_SYSTEM_ASSIGNMENT = {
  targets: null,
  assignmentMode: AssignmentMode.ASSIGN,
  allowReassignment: true
}

export function payloadForStepKind(kindId: StepKindId): StepKindInsertPayload {
  const option = getStepKindOption(kindId)
  if (!option) {
    throw new Error(`Unknown step kind: ${kindId}`)
  }
  return option.payload
}

export function graphLabelForDecisionPayload(
  payload: Extract<StepKindInsertPayload, { nodeType: 'decision' }>
): string {
  if (payload.userDecisionPreset === 'APPROVAL') return 'Approval'
  if (payload.userDecisionPreset === 'CUSTOM') return 'Decision'
  if (payload.decisionMode === 'AI') return 'AI Decision'
  if (payload.decisionMode === 'LOGIC') return 'Logic Decision'
  return 'Decision'
}

/** Align outgoing decision edges with the selected step kind (edges are canonical for branches). */
export function syncDecisionEdgesForPayload(
  nodeId: string,
  edges: FlowGraphEdge[],
  payload: Extract<StepKindInsertPayload, { nodeType: 'decision' }>,
  fallbackTarget: string
): FlowGraphEdge[] {
  if (payload.decisionMode !== 'USER') {
    return edges
  }

  const labels = userDecisionBranchLabels(payload.userDecisionPreset ?? 'APPROVAL')
  const withoutOutgoing = edges.filter(edge => edge.source !== nodeId)
  const outgoing = edges.filter(edge => edge.source === nodeId && edge.direction !== 'backward')
  const backward = edges.filter(edge => edge.source === nodeId && edge.direction === 'backward')
  const target = outgoing.find(edge => edge.direction === 'forward')?.target ?? outgoing[0]?.target ?? fallbackTarget

  const nextOutgoing = labels.map((label, index) => {
    const existing = outgoing[index]
    if (existing) {
      return { ...existing, label, direction: existing.direction ?? ('forward' as const) }
    }
    return createEdge(nodeId, target, label, 'forward')
  })

  return [...withoutOutgoing, ...nextOutgoing, ...backward]
}

/** Single entry point for changing step kind on an existing node (node config + graph edges). */
export function applyStepKindChange(
  node: StudioNode,
  edges: FlowGraphEdge[],
  kindId: StepKindId,
  mode: DesignerMode,
  options: { endNodeId: string }
): { node: StudioNode; edges: FlowGraphEdge[] } {
  const payload = payloadForStepKind(kindId)
  const { node: nextNode } = applyStepKindToNode(node, kindId, mode)

  if (payload.nodeType === 'decision') {
    const fallbackTarget =
      edges.find(edge => edge.source === node.id && edge.direction === 'forward')?.target ?? options.endNodeId
    return {
      node: nextNode,
      edges: syncDecisionEdgesForPayload(node.id, edges, payload, fallbackTarget)
    }
  }

  if (nextNode.type === 'task' && node.type === 'decision') {
    return {
      node: nextNode,
      edges: collapseOutgoingEdgesForTaskNode(node, edges, options.endNodeId)
    }
  }

  return { node: nextNode, edges }
}

export function buildDecisionConfigForMode(decisionMode: DecisionNodeConfig['decisionMode']): DecisionNodeConfig {
  return buildDecisionConfigForPayload({ nodeType: 'decision', decisionMode })
}

export function buildDecisionConfigForPayload(
  payload: Extract<StepKindInsertPayload, { nodeType: 'decision' }>
): DecisionNodeConfig {
  const { decisionMode, userDecisionPreset } = payload
  if (decisionMode !== 'USER') {
    const base = createDefaultConfig('decision') as DecisionNodeConfig
    return {
      ...base,
      decisionMode,
      userConfig: undefined,
      aiConfig: decisionMode === 'AI' ? { humanInstructions: '' } : undefined,
      logicConfig: decisionMode === 'LOGIC' ? { conditions: [] } : undefined,
      rejectRework: undefined,
      links: []
    }
  }

  if (userDecisionPreset === 'CUSTOM') {
    const option1Id = uuid()
    const option2Id = uuid()
    return {
      nodeType: 'decision',
      decisionMode: 'USER',
      links: [],
      branches: [
        { id: option1Id, label: 'Option 1' },
        { id: option2Id, label: 'Option 2' }
      ],
      userConfig: {
        userDecisionType: 'CUSTOM',
        assignment: { targets: null, assignmentMode: AssignmentMode.CLAIM },
        options: [
          { id: option1Id, label: 'Option 1' },
          { id: option2Id, label: 'Option 2' }
        ]
      }
    }
  }

  return createDefaultConfig('decision') as DecisionNodeConfig
}

function isFunctionConnectorKindSwitch(
  nextHint: FunctionCategoryHint | undefined,
  currentHint: FunctionCategoryHint | undefined
): boolean {
  if (!nextHint || !currentHint) return false
  return nextHint !== currentHint
}

export function applyStepKindToTaskConfig(
  current: TaskNodeConfig,
  payload: Extract<StepKindInsertPayload, { nodeType: 'task' }>,
  mode: DesignerMode
): TaskNodeConfig {
  const { stepType, functionCategoryHint, preset } = payload
  const isAutomation = isAutomationStepType(stepType)
  const keepFunctionConfig =
    stepType === FlowStepType.FUNCTION &&
    current.stepType === FlowStepType.FUNCTION &&
    !isFunctionConnectorKindSwitch(functionCategoryHint, current.functionConfig?.categoryHint)
  const keepTaskExpertConfig =
    stepType === FlowStepType.AI_TASK_EXPERT && current.stepType === FlowStepType.AI_TASK_EXPERT

  let nextFunctionConfig: TaskNodeConfig['functionConfig']
  if (stepType === FlowStepType.FUNCTION) {
    const hint: FunctionCategoryHint | undefined = functionCategoryHint ?? current.functionConfig?.categoryHint
    if (keepFunctionConfig) {
      nextFunctionConfig = {
        ...current.functionConfig,
        functionId: current.functionConfig?.functionId ?? '',
        ...(hint !== undefined ? { categoryHint: hint } : {})
      }
    } else if (hint !== undefined) {
      nextFunctionConfig = { functionId: '', categoryHint: hint }
    } else {
      nextFunctionConfig = { functionId: '' }
    }
  } else {
    nextFunctionConfig = undefined
  }

  const title =
    stepType === FlowStepType.TASK && current.stepType === FlowStepType.TASK
      ? current.title
      : preset === 'HYBRID'
        ? 'Hybrid Task'
        : 'New Task'

  return {
    ...current,
    stepType,
    kind: isAutomation ? 'SYSTEM' : 'USER',
    title,
    assignment: isAutomation ? (NEUTRAL_SYSTEM_ASSIGNMENT as TaskNodeConfig['assignment']) : current.assignment,
    form: isAutomation ? [] : current.form,
    links: stepType === FlowStepType.FUNCTION || stepType === FlowStepType.AI_TASK_EXPERT ? [] : (current.links ?? []),
    dueInMinutes: isAutomation ? undefined : current.dueInMinutes,
    defaultPriority: isAutomation ? undefined : current.defaultPriority,
    customStates: isAutomation ? undefined : current.customStates,
    eventSubscriptions: isAutomation ? undefined : current.eventSubscriptions,
    reworkConfig: isAutomation ? undefined : current.reworkConfig,
    functionConfig: nextFunctionConfig,
    agentConfig: keepTaskExpertConfig ? current.agentConfig : undefined,
    permissionContext:
      stepType === FlowStepType.AI_AGENT
        ? (current.permissionContext ?? { contextType: 'USER', permissions: ['read', 'write', 'execute'] })
        : undefined,
    simpleAIConfig:
      mode === 'simple' && stepType === FlowStepType.AI_TASK_EXPERT
        ? { instruction: current.simpleAIConfig?.instruction ?? '' }
        : undefined
  }
}

export function buildTaskConfigForKind(
  payload: Extract<StepKindInsertPayload, { nodeType: 'task' }>,
  mode: DesignerMode
): TaskNodeConfig {
  const base = createDefaultConfig('task') as TaskNodeConfig
  return applyStepKindToTaskConfig(base, payload, mode)
}

export function applyStepKindToNode(
  node: StudioNode,
  kindId: StepKindId,
  mode: DesignerMode
): { node: StudioNode; label?: string } {
  const payload = payloadForStepKind(kindId)

  if (payload.nodeType === 'fork') {
    return { node }
  }

  if (payload.nodeType === 'decision') {
    const config = buildDecisionConfigForPayload(payload)
    return {
      node: {
        ...node,
        type: 'decision',
        label: graphLabelForDecisionPayload(payload),
        config
      }
    }
  }

  const taskConfig = applyStepKindToTaskConfig(
    node.config.nodeType === 'task' ? (node.config as TaskNodeConfig) : (createDefaultConfig('task') as TaskNodeConfig),
    payload,
    mode
  )
  const label = payload.preset === 'HYBRID' ? 'Hybrid Task' : taskConfig.title

  return {
    node: {
      ...node,
      type: 'task',
      label,
      config: taskConfig
    },
    label
  }
}

export function ensureDecisionBranchIds(config: DecisionNodeConfig): DecisionNodeConfig {
  if (config.branches.length >= 2) return config
  return {
    ...config,
    branches: [
      { id: uuid(), label: 'Approve' },
      { id: uuid(), label: 'Reject' }
    ]
  }
}
