import type { FlowGraphEdge, FlowNodeType } from '@/common/components/flow/flow-viewer'

type FlowNodeLike = {
  id: string
  label?: string
  type: FlowNodeType
  config?: {
    nodeType?: string
    enabled?: boolean
    title?: string
  }
}

type TaskNavigationDirection = 'downstream' | 'upstream'

export type TaskNavigationCandidate = {
  taskId: string
  label: string
  pathLabel?: string
}

function isForwardEdge(edge: FlowGraphEdge): boolean {
  return String(edge.direction || 'forward').toLowerCase() !== 'backward'
}

function getAdjacentEdges(edges: FlowGraphEdge[], nodeId: string, direction: TaskNavigationDirection): FlowGraphEdge[] {
  return edges.filter(edge => {
    if (!isForwardEdge(edge)) return false
    return direction === 'downstream' ? edge.source === nodeId : edge.target === nodeId
  })
}

function getAdjacentNodeId(edge: FlowGraphEdge, direction: TaskNavigationDirection): string {
  return direction === 'downstream' ? edge.target : edge.source
}

function getTaskLabel(node: FlowNodeLike): string {
  return node.config?.title || node.label || node.id
}

function appendPathLabel(pathLabels: string[], edge: FlowGraphEdge): string[] {
  const label = edge.label?.trim()
  if (!label || pathLabels.includes(label)) return pathLabels
  return [...pathLabels, label]
}

function mergeCandidate(candidates: Map<string, TaskNavigationCandidate>, candidate: TaskNavigationCandidate): void {
  const existing = candidates.get(candidate.taskId)
  if (!existing) {
    candidates.set(candidate.taskId, candidate)
    return
  }

  if (!candidate.pathLabel || existing.pathLabel?.includes(candidate.pathLabel)) return
  candidates.set(candidate.taskId, {
    ...existing,
    pathLabel: existing.pathLabel ? `${existing.pathLabel} / ${candidate.pathLabel}` : candidate.pathLabel
  })
}

function getNearestTaskCandidates(
  nodes: FlowNodeLike[],
  edges: FlowGraphEdge[],
  nodeId: string,
  direction: TaskNavigationDirection
): TaskNavigationCandidate[] {
  const nodesById = new Map(nodes.map(node => [node.id, node]))
  const queue = getAdjacentEdges(edges, nodeId, direction).map(edge => ({
    nodeId: getAdjacentNodeId(edge, direction),
    pathLabels: appendPathLabel([], edge),
    visited: new Set<string>([nodeId])
  }))
  const candidates = new Map<string, TaskNavigationCandidate>()

  while (queue.length > 0) {
    const current = queue.shift()!
    if (current.visited.has(current.nodeId)) continue

    const visited = new Set(current.visited)
    visited.add(current.nodeId)

    const candidate = nodesById.get(current.nodeId)
    if (candidate?.type === 'task' && candidate.config?.enabled !== false) {
      const pathLabel = current.pathLabels.join(' > ')
      mergeCandidate(candidates, {
        taskId: candidate.id,
        label: getTaskLabel(candidate),
        ...(pathLabel ? { pathLabel } : {})
      })
      continue
    }

    getAdjacentEdges(edges, current.nodeId, direction).forEach(edge => {
      queue.push({
        nodeId: getAdjacentNodeId(edge, direction),
        pathLabels: appendPathLabel(current.pathLabels, edge),
        visited
      })
    })
  }

  return Array.from(candidates.values())
}

function getNearestTaskId(
  nodes: FlowNodeLike[],
  edges: FlowGraphEdge[],
  nodeId: string,
  direction: TaskNavigationDirection
): string | null {
  return getNearestTaskCandidates(nodes, edges, nodeId, direction)[0]?.taskId ?? null
}

export function getNearestDownstreamTaskCandidates(
  nodes: FlowNodeLike[],
  edges: FlowGraphEdge[],
  nodeId: string
): TaskNavigationCandidate[] {
  return getNearestTaskCandidates(nodes, edges, nodeId, 'downstream')
}

export function getNearestUpstreamTaskCandidates(
  nodes: FlowNodeLike[],
  edges: FlowGraphEdge[],
  nodeId: string
): TaskNavigationCandidate[] {
  return getNearestTaskCandidates(nodes, edges, nodeId, 'upstream')
}

export function getNearestDownstreamTaskId(
  nodes: FlowNodeLike[],
  edges: FlowGraphEdge[],
  nodeId: string
): string | null {
  return getNearestTaskId(nodes, edges, nodeId, 'downstream')
}

export function getNearestUpstreamTaskId(nodes: FlowNodeLike[], edges: FlowGraphEdge[], nodeId: string): string | null {
  return getNearestTaskId(nodes, edges, nodeId, 'upstream')
}
