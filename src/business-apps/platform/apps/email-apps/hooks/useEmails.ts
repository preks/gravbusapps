import { useState, useCallback, useEffect, useRef } from 'react'
import { EmailApiService } from '../services/EmailApiService'
import type { EmailMessageSummary, EmailMessage } from '../types'

interface UseEmailsOptions {
  accessToken: string
  folderId?: string
  accountId?: string
  search?: string
  starredOnly?: boolean
  /** Auto-refresh interval in milliseconds (default: 30000 = 30 seconds) */
  autoRefreshInterval?: number
}

export function useEmails({
  accessToken,
  folderId,
  accountId,
  search,
  starredOnly,
  autoRefreshInterval = 30000 // Default: refresh every 30 seconds
}: UseEmailsOptions) {
  const [messages, setMessages] = useState<EmailMessageSummary[]>([])
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isVisible, setIsVisible] = useState(true)
  const loadingRef = useRef(false)

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
      // Prevent concurrent requests
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
        setMessages(result.items)
        setTotal(result.total)
        setPage(pageNum)
      } catch (err) {
        console.error('Failed to load messages:', err)
      } finally {
        loadingRef.current = false
        if (!silent) setIsLoading(false)
      }
    },
    [accessToken, folderId, accountId, search, starredOnly]
  )

  // Initial load on mount or when dependencies change
  useEffect(() => {
    loadMessages(1)
  }, [loadMessages])

  // Auto-refresh polling when screen is visible
  useEffect(() => {
    if (!autoRefreshInterval || !isVisible) return

    const intervalId = setInterval(() => {
      // Silent refresh (don't show loading spinner during auto-refresh)
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
        await EmailApiService.markRead(id, true)
        setMessages(prev => prev.map(m => (m.id === id ? { ...m, isRead: true } : m)))
      }
    } catch (err) {
      console.error('Failed to load message:', err)
    }
  }, [])

  const toggleStar = useCallback(
    async (id: string) => {
      const result = await EmailApiService.toggleStar(id)
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
      setMessages(prev => prev.filter(m => m.id !== id))
      if (selectedMessage?.id === id) setSelectedMessage(null)
    },
    [selectedMessage]
  )

  const moveToFolder = useCallback(
    async (id: string, targetFolderId: string) => {
      await EmailApiService.moveToFolder(id, targetFolderId)
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
    refreshMessages: () => loadMessages(page, false) // Manual refresh shows loading
  }
}
