import type { FlowGraphEdge } from '@/common/components/flow/flow-viewer'
import type { StudioNode } from '../types/studioTypes'
import { END_ID, START_ID } from './graphStoreUtils'

function isForwardEdge(edge: FlowGraphEdge): boolean {
  return String((edge as any)?.direction ?? 'forward').toLowerCase() !== 'backward'
}

function buildForwardAdjacency(edges: FlowGraphEdge[]): Map<string, string[]> {
  const adjacency = new Map<string, string[]>()
  for (const e of edges) {
    if (!isForwardEdge(e)) continue
    const list = adjacency.get(e.source) ?? []
    list.push(e.target)
    adjacency.set(e.source, list)
  }
  return adjacency
}

export function orderNodesForTemplate(nodes: StudioNode[], edges: FlowGraphEdge[]): StudioNode[] {
  const startId = nodes.find(n => n.type === 'start')?.id ?? START_ID
  const endId = nodes.find(n => n.type === 'end')?.id ?? END_ID

  const nodeById = new Map(nodes.map(n => [n.id, n] as const))
  const adjacency = buildForwardAdjacency(edges)

  const stepNodeIds = nodes.filter(n => n.id !== startId && n.id !== endId).map(n => n.id)
  const stepNodeIdSet = new Set(stepNodeIds)

  const inDegree = new Map<string, number>()
  for (const id of stepNodeIds) inDegree.set(id, 0)

  for (const edge of edges) {
    if (!isForwardEdge(edge)) continue
    if (edge.source === startId || edge.source === endId || edge.target === startId || edge.target === endId) continue
    if (!stepNodeIdSet.has(edge.source) || !stepNodeIdSet.has(edge.target)) continue
    if (edge.source === edge.target) continue
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1)
  }

  const queue: string[] = []
  for (const id of stepNodeIds) {
    if (inDegree.get(id) === 0) queue.push(id)
  }
  queue.sort((a, b) => a.localeCompare(b))

  const orderedIds: string[] = []
  while (queue.length > 0) {
    const current = queue.shift()!
    orderedIds.push(current)

    const next = adjacency.get(current) ?? []
    for (const targetId of next) {
      if (targetId === endId || !stepNodeIdSet.has(targetId)) continue
      const nextDegree = (inDegree.get(targetId) ?? 0) - 1
      inDegree.set(targetId, nextDegree)
      if (nextDegree === 0) queue.push(targetId)
    }

    queue.sort((a, b) => a.localeCompare(b))
  }

  for (const id of stepNodeIds) {
    if (!orderedIds.includes(id)) orderedIds.push(id)
  }

  return orderedIds.map(id => nodeById.get(id)).filter(Boolean) as StudioNode[]
}

export function buildStepIndexByNodeId(nodes: StudioNode[], edges: FlowGraphEdge[]): Map<string, number> {
  const ordered = orderNodesForTemplate(nodes, edges)
  const stepNodes = ordered.filter(n => n.type !== 'start' && n.type !== 'end')
  return new Map(stepNodes.map((n, i) => [n.id, i] as const))
}

/**
 * Legacy mapping used by earlier Flow Studio suggestions: index only task nodes.
 * Kept for compatibility when rewriting existing expressions.
 */
export function buildLegacyTaskIndexByNodeId(nodes: StudioNode[]): Map<string, number> {
  const tasks = nodes.filter(n => n.type === 'task' && n.config?.nodeType === 'task')
  return new Map(tasks.map((n, i) => [n.id, i] as const))
}
