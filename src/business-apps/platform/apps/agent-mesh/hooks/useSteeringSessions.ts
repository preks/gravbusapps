import { useState, useCallback, useRef, useEffect } from 'react'
import type { MeshSession, SessionMessage, SessionCommEvent } from '../types/agentMesh'

interface UseSteeringSessionsParams {
  meshClient: {
    getSessions: (params?: { userId?: string }) => Promise<MeshSession[]>
    getSession: (sessionId: string) => Promise<MeshSession>
    createSession: (data: {
      user_id: string
      agent_id: string
      agent_name: string
      title?: string
    }) => Promise<MeshSession>
    updateSession: (
      sessionId: string,
      data: { messages?: SessionMessage[]; comm_events?: SessionCommEvent[]; result?: string; title?: string }
    ) => Promise<MeshSession>
    deleteSession: (sessionId: string) => Promise<unknown>
  }
  userId?: string
  onReset?: () => void
}

export function useSteeringSessions({ meshClient, userId, onReset }: UseSteeringSessionsParams) {
  const [sessions, setSessions] = useState<MeshSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const sessionSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!userId) return
    meshClient
      .getSessions({ userId })
      .then(setSessions)
      .catch(() => {})
  }, [meshClient, userId])

  const handleNewSession = useCallback(() => {
    setActiveSessionId(null)
    onReset?.()
  }, [onReset])

  const handleSelectSession = useCallback(
    async (sessionId: string) => {
      try {
        const session = await meshClient.getSession(sessionId)
        setActiveSessionId(session.session_id)
        return session
      } catch {
        console.error('Failed to load session')
        return null
      }
    },
    [meshClient]
  )

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      try {
        await meshClient.deleteSession(sessionId)
        setSessions(prev => prev.filter(s => s.session_id !== sessionId))
        if (activeSessionId === sessionId) {
          setActiveSessionId(null)
          onReset?.()
        }
      } catch {
        console.error('Failed to delete session')
      }
    },
    [meshClient, activeSessionId, onReset]
  )

  const handleSessionSave = useCallback(
    (
      messages: Array<{ id: string; role: string; content: string }>,
      agentId: string,
      agentName: string,
      currentResult: string | null,
      commEvents?: SessionCommEvent[]
    ) => {
      if (!userId) return
      const sessionMessages: SessionMessage[] = messages.map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        timestamp: new Date().toISOString()
      }))

      if (sessionSaveRef.current) clearTimeout(sessionSaveRef.current)
      sessionSaveRef.current = setTimeout(async () => {
        try {
          const firstUserMsg = messages.find(m => m.role === 'user')
          const title = firstUserMsg?.content.slice(0, 60) || 'New conversation'

          if (activeSessionId) {
            await meshClient.updateSession(activeSessionId, {
              messages: sessionMessages,
              comm_events: commEvents,
              result: currentResult || undefined,
              title
            })
            setSessions(prev =>
              prev.map(s =>
                s.session_id === activeSessionId
                  ? {
                      ...s,
                      messages: sessionMessages,
                      comm_events: commEvents ?? s.comm_events,
                      result: currentResult,
                      title,
                      updated_at: new Date().toISOString()
                    }
                  : s
              )
            )
          } else {
            const newSession = await meshClient.createSession({
              user_id: userId,
              agent_id: agentId,
              agent_name: agentName,
              title
            })
            setActiveSessionId(newSession.session_id)
            await meshClient.updateSession(newSession.session_id, {
              messages: sessionMessages,
              comm_events: commEvents,
              result: currentResult || undefined
            })
            setSessions(prev => [
              { ...newSession, messages: sessionMessages, comm_events: commEvents ?? [], result: currentResult },
              ...prev
            ])
          }
        } catch {
          console.error('Failed to save session')
        }
      }, 800)
    },
    [meshClient, userId, activeSessionId]
  )

  const activeSession = sessions.find(s => s.session_id === activeSessionId)

  return {
    sessions,
    activeSessionId,
    activeSession,
    handleNewSession,
    handleSelectSession,
    handleDeleteSession,
    handleSessionSave
  }
}
