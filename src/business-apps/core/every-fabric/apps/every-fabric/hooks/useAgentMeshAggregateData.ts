import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFabric } from '../context/FabricContext'
import type { DeepAgentSession } from '../types/enterpriseAgent'
import type { MeshScope } from '../components/agent-mesh/meshScopes'
import {
  buildAggregateModel,
  buildAggregateStats,
  type AggregateStats,
  type AggregateTraceModel
} from '../utils/meshAggregateModel'
import { EMPTY_TRACE_MODEL } from '../utils/traceModel'
import { useEnterpriseAgentClient } from './useEnterpriseAgentClient'

const EMPTY_STATS: AggregateStats = {
  agentCount: 0,
  toolCount: 0,
  skillCount: 0,
  sessionCount: 0,
  userCount: 0,
  topAgents: [],
  topSkills: [],
  topTools: []
}

const POLL_INTERVAL_MS = 5_000

export function useAgentMeshAggregateData(scope: Exclude<MeshScope, 'session'>, userId?: string) {
  const { accessToken, userInfo } = useFabric()
  const client = useEnterpriseAgentClient(accessToken)

  const [sessions, setSessions] = useState<DeepAgentSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchedRef = useRef<string | null>(null)

  const userNameMap = useMemo(() => {
    const map = new Map<string, string>()
    if (userInfo?.id) {
      const name =
        userInfo.employeeDetails?.displayName ||
        [userInfo.givenName, userInfo.familyName].filter(Boolean).join(' ') ||
        userInfo.userName ||
        userInfo.nickName
      if (name) map.set(userInfo.id, name)
    }
    for (const s of sessions) {
      if (s.user_id && s.user_name && !map.has(s.user_id)) {
        map.set(s.user_id, s.user_name)
      }
    }
    return map
  }, [userInfo, sessions])

  const fetchKey = `${scope}:${userId ?? ''}`

  const fetchData = useCallback(
    async (silent = false) => {
      if (!accessToken) return
      if (!silent) {
        setIsLoading(true)
        setError(null)
      }
      try {
        const backendScope = scope === 'company' ? 'workspace' : scope === 'me' ? 'me' : 'user'
        const result = await client.getMeshSessions({
          scope: backendScope,
          userId: scope === 'user' ? userId : undefined,
          limit: 100
        })
        setSessions(result.items)
        if (!silent) setError(null)
      } catch (err) {
        if (!silent) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          setError(message)
          setSessions([])
        }
      } finally {
        if (!silent) setIsLoading(false)
      }
    },
    [accessToken, client, scope, userId]
  )

  useEffect(() => {
    if (fetchedRef.current === fetchKey) return
    fetchedRef.current = fetchKey
    void fetchData(false)
  }, [fetchKey, fetchData])

  // Background polling so aggregate views reflect new / running sessions.
  useEffect(() => {
    if (!accessToken) return
    const id = setInterval(() => void fetchData(true), POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [accessToken, fetchData])

  const model = useMemo<AggregateTraceModel | null>(() => {
    if (sessions.length === 0) return null
    return buildAggregateModel(sessions, userNameMap)
  }, [sessions, userNameMap])

  const stats = useMemo<AggregateStats>(() => {
    if (!model) return EMPTY_STATS
    return buildAggregateStats(model, sessions)
  }, [model, sessions])

  const sessionTitleMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of sessions) {
      const title = s.input?.slice(0, 100)
      if (s.session_id && title) map.set(s.session_id, title)
    }
    return map
  }, [sessions])

  return {
    model: model ?? (EMPTY_TRACE_MODEL as unknown as AggregateTraceModel),
    isLoading,
    error,
    stats,
    sessions,
    userNameMap,
    sessionTitleMap,
    refresh: fetchData
  }
}
