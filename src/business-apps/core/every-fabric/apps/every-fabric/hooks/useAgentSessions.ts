import { useState, useEffect, useCallback } from 'react'
import type { DeepAgentSession } from '../types/enterpriseAgent'
import { useEnterpriseAgentClient } from './useEnterpriseAgentClient'
import { useFlowBotFabricClient } from './useFlowBotFabricClient'
import { isFlowBotFabricRuntime } from '../utils/fabricRuntime'

export const useAgentSessions = (accessToken: string) => {
  const promptManagerClient = useEnterpriseAgentClient(accessToken)
  const flowBotClient = useFlowBotFabricClient(accessToken)
  const flowBotRuntime = isFlowBotFabricRuntime()
  const client = flowBotRuntime ? flowBotClient : promptManagerClient
  const [sessions, setSessions] = useState<DeepAgentSession[]>([])
  const [loading, setLoading] = useState(true)

  const byUpdatedDesc = useCallback((a: DeepAgentSession, b: DeepAgentSession) => {
    const aTs = Date.parse(a.updated_at ?? a.created_at)
    const bTs = Date.parse(b.updated_at ?? b.created_at)
    return (Number.isNaN(bTs) ? 0 : bTs) - (Number.isNaN(aTs) ? 0 : aTs)
  }, [])

  const upsertSession = useCallback(
    (prev: DeepAgentSession[], session: DeepAgentSession) => {
      const existingIndex = prev.findIndex(s => s.session_id === session.session_id)
      if (existingIndex === -1) return [session, ...prev].sort(byUpdatedDesc)

      const next = [...prev]
      next[existingIndex] = { ...next[existingIndex], ...session }
      return next.sort(byUpdatedDesc)
    },
    [byUpdatedDesc]
  )

  const fetchSessions = useCallback(async () => {
    if (flowBotRuntime) {
      setLoading(false)
      return
    }
    try {
      const data = await promptManagerClient.getSessions({ limit: 50 })
      setSessions([...data].sort(byUpdatedDesc))
    } catch {
      // silent — empty list shown
    } finally {
      setLoading(false)
    }
  }, [promptManagerClient, byUpdatedDesc, flowBotRuntime])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const addSession = useCallback(
    (session: DeepAgentSession) => {
      setSessions(prev => upsertSession(prev, session))
    },
    [upsertSession]
  )

  const updateSession = useCallback(
    (updated: DeepAgentSession) => {
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

  return { sessions, loading, addSession, updateSession, removeSession, refetch: fetchSessions }
}
