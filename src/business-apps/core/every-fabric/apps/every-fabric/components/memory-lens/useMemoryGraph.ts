import { useCallback, useEffect, useRef, useState } from 'react'
import { useEnterpriseAgentClient } from '../../hooks/useEnterpriseAgentClient'
import { MEMORY_NAMESPACES } from '../settings/agentSettings.types'
import type { MemoryNamespace } from '../settings/agentSettings.types'
import type { MemoryLensEntry } from './memoryLensModel'
import {
  createGraph,
  graphArrays,
  matchNodes,
  memoryId,
  mergeEntries,
  overviewToHubs,
  type GraphLink,
  type GraphNode
} from './memoryGraphModel'

// One hub page; small enough to stay snappy, large enough to feel substantial.
const HUB_PAGE = 30
// Server-side search pull (merged into the live graph, then focused).
const SEARCH_LIMIT = 40

const NAMESPACE_SET = new Set<string>(MEMORY_NAMESPACES)

const toNamespace = (value: string | undefined): MemoryNamespace =>
  value && NAMESPACE_SET.has(value) ? (value as MemoryNamespace) : 'preferences'

type RawMemoryEntry = {
  key: string
  value: string
  namespace?: string
  title?: string | null
  tags?: string[] | null
  entities?: string[] | null
  occurred_at?: string | null
  salience?: number | null
  score?: number | null
  updated_at?: string | null
}

const normalizeEntry = (raw: RawMemoryEntry): MemoryLensEntry => ({
  key: raw.key,
  value: raw.value,
  namespace: toNamespace(raw.namespace),
  title: raw.title ?? undefined,
  tags: raw.tags ?? [],
  entities: raw.entities ?? [],
  occurredAt: raw.occurred_at ?? undefined,
  updatedAt: raw.updated_at ?? undefined,
  salience: raw.salience ?? null,
  score: raw.score ?? null
})

interface HubState {
  offset: number
  hasMore: boolean
}

export interface GraphTotals {
  memories: number
  topics: number
  entities: number
}

export interface UseMemoryGraphResult {
  nodes: GraphNode[]
  links: GraphLink[]
  totals: GraphTotals
  overviewLoading: boolean
  searching: boolean
  error: string | null
  loadingIds: ReadonlySet<string>
  selectedId: string | null
  select: (id: string | null) => void
  expandNode: (node: GraphNode) => void
  loadMore: (node: GraphNode) => void
  hubHasMore: (id: string) => boolean
  searchServer: (query: string) => Promise<Set<string>>
  reload: () => Promise<void>
}

export const useMemoryGraph = (accessToken: string): UseMemoryGraphResult => {
  const client = useEnterpriseAgentClient(accessToken)

  const graphRef = useRef(createGraph())
  const hubStateRef = useRef<Map<string, HubState>>(new Map())
  const loadingRef = useRef<Set<string>>(new Set())

  const [snapshot, setSnapshot] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({ nodes: [], links: [] })
  const [totals, setTotals] = useState<GraphTotals>({ memories: 0, topics: 0, entities: 0 })
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingIds, setLoadingIds] = useState<ReadonlySet<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const bump = useCallback(() => setSnapshot(graphArrays(graphRef.current)), [])

  const markLoading = useCallback((id: string, on: boolean) => {
    if (on) loadingRef.current.add(id)
    else loadingRef.current.delete(id)
    setLoadingIds(new Set(loadingRef.current))
  }, [])

  const fetchHubPage = useCallback(
    async (node: GraphNode, offset: number): Promise<MemoryLensEntry[]> => {
      const filter =
        node.kind === 'topic'
          ? { tag: node.label, limit: HUB_PAGE, offset }
          : { entity: node.label, limit: HUB_PAGE, offset }
      const raw = await client.getMemory('*', filter)
      return (raw ?? []).map(normalizeEntry)
    },
    [client]
  )

  const runHubFetch = useCallback(
    async (node: GraphNode, offset: number): Promise<void> => {
      markLoading(node.id, true)
      try {
        const entries = await fetchHubPage(node, offset)
        mergeEntries(graphRef.current, entries)
        node.expanded = true
        hubStateRef.current.set(node.id, {
          offset: offset + entries.length,
          hasMore: entries.length === HUB_PAGE
        })
        setError(null)
        bump()
      } catch {
        setError('Could not load this hub.')
      } finally {
        markLoading(node.id, false)
      }
    },
    [bump, fetchHubPage, markLoading]
  )

  const expandNode = useCallback(
    (node: GraphNode) => {
      setSelectedId(node.id)
      if (node.kind === 'memory') return
      if (loadingRef.current.has(node.id)) return
      const state = hubStateRef.current.get(node.id)
      if (!state) {
        void runHubFetch(node, 0)
        return
      }
      if (state.hasMore) void runHubFetch(node, state.offset)
    },
    [runHubFetch]
  )

  const loadMore = useCallback(
    (node: GraphNode) => {
      if (loadingRef.current.has(node.id)) return
      const state = hubStateRef.current.get(node.id)
      if (state?.hasMore) void runHubFetch(node, state.offset)
    },
    [runHubFetch]
  )

  const hubHasMore = useCallback((id: string) => hubStateRef.current.get(id)?.hasMore ?? false, [])

  const searchServer = useCallback(
    async (query: string): Promise<Set<string>> => {
      const trimmed = query.trim()
      if (!trimmed || trimmed === '*') return matchNodes(graphRef.current, trimmed)
      setSearching(true)
      try {
        const raw = await client.getMemory(trimmed, { limit: SEARCH_LIMIT })
        const entries = (raw ?? []).map(normalizeEntry)
        mergeEntries(graphRef.current, entries)
        bump()
        const ids = new Set<string>(entries.map(memoryId))
        for (const id of matchNodes(graphRef.current, trimmed)) ids.add(id)
        setError(null)
        return ids
      } catch {
        setError('Search failed.')
        return new Set<string>()
      } finally {
        setSearching(false)
      }
    },
    [bump, client]
  )

  const reload = useCallback(async () => {
    setOverviewLoading(true)
    setError(null)
    graphRef.current = createGraph()
    hubStateRef.current = new Map()
    setSelectedId(null)
    try {
      const overview = await client.getMemoryGraphOverview()
      overviewToHubs(graphRef.current, overview)
      setTotals({
        memories: overview.totalMemories ?? 0,
        topics: overview.topics?.length ?? 0,
        entities: overview.entities?.length ?? 0
      })
      bump()
    } catch {
      setError('Could not load the memory overview.')
    } finally {
      setOverviewLoading(false)
    }
  }, [bump, client])

  useEffect(() => {
    // Run once on mount; the Refresh control drives subsequent reloads.
    void reload()
  }, [])

  return {
    nodes: snapshot.nodes,
    links: snapshot.links,
    totals,
    overviewLoading,
    searching,
    error,
    loadingIds,
    selectedId,
    select: setSelectedId,
    expandNode,
    loadMore,
    hubHasMore,
    searchServer,
    reload
  }
}
