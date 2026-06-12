import type { FlowExecutionState, FlowGraphEdge, StepStatus } from '@/common/components/flow'
import type {
  FlowTestExecutionSnapshot,
  FlowTestStepOutcome,
  FlowTestStepStatus
} from '@/common/network/flows/flowTestExecutionTypes'
import type { StudioNode } from '../types/studioTypes'
import { END_ID, START_ID } from './graphStoreUtils'
import { orderNodesForTemplate } from './studioStepOrder'

function toStepStatus(status: unknown): StepStatus {
  const normalized = String(status || '').toUpperCase()
  if (normalized === 'COMPLETED') return 'completed'
  if (normalized === 'IN_PROGRESS' || normalized === 'RUNNING' || normalized === 'SCHEDULED') return 'active'
  if (normalized === 'FAILED' || normalized === 'TERMINATED') return 'failed'
  if (normalized === 'CANCELED' || normalized === 'CANCELLED' || normalized === 'SKIPPED') return 'skipped'
  return 'pending'
}

function isTerminalStatus(status: string | null | undefined): boolean {
  return ['COMPLETED', 'FAILED', 'TERMINATED', 'TIMED_OUT', 'CANCELED', 'CANCELLED'].includes(
    String(status || '').toUpperCase()
  )
}

function getNodeIdForRuntimeStep(
  step: FlowTestStepStatus,
  nodeIdsByRuntimeReference: Map<string, string>,
  orderedStepNodes: StudioNode[]
): string | null {
  const runtimeReference = String(step.rootTaskReference || '').trim()
  if (runtimeReference && nodeIdsByRuntimeReference.has(runtimeReference)) {
    return nodeIdsByRuntimeReference.get(runtimeReference) ?? null
  }

  const explicitIndex =
    typeof step.rootTaskIndex === 'number'
      ? step.rootTaskIndex
      : runtimeReference.startsWith('step_')
        ? Number(runtimeReference.replace('step_', ''))
        : NaN
  if (Number.isFinite(explicitIndex)) {
    return orderedStepNodes[explicitIndex]?.id ?? null
  }

  return null
}

function hasStarted(snapshot: FlowTestExecutionSnapshot): boolean {
  return Boolean(snapshot.workflowId || snapshot.steps.length > 0 || snapshot.status)
}

function buildPathEdgeIds(
  edges: FlowGraphEdge[],
  pathNodeIds: Set<string>,
  nodeStates: Record<string, StepStatus>
): string[] {
  return edges
    .filter(edge => {
      if (String(edge.direction || 'forward').toLowerCase() === 'backward') return false
      if (!pathNodeIds.has(edge.source) || !pathNodeIds.has(edge.target)) return false
      const sourceStatus = nodeStates[edge.source]
      const targetStatus = nodeStates[edge.target]
      return sourceStatus !== 'pending' && targetStatus !== 'pending'
    })
    .map(edge => edge.id)
}

function inferForwardPathsToReachedNodes(
  edges: FlowGraphEdge[],
  reachedNodeIds: Set<string>
): { pathNodeIds: Set<string>; pathEdgeIds: Set<string> } {
  const forwardEdges = edges.filter(edge => String(edge.direction || 'forward').toLowerCase() !== 'backward')
  const pathNodeIds = new Set<string>()
  const pathEdgeIds = new Set<string>()
  for (const edge of forwardEdges) {
    if (reachedNodeIds.has(edge.source) && reachedNodeIds.has(edge.target)) {
      pathNodeIds.add(edge.source)
      pathNodeIds.add(edge.target)
      pathEdgeIds.add(edge.id)
    }
  }

  return { pathNodeIds, pathEdgeIds }
}

