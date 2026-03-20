import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { EmailApiService } from '../services/EmailApiService'
import { normalizeLabels, normalizeLabelObjects } from '../utils/labelUtils'
import type { EmailMessageSummary, EmailMessage, EmailLabel } from '../types'

interface UseEmailsOptions {
  accessToken: string
  folderId?: string
  accountId?: string
  search?: string
  labels?: string[]
  starredOnly?: boolean
  /** When true, emails sharing a threadId are collapsed to the latest per thread */
  threadView?: boolean
  /** Auto-refresh interval in milliseconds (default: 15000 = 15 seconds) */
  autoRefreshInterval?: number
}

interface ListMessagesParamsBuilderOptions {
  folderId?: string
  accountId?: string
  search?: string
  labels: string[]
  starredOnly?: boolean
  page: number
}

function buildListMessagesParams({
  folderId,
  accountId,
  search,
  labels,
  starredOnly,
  page
}: ListMessagesParamsBuilderOptions) {
  return {
    folderId: starredOnly ? undefined : folderId,
    accountId,
    search: search || undefined,
    labels: labels.length ? labels : undefined,
    starredOnly: starredOnly || undefined,
    page,
    limit: 100
  }
}

/**
 * Deduplicate messages by threadId, keeping only the latest message per thread.
 * Messages without threadId are kept as-is.
 */
function deduplicateThreads(messages: EmailMessageSummary[]): EmailMessageSummary[] {
  const threadMap = new Map<string, EmailMessageSummary>()
  const nonThreaded: EmailMessageSummary[] = []

  for (const msg of messages) {
    if (!msg.threadId) {
      nonThreaded.push(msg)
    } else {
      const existing = threadMap.get(msg.threadId)
      if (!existing || new Date(msg.date) > new Date(existing.date)) {
        threadMap.set(msg.threadId, msg)
      }
    }
  }

  return [...nonThreaded, ...Array.from(threadMap.values())].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
}

/** Tracks local optimistic changes that must survive server refreshes */
interface LocalOverride {
  isRead?: boolean
  isStarred?: boolean
  /** Timestamp of the local override – discard after this age (ms) */
  at: number
}

/** Local overrides expire after 60 seconds – enough time for the BE
 *  to propagate the change to the provider and for the next delta sync
 *  to pick it up. */
const OVERRIDE_TTL_MS = 60_000

