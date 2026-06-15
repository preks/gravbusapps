import type { FlowExecutionState, FlowGraphDefinition, FlowNodeType, StepStatus } from './flow-viewer/types/viewerTypes'

const COMPLETED_PATH_STATUSES = new Set<StepStatus>(['completed', 'active', 'failed'])
const STRUCTURAL_NODE_TYPES = new Set<FlowNodeType>(['decision', 'fork', 'join'])

function buildIncomingEdges(definition: FlowGraphDefinition): Map<string, Array<{ id: string; source: string }>> {
  const incomingEdges = new Map<string, Array<{ id: string; source: string }>>()
  definition.edges.forEach(edge => {
    const current = incomingEdges.get(edge.target) ?? []
    current.push({ id: edge.id, source: edge.source })
    incomingEdges.set(edge.target, current)
  })
  return incomingEdges
}

function isExecutedNode(nodeId: string, nodeStates: Record<string, StepStatus>): boolean {
  if (nodeId === 'start') return nodeStates.start === 'completed'
  const status = nodeStates[nodeId]
  return status ? COMPLETED_PATH_STATUSES.has(status) : false
}

function shouldIncludePathSource(
  sourceId: string,
  sourceType: FlowNodeType | undefined,
  nodeStates: Record<string, StepStatus>,
  activeNodeId?: string
): boolean {
  if (sourceId === 'start') return true
  if (sourceId === activeNodeId) return true

  const status = nodeStates[sourceId]
  if (status && COMPLETED_PATH_STATUSES.has(status)) return true

  // Decision/fork/join steps often have no execution status even when the flow
  // took that branch; include them when they connect an already-known path node.
  return sourceType ? STRUCTURAL_NODE_TYPES.has(sourceType) : false
}

function walkPathBackwards(
  definition: FlowGraphDefinition,
  nodeStates: Record<string, StepStatus>,
  seedNodeIds: Iterable<string>,
  activeNodeId?: string
): Pick<FlowExecutionState, 'pathNodeIds' | 'pathEdgeIds'> {
  const nodesById = new Map(definition.nodes.map(node => [node.id, node.type]))
  const incomingEdges = buildIncomingEdges(definition)
  const pathNodeIds = new Set(seedNodeIds)
  const pathEdgeIds = new Set<string>()
  const queue = [...pathNodeIds]

  while (queue.length > 0) {
    const nodeId = queue.shift()
    if (!nodeId) continue

    const incoming = incomingEdges.get(nodeId) ?? []
    incoming.forEach(edge => {
      const sourceType = nodesById.get(edge.source)
      if (!shouldIncludePathSource(edge.source, sourceType, nodeStates, activeNodeId)) return

      pathEdgeIds.add(edge.id)
      if (!pathNodeIds.has(edge.source)) {
        pathNodeIds.add(edge.source)
        queue.push(edge.source)
      }
    })
  }

  return { pathNodeIds: Array.from(pathNodeIds), pathEdgeIds: Array.from(pathEdgeIds) }
}

/** Bold the full route a finished flow took, including decision/fork connectors. */
export function enrichExecutionStateWithCompletedPath(
  definition: FlowGraphDefinition,
  executionState: FlowExecutionState
): FlowExecutionState {
  const executedNodeIds = definition.nodes
    .map(node => node.id)
    .filter(nodeId => isExecutedNode(nodeId, executionState.nodeStates))

  if (executedNodeIds.length === 0) return executionState

  const { pathNodeIds, pathEdgeIds } = walkPathBackwards(definition, executionState.nodeStates, executedNodeIds)

  return { ...executionState, pathNodeIds, pathEdgeIds }
}

/** Bold the route up to the currently active step during replay. */
export function enrichExecutionStateWithActivePath(
  definition: FlowGraphDefinition,
  executionState: FlowExecutionState
): FlowExecutionState {
  const activeNodeId = executionState.activeNodeId
  if (!activeNodeId) return executionState

  const { pathNodeIds, pathEdgeIds } = walkPathBackwards(
    definition,
    executionState.nodeStates,
    [activeNodeId],
    activeNodeId
  )

  return { ...executionState, pathNodeIds, pathEdgeIds }
}