export function buildFlowTestExecutionState(
  nodes: StudioNode[],
  edges: FlowGraphEdge[],
  snapshot: FlowTestExecutionSnapshot | null
): FlowExecutionState | undefined {
  if (!snapshot) return undefined
  const isSingleStepSnapshot = snapshot.reachableStepIndexes?.length === 1

  const orderedStepNodes = orderNodesForTemplate(nodes, edges).filter(
    node => node.id !== START_ID && node.id !== END_ID
  )
  const nodeIdsByRuntimeReference = new Map<string, string>()
  orderedStepNodes.forEach((node, index) => {
    nodeIdsByRuntimeReference.set(node.id, node.id)
    nodeIdsByRuntimeReference.set(`step_${index}`, node.id)
  })
  const reachableNodeIds =
    snapshot.reachableStepIndexes && snapshot.reachableStepIndexes.length > 0
      ? new Set(snapshot.reachableStepIndexes.map(index => orderedStepNodes[index]?.id).filter(Boolean) as string[])
      : null
  const nodesById = new Map(nodes.map(node => [node.id, node] as const))

  const nodeStates: Record<string, StepStatus> = {}
  const pathNodeIdSet = new Set<string>()
  const pendingInputNodeIdSet = new Set<string>()
  const pendingOutputNodeIdSet = new Set<string>()
  const nodeOutcomes: NonNullable<FlowExecutionState['nodeOutcomes']> = {}
  let activeNodeId: string | undefined

  for (const node of orderedStepNodes) {
    if (node.type === 'task' && node.config.nodeType === 'task' && node.config.enabled === false) {
      nodeStates[node.id] = 'skipped'
    }
  }

  for (const step of snapshot.steps) {
    const nodeId = getNodeIdForRuntimeStep(step, nodeIdsByRuntimeReference, orderedStepNodes)
    if (!nodeId) continue

    const status = (step as any).awaitingOutput === true ? 'active' : toStepStatus(step.stepStatus)
    nodeStates[nodeId] = status
    if (status === 'active' && !activeNodeId) activeNodeId = nodeId
    if (status === 'active' || status === 'completed' || status === 'failed') pathNodeIdSet.add(nodeId)
    if ((step as any).awaitingInput === true) pendingInputNodeIdSet.add(nodeId)
    if ((step as any).awaitingOutput === true) pendingOutputNodeIdSet.add(nodeId)
  }

  Object.entries(snapshot.outcomes).forEach(([runtimeReference, outcome]) => {
    const nodeId = nodeIdsByRuntimeReference.get(runtimeReference) ?? runtimeReference
    if (!nodeIdsByRuntimeReference.has(runtimeReference) && !nodes.some(node => node.id === nodeId)) return
    nodeOutcomes[nodeId] = toNodeOutcome(outcome)
  })

  if (!isSingleStepSnapshot && hasStarted(snapshot)) {
    nodeStates[START_ID] = 'completed'
    pathNodeIdSet.add(START_ID)
  }

  const workflowStatus = String(snapshot.status || '').toUpperCase()
  if (!isSingleStepSnapshot && isTerminalStatus(snapshot.status)) {
    nodeStates[END_ID] = workflowStatus === 'COMPLETED' ? 'completed' : 'failed'
    pathNodeIdSet.add(END_ID)
    if (snapshot.summaryData.length > 0) {
      nodeOutcomes[END_ID] = {
        title: 'Flow summary',
        status: snapshot.status ?? undefined,
        taskType: 'SUMMARY',
        fields: snapshot.summaryData,
        outputData: Object.fromEntries(snapshot.summaryData.map(item => [item.label, item.value]))
      }
    }
  } else if (!isSingleStepSnapshot && activeNodeId) {
    nodeStates[END_ID] = 'pending'
  }

  const inferredPath = isSingleStepSnapshot
    ? { pathNodeIds: new Set<string>(), pathEdgeIds: new Set<string>() }
    : inferForwardPathsToReachedNodes(edges, pathNodeIdSet)
  inferredPath.pathNodeIds.forEach(nodeId => {
    pathNodeIdSet.add(nodeId)
    if (!nodeStates[nodeId]) nodeStates[nodeId] = 'completed'
  })

  if (!isTerminalStatus(snapshot.status) && hasStarted(snapshot)) {
    const forwardEdges = edges.filter(edge => String(edge.direction || 'forward').toLowerCase() !== 'backward')
    for (const edge of forwardEdges) {
      if (!pathNodeIdSet.has(edge.source)) continue
      if (nodeStates[edge.source] !== 'completed') continue
      if (reachableNodeIds && !reachableNodeIds.has(edge.target)) continue

      const targetStatus = nodeStates[edge.target]
      if (targetStatus && targetStatus !== 'pending') continue
      const targetNode = nodesById.get(edge.target)
      if (targetNode?.type !== 'task') continue

      pendingInputNodeIdSet.add(edge.target)
      pathNodeIdSet.add(edge.target)
      if (!nodeStates[edge.target]) nodeStates[edge.target] = 'pending'
    }
  }

  const pathNodeIds = Array.from(pathNodeIdSet)
  const pathEdgeIds = Array.from(
    new Set([...inferredPath.pathEdgeIds, ...buildPathEdgeIds(edges, pathNodeIdSet, nodeStates)])
  )

  return {
    nodeStates,
    activeNodeId,
    pathNodeIds,
    pathEdgeIds,
    pendingInputNodeIds: Array.from(pendingInputNodeIdSet),
    pendingOutputNodeIds: Array.from(pendingOutputNodeIdSet),
    nodeOutcomes
  }
}

function toNodeOutcome(outcome: FlowTestStepOutcome): NonNullable<FlowExecutionState['nodeOutcomes']>[string] {
  const executionDetails = outcome.executionDetails ?? {}
  const rawDurationMs = executionDetails.durationMs
  const durationMs =
    typeof rawDurationMs === 'number' &&
    Number.isFinite(rawDurationMs) &&
    rawDurationMs >= 0 &&
    rawDurationMs < 2_147_000_000
      ? rawDurationMs
      : undefined
  const error =
    typeof executionDetails.error === 'string'
      ? executionDetails.error
      : typeof (outcome.outputData as any)?.error === 'string'
        ? (outcome.outputData as any).error
        : undefined

  return {
    title: outcome.stepTitle,
    status: outcome.status,
    timestamp: outcome.timestamp,
    taskType: outcome.taskType,
    fields: outcome.fields,
    inputData: outcome.inputData,
    formData: outcome.formData,
    outputData: outcome.outputData,
    executionDetails,
    error,
    durationMs
  }
}
