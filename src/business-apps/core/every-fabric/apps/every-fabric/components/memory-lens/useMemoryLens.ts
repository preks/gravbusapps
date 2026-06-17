import { useCallback, useEffect, useMemo, useState } from 'react'
import { useEnterpriseAgentClient, type UserProfileBrief } from '../../hooks/useEnterpriseAgentClient'
import { MEMORY_NAMESPACES } from '../settings/agentSettings.types'
import type { MemoryNamespace } from '../settings/agentSettings.types'
import { computeStats, type MemoryLensEntry, type MemoryStats } from './memoryLensModel'

// Backend caps each namespace at 50 entries per call; for a dev overview that
// is plenty and keeps the single round-trip cheap.
const FETCH_LIMIT = 50

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

export interface UseMemoryLensResult {
  entries: MemoryLensEntry[]
  stats: MemoryStats
  profile: UserProfileBrief | null
  loading: boolean
  searching: boolean
  regenerating: boolean
  error: string | null
  query: string
  setQuery: (value: string) => void
  search: (value: string) => Promise<void>
  refresh: () => Promise<void>
  remove: (key: string, namespace: MemoryNamespace) => Promise<void>
  regenerate: () => Promise<void>
  fetchRange: (dateFrom: string, dateTo: string) => Promise<MemoryLensEntry[]>
}

export const useMemoryLens = (accessToken: string): UseMemoryLensResult => {
  const client = useEnterpriseAgentClient(accessToken)

  const [entries, setEntries] = useState<MemoryLensEntry[]>([])
  const [profile, setProfile] = useState<UserProfileBrief | null>(null)
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const fetchEntries = useCallback(
    async (rawQuery: string): Promise<MemoryLensEntry[]> => {
      const results = await client.getMemory(rawQuery.trim() || '*', { limit: FETCH_LIMIT })
      return (results ?? []).map(normalizeEntry)
    },
    [client]
  )

  const fetchRange = useCallback(
    async (dateFrom: string, dateTo: string): Promise<MemoryLensEntry[]> => {
      const results = await client.getMemory('*', { dateFrom, dateTo, limit: FETCH_LIMIT })
      return (results ?? []).map(normalizeEntry)
    },
    [client]
  )

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [memoryResult, profileResult] = await Promise.allSettled([fetchEntries(query), client.getUserProfileBrief()])
    if (memoryResult.status === 'fulfilled') {
      setEntries(memoryResult.value)
    } else {
      setEntries([])
      setError('Could not load memory entries.')
    }
    setProfile(profileResult.status === 'fulfilled' ? profileResult.value : null)
    setLoading(false)
  }, [client, fetchEntries, query])

  const search = useCallback(
    async (value: string) => {
      setQuery(value)
      setSearching(true)
      try {
        setEntries(await fetchEntries(value))
        setError(null)
      } catch {
        setEntries([])
        setError('Search failed.')
      } finally {
        setSearching(false)
      }
    },
    [fetchEntries]
  )

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

  const stats = useMemo(() => computeStats(entries), [entries])

  return {
    entries,
    stats,
    profile,
    loading,
    searching,
    regenerating,
    error,
    query,
    setQuery,
    search,
    refresh,
    remove,
    regenerate,
    fetchRange
  }
}
