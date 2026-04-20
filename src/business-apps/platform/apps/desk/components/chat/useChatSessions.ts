import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChatSession } from '../../types/chat.types'

export interface UseChatSessionsOptions {
  userId: string
  isConnected: boolean
  currentSession: ChatSession | null
  scope: 'all' | 'space'
  spaceId: string | null
  llmProvider?: string
  onScopeChange: (scope: 'all' | 'space') => void
  onSpaceChange: (spaceId: string | null) => void
  createSession: (dto?: { scope?: 'all' | 'space'; spaceId?: string; llmProvider?: string }) => Promise<ChatSession>
  joinSession: (sessionId: string) => Promise<ChatSession | null>
  getUserSessions: () => Promise<ChatSession[]>
  deleteSession: (sessionId: string) => Promise<void>
}

export interface UseChatSessionsReturn {
  sessions: ChatSession[]
  isLoadingSessions: boolean
  handleSelectSession: (sessionId: string) => Promise<void>
  handleNewSession: () => void
  handleNewSessionWithProvider: (llmProvider?: string) => void
  handleDeleteCurrentSession: () => Promise<void>
}

export function useChatSessions(options: UseChatSessionsOptions): UseChatSessionsReturn {
  const {
    userId,
    isConnected,
    currentSession,
    scope,
    spaceId,
    llmProvider,
    onScopeChange,
    onSpaceChange,
    createSession,
    joinSession,
    getUserSessions,
    deleteSession
  } = options

  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const maxVisibleSessions = 20
  const storageKey = useMemo(() => `desk-document-chat:last-session:${userId}`, [userId])

  // Keep the sessions list in sync with the active session (e.g. title updates via socket)
  useEffect(() => {
    if (!currentSession?.id) return
    setSessions(prev => {
      const idx = prev.findIndex(s => s.id === currentSession.id)
      if (idx === -1) return prev
      const existing = prev[idx]
      if (
        existing.title === currentSession.title &&
        existing.updatedAt === currentSession.updatedAt &&
        existing.llmProvider === currentSession.llmProvider
      ) {
        return prev
      }
      const next = prev.slice()
      next[idx] = {
        ...existing,
        title: currentSession.title,
        updatedAt: currentSession.updatedAt,
        llmProvider: currentSession.llmProvider
      }
      return next
    })
  }, [currentSession?.id, currentSession?.title, currentSession?.updatedAt, currentSession?.llmProvider])

  const refreshSessions = useCallback(async (): Promise<ChatSession[]> => {
    const loaded = await getUserSessions()
    const sorted = loaded.slice().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    setSessions(sorted.slice(0, maxVisibleSessions))
    return sorted
  }, [getUserSessions])

  // Initial load/restore
  useEffect(() => {
    if (!isConnected) return
    if (currentSession) return

    let cancelled = false
    ;(async () => {
      try {
        setIsLoadingSessions(true)
        const loaded = await refreshSessions()
        if (cancelled) return

        const lastId = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null
        const candidateId = lastId && loaded.some(s => s.id === lastId) ? lastId : loaded[0]?.id

        if (candidateId) {
          const session = await joinSession(candidateId)
          if (cancelled) return
          if (session?.scope) onScopeChange(session.scope)
          onSpaceChange(session?.spaceId || null)
          if (typeof window !== 'undefined') window.localStorage.setItem(storageKey, candidateId)
          return
        }

        const created = await createSession({ scope, spaceId: spaceId || undefined, llmProvider })
        if (cancelled) return
        setSessions(prev => [created, ...prev].slice(0, maxVisibleSessions))
        if (typeof window !== 'undefined') window.localStorage.setItem(storageKey, created.id)
      } catch (e) {
        console.error('Failed to initialize session:', e)
      } finally {
        if (!cancelled) setIsLoadingSessions(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    isConnected,
    currentSession,
    refreshSessions,
    storageKey,
    joinSession,
    onScopeChange,
    onSpaceChange,
    createSession,
    scope,
    spaceId
  ])

  const createNewSession = useCallback(
    (newScope: 'all' | 'space', newSpaceId: string | null, providerOverride?: string) => {
      createSession({ scope: newScope, spaceId: newSpaceId || undefined, llmProvider: providerOverride ?? llmProvider })
        .then(session => {
          setSessions(prev => [session, ...prev.filter(s => s.id !== session.id)].slice(0, maxVisibleSessions))
          if (typeof window !== 'undefined') window.localStorage.setItem(storageKey, session.id)
        })
        .catch(err => console.error('Failed to create new session:', err))
    },
    [createSession, storageKey, llmProvider]
  )

  const handleSelectSession = useCallback(
    async (sessionId: string) => {
      const session = await joinSession(sessionId)
      if (session?.scope) onScopeChange(session.scope)
      onSpaceChange(session?.spaceId || null)
      if (typeof window !== 'undefined') window.localStorage.setItem(storageKey, sessionId)
      await refreshSessions()
    },
    [joinSession, onScopeChange, onSpaceChange, storageKey, refreshSessions]
  )

  const handleNewSession = useCallback(() => {
    createNewSession(scope, spaceId)
  }, [createNewSession, scope, spaceId])

  const handleNewSessionWithProvider = useCallback(
    (provider?: string) => {
      createNewSession(scope, spaceId, provider)
    },
    [createNewSession, scope, spaceId]
  )

  const handleDeleteCurrentSession = useCallback(async () => {
    if (!currentSession?.id) return
    if (typeof window !== 'undefined' && !window.confirm('Delete this chat session?')) return
    await deleteSession(currentSession.id)
    if (typeof window !== 'undefined') window.localStorage.removeItem(storageKey)
    await refreshSessions()
    createNewSession(scope, spaceId)
  }, [currentSession?.id, deleteSession, storageKey, refreshSessions, createNewSession, scope, spaceId])

  return {
    sessions,
    isLoadingSessions,
    handleSelectSession,
    handleNewSession,
    handleNewSessionWithProvider,
    handleDeleteCurrentSession
  }
}
