import type {
  FlowGraphDefinition,
  FlowGraphNode,
  FlowGraphEdge,
  TaskVariant,
  TriggerType
} from '@/common/components/flow/flow-viewer/types/viewerTypes'

export interface FlowTemplateStepForGraph {
  id?: string
  reference?: string
  type: string
  title: string
  message?: string
  nextStep?: number | null
  defaultNextStep?: number | null
  assignment?: { assignmentMode?: string }
  decisionMode?: 'USER' | 'AI' | 'LOGIC'
  branches?: Array<{
    id?: string
    label?: string
    condition?: string
    targetStepReference?: string
    nextStep?: number | null
  }>
  parallelBranches?: Array<{
    id?: string
    label?: string
    steps?: string[]
  }>
  joinCondition?: 'ALL' | 'ANY'
  forkReference?: string
}

export interface FlowTemplateForGraph {
  steps: FlowTemplateStepForGraph[]
  start?: { triggers?: { type: string; name?: string }[] }
  summaryFieldsCount?: number
}

const START_NODE_ID = 'start'
const END_NODE_ID = 'end'
const STEP_PREFIX = 'step-'
const SYSTEM_STEP_TYPES = new Set(['FUNCTION', 'AI_AGENT', 'AI_TASK_EXPERT', 'CUSTOM_DATA_MUTATION'])

function isDecisionStep(step: FlowTemplateStepForGraph): boolean {
  const type = String(step?.type ?? '').toUpperCase()
  return type === 'GATEWAY' || type === 'DECISION'
}

function isForkStep(step: FlowTemplateStepForGraph): boolean {
  return String(step?.type ?? '').toUpperCase() === 'FORK'
}

function isJoinStep(step: FlowTemplateStepForGraph): boolean {
  return String(step?.type ?? '').toUpperCase() === 'JOIN'
}

function getTaskVariant(type: string): TaskVariant {
  const map: Record<string, TaskVariant> = {
    TASK: 'TASK',
    APPROVAL: 'APPROVAL',
    ACKNOWLEDGE: 'ACKNOWLEDGE',
    INFORMATION: 'INFORMATION',
    FUNCTION: 'FUNCTION',
    AI_AGENT: 'AI_AGENT',
    AI_TASK_EXPERT: 'AI_TASK_EXPERT'
  }

  return map[String(type).toUpperCase()] ?? 'TASK'
}

function getNodeId(_step: FlowTemplateStepForGraph, index: number): string {
  return `${STEP_PREFIX}${index}`
}

function resolveNodeIdByBranchTarget(
  branch: {
    id?: string
    label?: string
    condition?: string
    targetStepReference?: string
    nextStep?: number | null
  },
  stepNodeIds: string[],
  referenceToNodeId: Map<string, string>
): { targetId: string | null; targetIndex: number | null } {
  const reference = String(branch.targetStepReference || '').trim()
  if (reference) {
    const targetId = referenceToNodeId.get(reference)
    if (targetId) {
      const targetIndex = stepNodeIds.indexOf(targetId)
      return { targetId, targetIndex: targetIndex >= 0 ? targetIndex : null }
    }
  }

  if (typeof branch.nextStep === 'number' && stepNodeIds[branch.nextStep]) {
    return { targetId: stepNodeIds[branch.nextStep], targetIndex: branch.nextStep }
  }

  return { targetId: null, targetIndex: null }
}

function resolveNextTarget(
  step: FlowTemplateStepForGraph,
  index: number,
  stepNodeIds: string[]
): { targetId: string | null; targetIndex: number | null } {
  if (step.nextStep === null) return { targetId: null, targetIndex: null }

  if (typeof step.nextStep === 'number' && stepNodeIds[step.nextStep]) {
    return { targetId: stepNodeIds[step.nextStep], targetIndex: step.nextStep }
  }

  const fallbackIndex = index + 1 < stepNodeIds.length ? index + 1 : null
  if (fallbackIndex != null && stepNodeIds[fallbackIndex]) {
    return { targetId: stepNodeIds[fallbackIndex], targetIndex: fallbackIndex }
  }

  return { targetId: null, targetIndex: null }
}

function buildNodes(steps: FlowTemplateStepForGraph[], stepNodeIds: string[]): FlowGraphNode[] {
  return steps.map((step, index) => {
    const nodeId = stepNodeIds[index]

    if (isDecisionStep(step)) {
      return {
        id: nodeId,
        type: 'decision',
        label: step.title || 'Decision',
        metadata: {
          decisionMode: (step.decisionMode ?? 'LOGIC') as 'USER' | 'AI' | 'LOGIC',
          branchCount: Array.isArray(step.branches) ? step.branches.length : 0
        }
      }
    }

    if (isForkStep(step)) {
      return {
        id: nodeId,
        type: 'fork',
        label: step.title || 'Parallel Split',
        metadata: {
          branchCount: Array.isArray(step.parallelBranches) ? step.parallelBranches.length : 0
        }
      }
    }

    if (isJoinStep(step)) {
      return {
        id: nodeId,
        type: 'join',
        label: step.title || 'Parallel Merge',
        metadata: {
          joinCondition: step.joinCondition ?? 'ALL'
        }
      }
    }

    const stepType = String(step.type ?? '').toUpperCase()
    return {
      id: nodeId,
      type: 'task',
      label: step.title || `Step ${index + 1}`,
      metadata: {
        taskVariant: getTaskVariant(stepType),
        description: step.message,
        assignmentMode: step.assignment?.assignmentMode,
        isSystem: SYSTEM_STEP_TYPES.has(stepType),
        stepNumber: index + 1
      }
    }
  })
}

