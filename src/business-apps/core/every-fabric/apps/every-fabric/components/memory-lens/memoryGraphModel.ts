import type { MemoryNamespace } from '../settings/agentSettings.types'
import { formatMemoryTitle, type MemoryLensEntry } from './memoryLensModel'

/**
 * Incremental, in-session graph store for the Memory Mind Map.
 *
 * The graph grows progressively as the user explores: topic / entity "hubs"
 * are seeded from the cheap overview aggregate, and memory nodes (plus their
 * links to the hubs they touch) are merged in only when a hub is expanded or a
 * search returns. Node and link objects keep stable identity across merges so
 * the d3 force simulation can preserve positions and stay smooth.
 */

export type GraphNodeKind = 'memory' | 'topic' | 'entity'

export interface GraphNode {
  id: string
  kind: GraphNodeKind
  label: string
  /** Number of links touching this node (recomputed after every merge). */
  degree: number
  // d3-force mutates the following at runtime; kept here so identity persists.
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
  // Hub-only (topic / entity): aggregate count from the overview.
  count?: number
  /** True once a hub's first page of memories has been pulled in. */
  expanded?: boolean
  // Memory-only.
  namespace?: MemoryNamespace
  entry?: MemoryLensEntry
  salience?: number
  occurredAt?: string
}

export interface GraphLink {
  id: string
  // d3-force replaces the string id with the resolved node object after init.
  source: string | GraphNode
  target: string | GraphNode
}

export interface MemoryGraph {
  nodes: Map<string, GraphNode>
  links: Map<string, GraphLink>
}

export interface GraphOverview {
  topics?: Array<{ label: string; count: number }>
  entities?: Array<{ label: string; count: number }>
}

const norm = (value: string): string => value.trim().toLowerCase()

export const topicId = (label: string): string => `topic:${norm(label)}`
export const entityId = (label: string): string => `entity:${norm(label)}`
export const memoryId = (entry: { namespace: string; key: string }): string => `mem:${entry.namespace}:${entry.key}`

const makeLinkId = (source: string, target: string): string => `${source}->${target}`

const endId = (end: string | GraphNode): string => (typeof end === 'string' ? end : end.id)

export const createGraph = (): MemoryGraph => ({ nodes: new Map(), links: new Map() })

const recomputeDegrees = (graph: MemoryGraph): void => {
  for (const node of graph.nodes.values()) node.degree = 0
  for (const link of graph.links.values()) {
    const source = graph.nodes.get(endId(link.source))
    const target = graph.nodes.get(endId(link.target))
    if (source) source.degree += 1
    if (target) target.degree += 1
  }
}

const ensureHub = (
  graph: MemoryGraph,
  id: string,
  kind: 'topic' | 'entity',
  label: string,
  count?: number
): GraphNode => {
  const existing = graph.nodes.get(id)
  if (existing) {
    if (typeof count === 'number') existing.count = count
    return existing
  }
  const node: GraphNode = { id, kind, label, degree: 0, count }
  graph.nodes.set(id, node)
  return node
}

const addLink = (graph: MemoryGraph, source: string, target: string): void => {
  const id = makeLinkId(source, target)
  if (!graph.links.has(id)) graph.links.set(id, { id, source, target })
}

/** Seed topic / entity hub nodes from the lightweight overview aggregate. */
export const overviewToHubs = (graph: MemoryGraph, overview: GraphOverview): MemoryGraph => {
  for (const topic of overview.topics ?? []) {
    if (topic.label?.trim()) ensureHub(graph, topicId(topic.label), 'topic', topic.label.trim(), topic.count)
  }
  for (const entity of overview.entities ?? []) {
    if (entity.label?.trim()) ensureHub(graph, entityId(entity.label), 'entity', entity.label.trim(), entity.count)
  }
  recomputeDegrees(graph)
  return graph
}

/** Merge memory entries (and their hub links) into the graph, de-duplicating by id. */
export const mergeEntries = (graph: MemoryGraph, entries: MemoryLensEntry[]): MemoryGraph => {
  for (const entry of entries) {
    const id = memoryId(entry)
    const node = graph.nodes.get(id) ?? { id, kind: 'memory' as const, label: '', degree: 0 }
    node.label = formatMemoryTitle(entry)
    node.namespace = entry.namespace
    node.entry = entry
    node.salience = typeof entry.salience === 'number' ? entry.salience : undefined
    node.occurredAt = entry.occurredAt
    graph.nodes.set(id, node)

    for (const tag of entry.tags ?? []) {
      const label = tag.trim()
      if (!label) continue
      addLink(graph, id, ensureHub(graph, topicId(label), 'topic', label).id)
    }
    for (const entity of entry.entities ?? []) {
      const label = entity.trim()
      if (!label) continue
      addLink(graph, id, ensureHub(graph, entityId(label), 'entity', label).id)
    }
  }
  recomputeDegrees(graph)
  return graph
}

/** Ids of nodes whose label or memory body matches the query (already-loaded only). */
export const matchNodes = (graph: MemoryGraph, query: string): Set<string> => {
  const needle = norm(query)
  const matches = new Set<string>()
  if (!needle) return matches
  for (const node of graph.nodes.values()) {
    if (norm(node.label).includes(needle)) {
      matches.add(node.id)
      continue
    }
    const entry = node.entry
    if (entry) {
      const haystack = `${entry.value} ${(entry.tags ?? []).join(' ')} ${(entry.entities ?? []).join(' ')}`
      if (norm(haystack).includes(needle)) matches.add(node.id)
    }
  }
  return matches
}

/** Ids of nodes directly linked to the given node. */
export const neighborIds = (graph: MemoryGraph, nodeId: string): Set<string> => {
  const neighbors = new Set<string>()
  for (const link of graph.links.values()) {
    const source = endId(link.source)
    const target = endId(link.target)
    if (source === nodeId) neighbors.add(target)
    else if (target === nodeId) neighbors.add(source)
  }
  return neighbors
}

export const graphArrays = (graph: MemoryGraph): { nodes: GraphNode[]; links: GraphLink[] } => ({
  nodes: Array.from(graph.nodes.values()),
  links: Array.from(graph.links.values())
})