export function useEmails({
  accessToken,
  folderId,
  accountId,
  search,
  labels,
  starredOnly,
  threadView = false,
  autoRefreshInterval = 15000
}: UseEmailsOptions) {
  const normalizedLabels = useMemo(() => normalizeLabels(labels || []), [labels])

  const [messages, setMessages] = useState<EmailMessageSummary[]>([])
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isVisible, setIsVisible] = useState(true)
  const loadingRef = useRef(false)

  /**
   * Map of messageId → local overrides. These are applied on top of
   * server data during silent refreshes to prevent flicker/reversion.
   */
  const localOverridesRef = useRef<Map<string, LocalOverride>>(new Map())

  /** Prune expired overrides */
  const pruneOverrides = useCallback(() => {
    const now = Date.now()
    const map = localOverridesRef.current
    for (const [id, override] of map) {
      if (now - override.at > OVERRIDE_TTL_MS) {
        map.delete(id)
      }
    }
  }, [])

  /** Apply local overrides on top of server data */
  const applyOverrides = useCallback(
    (serverMessages: EmailMessageSummary[]): EmailMessageSummary[] => {
      pruneOverrides()
      const map = localOverridesRef.current
      if (map.size === 0) return serverMessages

      return serverMessages.map(msg => {
        const override = map.get(msg.id)
        if (!override) return msg
        return {
          ...msg,
          ...(override.isRead !== undefined ? { isRead: override.isRead } : {}),
          ...(override.isStarred !== undefined ? { isStarred: override.isStarred } : {})
        }
      })
    },
    [pruneOverrides]
  )

  useEffect(() => {
    EmailApiService.setAccessToken(accessToken)
  }, [accessToken])

  // Track page visibility to pause polling when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === 'visible')
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  // Use refs for pagination state to avoid stale closures in loadMore
  const pageRef = useRef(1)
  const hasMoreRef = useRef(true)
  const loadingMoreRef = useRef(false)

  const loadMessages = useCallback(
    async (pageNum = 1, silent = false) => {
      if (!accessToken) return
      // Don't fetch until we have a folder (or an explicit starred/search filter)
      // Otherwise we'd briefly show ALL emails from every folder on first render
      if (!folderId && !starredOnly && !search && normalizedLabels.length === 0) return
      if (loadingRef.current) return

      loadingRef.current = true
      if (!silent) setIsLoading(true)

      try {
        const result = await EmailApiService.listMessages(
          buildListMessagesParams({
            folderId,
            accountId,
            search,
            labels: normalizedLabels,
            starredOnly,
            page: pageNum
          })
        )

        const deduplicated = threadView ? deduplicateThreads(result.items) : result.items

        if (silent && pageNum === 1) {
          // Silent refresh of page 1: merge fresh page-1 data with existing
          // older pages to avoid losing "load more" results
          setMessages(prev => {
            const freshIds = new Set(deduplicated.map(m => m.id))
            // Keep messages from older pages that aren't in the fresh batch
            const olderMessages = prev.filter(m => !freshIds.has(m.id))
            const merged = [...deduplicated, ...olderMessages]
            const normalized = threadView ? deduplicateThreads(merged) : merged
            return applyOverrides(normalized)
          })
        } else if (silent) {
          setMessages(applyOverrides(deduplicated))
        } else {
          // Full reload (folder change, manual refresh): trust server state
          localOverridesRef.current.clear()
          setMessages(deduplicated)
          pageRef.current = pageNum
          setPage(pageNum)
        }

        setTotal(result.total)
        if (!silent) {
          const more = result.page < result.totalPages
          hasMoreRef.current = more
          setHasMore(more)
        }
      } catch (err) {
        console.error('Failed to load messages:', err)
      } finally {
        loadingRef.current = false
        if (!silent) setIsLoading(false)
      }
    },
    [accessToken, folderId, accountId, search, normalizedLabels, starredOnly, threadView, applyOverrides]
  )

  /** Load one additional page (100) */
  const loadMore = useCallback(async () => {
    if (!accessToken || !hasMoreRef.current || loadingMoreRef.current) return

    loadingMoreRef.current = true
    setIsLoadingMore(true)

    try {
      const nextPage = pageRef.current + 1
      const result = await EmailApiService.listMessages(
        buildListMessagesParams({
          folderId,
          accountId,
          search,
          labels: normalizedLabels,
          starredOnly,
          page: nextPage
        })
      )

      if (result.items.length > 0) {
        const newItems = threadView ? deduplicateThreads(result.items) : result.items
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id))
          const unique = newItems.filter(m => !existingIds.has(m.id))
          const merged = [...prev, ...unique]
          return threadView ? deduplicateThreads(merged) : merged
        })
        pageRef.current = nextPage
        setPage(nextPage)
        setTotal(result.total)
      }

      const more = result.page < result.totalPages
      hasMoreRef.current = more
      setHasMore(more)
    } catch (err) {
      console.error('Failed to load more messages:', err)
    } finally {
      loadingMoreRef.current = false
      setIsLoadingMore(false)
    }
  }, [accessToken, folderId, accountId, search, normalizedLabels, starredOnly, threadView])

  // Initial load on mount or when dependencies change
  useEffect(() => {
    // Reset pagination when folder/filters change
    pageRef.current = 1
    hasMoreRef.current = true
    loadingMoreRef.current = false
    setHasMore(true)
    setIsLoadingMore(false)
    loadMessages(1)
  }, [loadMessages])

  // Auto-refresh polling when screen is visible
  // Always poll page 1 (latest emails) — older pages loaded via loadMore are stable
  useEffect(() => {
    if (!autoRefreshInterval || !isVisible) return

    const intervalId = setInterval(() => {
      loadMessages(1, true)
    }, autoRefreshInterval)

    return () => clearInterval(intervalId)
  }, [loadMessages, autoRefreshInterval, isVisible])

  const selectMessage = useCallback(async (id: string) => {
    try {
      const message = await EmailApiService.getMessage(id)
      setSelectedMessage(message)
      // Mark as read if not already
      if (!message.isRead) {
        // Record local override BEFORE the API call so it survives any
        // concurrent poll that might land between now and the next sync
        localOverridesRef.current.set(id, {
          isRead: true,
          at: Date.now()
        })
        setMessages(prev => prev.map(m => (m.id === id ? { ...m, isRead: true } : m)))
        await EmailApiService.markRead(id, true)
      }
    } catch (err) {
      console.error('Failed to load message:', err)
    }
  }, [])

  const toggleStar = useCallback(
    async (id: string) => {
      const result = await EmailApiService.toggleStar(id)

      // Record local override
      localOverridesRef.current.set(id, {
        ...localOverridesRef.current.get(id),
        isStarred: result.isStarred,
        at: Date.now()
      })

      setMessages(prev => prev.map(m => (m.id === id ? { ...m, isStarred: result.isStarred } : m)))
      if (selectedMessage?.id === id) {
        setSelectedMessage(prev => (prev ? { ...prev, isStarred: result.isStarred } : null))
      }
    },
    [selectedMessage]
  )

  const deleteMessage = useCallback(
    async (id: string) => {
      await EmailApiService.deleteMessage(id)
      localOverridesRef.current.delete(id)
      setMessages(prev => prev.filter(m => m.id !== id))
      if (selectedMessage?.id === id) setSelectedMessage(null)
    },
    [selectedMessage]
  )

  const moveToFolder = useCallback(
    async (id: string, targetFolderId: string) => {
      await EmailApiService.moveToFolder(id, targetFolderId)
      localOverridesRef.current.delete(id)
      setMessages(prev => prev.filter(m => m.id !== id))
      if (selectedMessage?.id === id) setSelectedMessage(null)
    },
    [selectedMessage]
  )

  const updateMessageLabels = useCallback((id: string, labels: EmailLabel[]) => {
    const normalized = normalizeLabelObjects(labels)
    setMessages(prev => prev.map(m => (m.id === id ? { ...m, labels: normalized } : m)))
    setSelectedMessage(prev => (prev?.id === id ? { ...prev, labels: normalized } : prev))
  }, [])

  return {
    messages,
    selectedMessage,
    isLoading,
    isLoadingMore,
    hasMore,
    total,
    page,
    selectMessage,
    clearSelection: () => setSelectedMessage(null),
    toggleStar,
    deleteMessage,
    moveToFolder,
    updateMessageLabels,
    loadMore,
    refreshMessages: () => loadMessages(1, false)
  }
}