function buildEdges(
  steps: FlowTemplateStepForGraph[],
  stepNodeIds: string[],
  referenceToNodeId: Map<string, string>
): FlowGraphEdge[] {
  const edges: FlowGraphEdge[] = []
  const seenEdgeIds = new Set<string>()

  const addEdge = (edge: FlowGraphEdge) => {
    if (seenEdgeIds.has(edge.id)) return
    seenEdgeIds.add(edge.id)
    edges.push(edge)
  }

  for (const [index, step] of steps.entries()) {
    const sourceId = stepNodeIds[index]

    if (isDecisionStep(step)) {
      const branches = Array.isArray(step.branches) ? step.branches : []
      let branchCount = 0

      for (const branch of branches) {
        const { targetId, targetIndex } = resolveNodeIdByBranchTarget(branch, stepNodeIds, referenceToNodeId)
        if (!targetId) continue

        branchCount += 1
        addEdge({
          id: String(branch.id || `edge-${sourceId}-${targetId}-${branchCount}`),
          source: sourceId,
          target: targetId,
          label: branch.label || branch.condition || `Branch ${branchCount}`,
          direction: targetIndex != null && targetIndex < index ? 'backward' : 'forward',
          metadata: branch.condition ? { condition: branch.condition } : undefined
        })
      }

      if (branchCount === 0 && typeof step.defaultNextStep === 'number' && stepNodeIds[step.defaultNextStep]) {
        addEdge({
          id: `edge-${sourceId}-${stepNodeIds[step.defaultNextStep]}`,
          source: sourceId,
          target: stepNodeIds[step.defaultNextStep],
          label: 'Default',
          direction: step.defaultNextStep < index ? 'backward' : 'forward'
        })
      }

      continue
    }

    if (isForkStep(step)) {
      const branches = Array.isArray(step.parallelBranches) ? step.parallelBranches : []
      let branchCount = 0

      for (const branch of branches) {
        const targetReference = Array.isArray(branch.steps) ? String(branch.steps[0] || '').trim() : ''
        const targetId = targetReference ? referenceToNodeId.get(targetReference) : null
        if (!targetId) continue

        branchCount += 1
        addEdge({
          id: String(branch.id || `edge-${sourceId}-${targetId}-${branchCount}`),
          source: sourceId,
          target: targetId,
          label: branch.label || `Branch ${branchCount}`,
          direction: 'forward'
        })
      }

      continue
    }

    const { targetId } = resolveNextTarget(step, index, stepNodeIds)
    addEdge({
      id: `edge-${sourceId}-${targetId ?? END_NODE_ID}`,
      source: sourceId,
      target: targetId ?? END_NODE_ID,
      direction: 'forward'
    })
  }

  return edges
}

export function templateToFlowGraphDefinition(template: FlowTemplateForGraph): FlowGraphDefinition {
  const steps = Array.isArray(template.steps) ? template.steps : []
  const summaryFieldsCount = template.summaryFieldsCount ?? 0
  const showStart = Boolean(template.start?.triggers?.length)
  const stepNodeIds = steps.map(getNodeId)
  const referenceToNodeId = new Map<string, string>()

  stepNodeIds.forEach((nodeId, index) => {
    referenceToNodeId.set(nodeId, nodeId)
    const reference = String(steps[index]?.reference || steps[index]?.id || '').trim()
    if (reference) referenceToNodeId.set(reference, nodeId)
  })

  const nodes: FlowGraphNode[] = []
  const edges: FlowGraphEdge[] = []

  if (showStart && steps.length > 0) {
    const firstTrigger = template.start?.triggers?.[0]
    nodes.push({
      id: START_NODE_ID,
      type: 'start',
      label: 'Start',
      metadata: { triggerType: (firstTrigger?.type ?? 'MANUAL_FORM') as TriggerType }
    })
    edges.push({
      id: `edge-${START_NODE_ID}-${stepNodeIds[0]}`,
      source: START_NODE_ID,
      target: stepNodeIds[0],
      direction: 'forward'
    })
  }

  if (steps.length > 0) {
    nodes.push(...buildNodes(steps, stepNodeIds))
    nodes.push({
      id: END_NODE_ID,
      type: 'end',
      label: 'Workflow Summary',
      metadata: { summaryFieldsCount }
    })
    edges.push(...buildEdges(steps, stepNodeIds, referenceToNodeId))
  }

  return { nodes, edges }
}

/** Map FlowViewer node id to step index; null for start/end or invalid. */
export function flowNodeIdToStepIndex(nodeId: string): number | null {
  if (nodeId === START_NODE_ID || nodeId === END_NODE_ID) return null

  if (nodeId.startsWith(STEP_PREFIX)) {
    const index = Number.parseInt(nodeId.slice(STEP_PREFIX.length), 10)
    return Number.isNaN(index) ? null : index
  }

  return null
}

/** Step index to FlowViewer node id for task/decision nodes. */
export function stepIndexToFlowNodeId(index: number): string {
  return `${STEP_PREFIX}${index}`
}
