import { useState, useEffect, useCallback, useRef } from 'react'
import type { DeepAgentSession } from '../types/enterpriseAgent'
import type { FabricSessionSummary } from '../types/fabric'
import { useEnterpriseAgentClient, type SessionHistoryPage } from './useEnterpriseAgentClient'
import { useFlowBotFabricClient } from './useFlowBotFabricClient'
import { isFlowBotFabricRuntime } from '../utils/fabricRuntime'

const SESSION_HISTORY_PAGE_SIZE = 50
const SESSION_HISTORY_SEARCH_DEBOUNCE_MS = 300

function normalizeSessionHistoryPage(response: SessionHistoryPage | DeepAgentSession[]): SessionHistoryPage {
  if (Array.isArray(response)) {
    return {
      items: response,
      next_cursor: null,
      has_more: false
    }
  }
  return {
    items: Array.isArray(response.items) ? response.items : [],
    next_cursor: response.next_cursor ?? null,
    has_more: Boolean(response.has_more)
  }
}

export const useAgentSessions = (accessToken: string) => {
  const promptManagerClient = useEnterpriseAgentClient(accessToken)
  const flowBotClient = useFlowBotFabricClient(accessToken)
  const flowBotRuntime = isFlowBotFabricRuntime()
  const client = flowBotRuntime ? flowBotClient : promptManagerClient
  const [sessions, setSessions] = useState<FabricSessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searching, setSearching] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const requestSeqRef = useRef(0)

  const byUpdatedDesc = useCallback((a: FabricSessionSummary, b: FabricSessionSummary) => {
    const aTs = Date.parse(a.updated_at ?? a.created_at)
    const bTs = Date.parse(b.updated_at ?? b.created_at)
    return (Number.isNaN(bTs) ? 0 : bTs) - (Number.isNaN(aTs) ? 0 : aTs)
  }, [])

  const mergeSessions = useCallback(
    (prev: FabricSessionSummary[], incoming: FabricSessionSummary[]) => {
      const byId = new Map(prev.map(session => [session.session_id, session]))
      for (const session of incoming) {
        const existing = byId.get(session.session_id)
        byId.set(session.session_id, existing ? { ...existing, ...session } : session)
      }
      return Array.from(byId.values()).sort(byUpdatedDesc)
    },
    [byUpdatedDesc]
  )

  const upsertSession = useCallback(
    (prev: FabricSessionSummary[], session: FabricSessionSummary) => {
      const existingIndex = prev.findIndex(s => s.session_id === session.session_id)
      if (existingIndex === -1) return [session, ...prev].sort(byUpdatedDesc)

      const next = [...prev]
      next[existingIndex] = { ...next[existingIndex], ...session }
      return next.sort(byUpdatedDesc)
    },
    [byUpdatedDesc]
  )

  const fetchSessionsPage = useCallback(
    async (opts?: { reset?: boolean; cursor?: string | null; query?: string }) => {
      const reset = opts?.reset ?? true
      const query = opts?.query ?? debouncedSearchQuery
      const trimmedQuery = query.trim()
      const requestSeq = ++requestSeqRef.current

      if (flowBotRuntime) {
        setLoading(false)
        setLoadingMore(false)
        setSearching(false)
        setHasMore(false)
        setNextCursor(null)
        return
      }

      if (reset) {
        if (trimmedQuery) {
          setSearching(true)
        } else {
          setLoading(true)
        }
      } else {
        setLoadingMore(true)
      }

      try {
        const response = await promptManagerClient.getSessions({
          summary: true,
          limit: SESSION_HISTORY_PAGE_SIZE,
          cursor: reset ? null : opts?.cursor,
          q: trimmedQuery || undefined
        })
        const page = normalizeSessionHistoryPage(response as SessionHistoryPage | DeepAgentSession[])
        if (requestSeq !== requestSeqRef.current) return
        setSessions(prev => (reset ? [...page.items].sort(byUpdatedDesc) : mergeSessions(prev, page.items)))
        setNextCursor(page.next_cursor)
        setHasMore(page.has_more)
      } catch {
        if (reset && requestSeq === requestSeqRef.current) {
          setSessions([])
          setNextCursor(null)
          setHasMore(false)
        }
      } finally {
        if (requestSeq === requestSeqRef.current) {
          setLoading(false)
          setLoadingMore(false)
          setSearching(false)
        }
      }
    },
    [promptManagerClient, byUpdatedDesc, mergeSessions, flowBotRuntime, debouncedSearchQuery]
  )

  const fetchSessions = useCallback(async () => {
    await fetchSessionsPage({ reset: true, query: debouncedSearchQuery })
  }, [fetchSessionsPage, debouncedSearchQuery])

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore || !nextCursor) return
    await fetchSessionsPage({ reset: false, cursor: nextCursor, query: debouncedSearchQuery })
  }, [loading, loadingMore, hasMore, nextCursor, fetchSessionsPage, debouncedSearchQuery])

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, SESSION_HISTORY_SEARCH_DEBOUNCE_MS)
    return () => globalThis.clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    if (flowBotRuntime) {
      setLoading(false)
      return
    }
    fetchSessionsPage({ reset: true, query: debouncedSearchQuery })
  }, [fetchSessionsPage, flowBotRuntime, debouncedSearchQuery])

  const addSession = useCallback(
    (session: DeepAgentSession | FabricSessionSummary) => {
      setSessions(prev => upsertSession(prev, session))
    },
    [upsertSession]
  )

  const updateSession = useCallback(
    (updated: DeepAgentSession | FabricSessionSummary) => {
      setSessions(prev => upsertSession(prev, updated))
    },
    [upsertSession]
  )

  const removeSession = useCallback(
    async (sessionId: string) => {
      try {
        await client.stopSession(sessionId)
      } catch {
        // still remove from UI
      }
      setSessions(prev => prev.filter(s => s.session_id !== sessionId))
    },
    [client]
  )

  return {
    sessions,
    loading,
    loadingMore,
    searching: searching || searchQuery.trim() !== debouncedSearchQuery.trim(),
    hasMore,
    searchQuery,
    setSearchQuery,
    loadMore,
    addSession,
    updateSession,
    removeSession,
    refetch: fetchSessions
  }
}
