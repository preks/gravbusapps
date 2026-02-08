import { useState, useCallback, useEffect } from 'react'
import { EmailApiService } from '../services/EmailApiService'
import type { EmailMessageSummary, EmailMessage } from '../types'

interface UseEmailsOptions {
  accessToken: string
  folderId?: string
  accountId?: string
  search?: string
}

export function useEmails({ accessToken, folderId, accountId, search }: UseEmailsOptions) {
  const [messages, setMessages] = useState<EmailMessageSummary[]>([])
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  useEffect(() => {
    EmailApiService.setAccessToken(accessToken)
  }, [accessToken])

  const loadMessages = useCallback(
    async (pageNum = 1) => {
      if (!accessToken) return
      setIsLoading(true)
      try {
        const result = await EmailApiService.listMessages({
          folderId,
          accountId,
          search: search || undefined,
          page: pageNum,
          limit: 50
        })
        setMessages(result.items)
        setTotal(result.total)
        setPage(pageNum)
      } catch (err) {
        console.error('Failed to load messages:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken, folderId, accountId, search]
  )

  useEffect(() => {
    loadMessages(1)
  }, [loadMessages])

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
    refreshMessages: () => loadMessages(page)
  }
}
