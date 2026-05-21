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

  const fetchData = useCallback(async () => {
    if (!accessToken) return
    setIsLoading(true)
    setError(null)
    try {
      const backendScope = scope === 'company' ? 'workspace' : scope === 'me' ? 'me' : 'user'
      const result = await client.getMeshSessions({
        scope: backendScope,
        userId: scope === 'user' ? userId : undefined,
        limit: 100
      })
      setSessions(result.items)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      setSessions([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, client, scope, userId])

  useEffect(() => {
    if (fetchedRef.current === fetchKey) return
    fetchedRef.current = fetchKey
    void fetchData()
  }, [fetchKey, fetchData])

  const model = useMemo<AggregateTraceModel | null>(() => {
    if (sessions.length === 0) return null
    return buildAggregateModel(sessions, userNameMap)
  }, [sessions, userNameMap])

  const stats = useMemo<AggregateStats>(() => {
    if (!model) return EMPTY_STATS
    return buildAggregateStats(model, sessions)
  }, [model, sessions])

  return {
    model: model ?? (EMPTY_TRACE_MODEL as unknown as AggregateTraceModel),
    isLoading,
    error,
    stats,
    sessions,
    refresh: fetchData
  }
}
