import { useState, useEffect, useCallback } from 'react'
import type { DeepAgentSession } from '../types/enterpriseAgent'
import { useEnterpriseAgentClient } from './useEnterpriseAgentClient'

export const useAgentSessions = (accessToken: string) => {
  const client = useEnterpriseAgentClient(accessToken)
  const [sessions, setSessions] = useState<DeepAgentSession[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSessions = useCallback(async () => {
    try {
      const data = await client.getSessions({ limit: 50 })
      setSessions(data)
    } catch {
      // silent — empty list shown
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const addSession = useCallback((session: DeepAgentSession) => {
    setSessions(prev => [session, ...prev])
  }, [])

  const updateSession = useCallback((updated: DeepAgentSession) => {
    setSessions(prev => prev.map(s => (s.session_id === updated.session_id ? updated : s)))
  }, [])

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

  return { sessions, loading, addSession, updateSession, removeSession, refetch: fetchSessions }
}
