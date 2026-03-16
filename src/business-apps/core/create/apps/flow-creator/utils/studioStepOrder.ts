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

  const visited = new Set<string>()
  const orderedIds: string[] = []

  const initial = adjacency.get(startId) ?? []
  const stack: string[] = []
  for (let i = initial.length - 1; i >= 0; i--) stack.push(initial[i])

  while (stack.length > 0) {
    const current = stack.pop()!
    if (!current || current === startId || current === endId) continue
    if (visited.has(current)) continue
    const node = nodeById.get(current)
    if (!node) continue
    visited.add(current)
    orderedIds.push(current)

    const next = adjacency.get(current) ?? []
    for (let i = next.length - 1; i >= 0; i--) stack.push(next[i])
  }

  // Append any remaining nodes (incl. unreachable) to avoid data loss.
  for (const n of nodes) {
    if (n.id === startId || n.id === endId) continue
    if (visited.has(n.id)) continue
    orderedIds.push(n.id)
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
