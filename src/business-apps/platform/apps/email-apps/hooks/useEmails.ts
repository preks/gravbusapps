import { useState, useCallback, useEffect, useRef } from 'react'
import { EmailApiService } from '../services/EmailApiService'
import type { EmailMessageSummary, EmailMessage } from '../types'

interface UseEmailsOptions {
  accessToken: string
  folderId?: string
  accountId?: string
  search?: string
  starredOnly?: boolean
  /** Auto-refresh interval in milliseconds (default: 15000 = 15 seconds) */
  autoRefreshInterval?: number
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
  starredOnly,
  autoRefreshInterval = 15000
}: UseEmailsOptions) {
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

  const loadMessages = useCallback(
    async (pageNum = 1, silent = false) => {
      if (!accessToken) return
      if (loadingRef.current) return

      loadingRef.current = true
      if (!silent) setIsLoading(true)

      try {
        const result = await EmailApiService.listMessages({
          folderId: starredOnly ? undefined : folderId,
          accountId,
          search: search || undefined,
          starredOnly: starredOnly || undefined,
          page: pageNum,
          limit: 50
        })

        const deduplicated = deduplicateThreads(result.items)

        if (silent) {
          // Silent refresh: apply local overrides to prevent reverting
          // optimistic updates (read status, star) until the provider syncs
          setMessages(applyOverrides(deduplicated))
        } else {
          // Full reload (folder change, manual refresh): trust server state
          localOverridesRef.current.clear()
          setMessages(deduplicated)
        }

        setTotal(result.total)
        setPage(pageNum)
      } catch (err) {
        console.error('Failed to load messages:', err)
      } finally {
        loadingRef.current = false
        if (!silent) setIsLoading(false)
      }
    },
    [accessToken, folderId, accountId, search, starredOnly, applyOverrides]
  )

  // Initial load on mount or when dependencies change
  useEffect(() => {
    loadMessages(1)
  }, [loadMessages])

  // Auto-refresh polling when screen is visible
  useEffect(() => {
    if (!autoRefreshInterval || !isVisible) return

    const intervalId = setInterval(() => {
      loadMessages(page, true)
    }, autoRefreshInterval)

    return () => clearInterval(intervalId)
  }, [loadMessages, page, autoRefreshInterval, isVisible])

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

  return {
    messages,
    selectedMessage,
    isLoading,
    total,
    page,
    selectMessage,
    clearSelection: () => setSelectedMessage(null),
    toggleStar,
    deleteMessage,
    moveToFolder,
    refreshMessages: () => loadMessages(page, false)
  }
}
