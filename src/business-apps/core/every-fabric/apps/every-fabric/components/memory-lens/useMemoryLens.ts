import { useCallback, useEffect, useMemo, useState } from 'react'
import { useEnterpriseAgentClient, type UserProfileBrief } from '../../hooks/useEnterpriseAgentClient'
import { MEMORY_NAMESPACES, MEMORY_NAMESPACE_LABELS } from '../settings/agentSettings.types'
import type { MemoryNamespace } from '../settings/agentSettings.types'
import { computeStats, type MemoryLensEntry, type MemoryStats } from './memoryLensModel'

// Entries are loaded one page at a time (per namespace) so we never bulk-load a
// large memory store. Headline counts come from the graph-overview endpoint, so
// they stay accurate regardless of how many pages have been loaded.
const PAGE_SIZE = 50

const NAMESPACE_SET = new Set<string>(MEMORY_NAMESPACES)

const entryId = (entry: MemoryLensEntry): string => `${entry.namespace}-${entry.key}`

const mergeUnique = (existing: MemoryLensEntry[], incoming: MemoryLensEntry[]): MemoryLensEntry[] => {
  const seen = new Set(existing.map(entryId))
  const merged = [...existing]
  for (const entry of incoming) {
    const id = entryId(entry)
    if (!seen.has(id)) {
      seen.add(id)
      merged.push(entry)
    }
  }
  return merged
}

type MemoryOverview = {
  namespaces: Array<{ namespace: string; count: number }>
  totalMemories: number
}

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

export interface UseMemoryLensResult {
  entries: MemoryLensEntry[]
  stats: MemoryStats
  profile: UserProfileBrief | null
  loading: boolean
  searching: boolean
  regenerating: boolean
  loadingMore: boolean
  hasMore: boolean
  error: string | null
  query: string
  setQuery: (value: string) => void
  search: (value: string) => Promise<void>
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
  remove: (key: string, namespace: MemoryNamespace) => Promise<void>
  regenerate: () => Promise<void>
  fetchRange: (dateFrom: string, dateTo: string) => Promise<MemoryLensEntry[]>
}

export const useMemoryLens = (accessToken: string): UseMemoryLensResult => {
  const client = useEnterpriseAgentClient(accessToken)

  const [entries, setEntries] = useState<MemoryLensEntry[]>([])
  const [overview, setOverview] = useState<MemoryOverview | null>(null)
  const [profile, setProfile] = useState<UserProfileBrief | null>(null)
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const fetchPage = useCallback(
    async (rawQuery: string, pageIndex: number): Promise<MemoryLensEntry[]> => {
      const results = await client.getMemory(rawQuery.trim() || '*', {
        limit: PAGE_SIZE,
        offset: pageIndex * PAGE_SIZE
      })
      return (results ?? []).map(normalizeEntry)
    },
    [client]
  )

  const fetchRange = useCallback(
    async (dateFrom: string, dateTo: string): Promise<MemoryLensEntry[]> => {
      const results = await client.getMemory('*', { dateFrom, dateTo, limit: PAGE_SIZE })
      return (results ?? []).map(normalizeEntry)
    },
    [client]
  )

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    setPage(0)
    const [memoryResult, overviewResult, profileResult] = await Promise.allSettled([
      fetchPage(query, 0),
      client.getMemoryGraphOverview(),
      client.getUserProfileBrief()
    ])
    if (memoryResult.status === 'fulfilled') {
      setEntries(memoryResult.value)
    } else {
      setEntries([])
      setError('Could not load memory entries.')
    }
    setOverview(overviewResult.status === 'fulfilled' ? overviewResult.value : null)
    setProfile(profileResult.status === 'fulfilled' ? profileResult.value : null)
    setLoading(false)
  }, [client, fetchPage, query])

  const search = useCallback(
    async (value: string) => {
      setQuery(value)
      setSearching(true)
      setPage(0)
      try {
        setEntries(await fetchPage(value, 0))
        setError(null)
      } catch {
        setEntries([])
        setError('Search failed.')
      } finally {
        setSearching(false)
      }
    },
    [fetchPage]
  )

  const loadMore = useCallback(async () => {
    if (loadingMore) return
    const nextPage = page + 1
    setLoadingMore(true)
    try {
      const more = await fetchPage(query, nextPage)
      setEntries(prev => mergeUnique(prev, more))
      setPage(nextPage)
    } catch {
      // best-effort — leave already-loaded entries in place
    } finally {
      setLoadingMore(false)
    }
  }, [fetchPage, loadingMore, page, query])

  const remove = useCallback(
    async (key: string, namespace: MemoryNamespace) => {
      setEntries(prev => prev.filter(entry => !(entry.key === key && entry.namespace === namespace)))
      try {
        await client.deleteMemory(key, namespace)
      } catch {
        // best-effort — a failed delete will reappear on the next refresh
      }
    },
    [client]
  )

  const regenerate = useCallback(async () => {
    setRegenerating(true)
    try {
      setProfile(await client.regenerateUserProfileBrief())
    } catch {
      // keep the previous brief; surface nothing destructive for a dev tool
    } finally {
      setRegenerating(false)
    }
  }, [client])

  useEffect(() => {
    // Run once on mount; manual refresh/search drive subsequent loads.
    void refresh()
  }, [])

  // Headline counts come from the aggregate overview (accurate beyond the
  // per-namespace fetch cap); topics/salience still derive from loaded entries.
  const stats = useMemo<MemoryStats>(() => {
    const base = computeStats(entries)
    if (!overview) return base

    const byNamespace = new Map<MemoryNamespace, number>()
    for (const item of overview.namespaces) {
      if (NAMESPACE_SET.has(item.namespace)) byNamespace.set(item.namespace as MemoryNamespace, item.count)
    }
    const knownTotal = MEMORY_NAMESPACES.reduce((sum, namespace) => sum + (byNamespace.get(namespace) ?? 0), 0)
    return {
      ...base,
      total: knownTotal,
      perNamespace: MEMORY_NAMESPACES.map(namespace => ({
        namespace,
        label: MEMORY_NAMESPACE_LABELS[namespace],
        count: byNamespace.get(namespace) ?? 0
      }))
    }
  }, [entries, overview])

  // Pagination only applies to the unfiltered browse; an active search returns a
  // single ranked page of top matches.
  const isSearch = query.trim() !== '' && query.trim() !== '*'
  const hasMore = !isSearch && entries.length < stats.total

  return {
    entries,
    stats,
    profile,
    loading,
    searching,
    regenerating,
    loadingMore,
    hasMore,
    error,
    query,
    setQuery,
    search,
    refresh,
    loadMore,
    remove,
    regenerate,
    fetchRange
  }
}
