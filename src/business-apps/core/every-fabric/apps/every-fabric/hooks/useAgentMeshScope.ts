import { useCallback, useState } from 'react'
import { getCurrentUrlWithUpdatedSearchParams } from '@/common/utils/navigationUtils'
import type { MeshScope } from '../components/agent-mesh/meshScopes'
import { useFabric } from '../context/FabricContext'

function readScopeFromUrl(): MeshScope {
  if (typeof globalThis.location === 'undefined') return 'session'
  const params = new URLSearchParams(globalThis.location.search)
  const raw = params.get('meshScope')
  if (raw === 'company' || raw === 'user' || raw === 'me') return raw
  return 'session'
}

function readUserIdFromUrl(): string | undefined {
  if (typeof globalThis.location === 'undefined') return undefined
  return new URLSearchParams(globalThis.location.search).get('userId') ?? undefined
}

export function useAgentMeshScope() {
  const { activeSessionId } = useFabric()

  const [scope, setScopeState] = useState<MeshScope>(() => {
    const urlScope = readScopeFromUrl()
    if (urlScope === 'session' && !activeSessionId) return 'me'
    return urlScope
  })

  const [userId, setUserIdState] = useState<string | undefined>(readUserIdFromUrl)

  const setScope = useCallback((newScope: MeshScope, newUserId?: string) => {
    setScopeState(newScope)
    setUserIdState(newScope === 'user' ? newUserId : undefined)

    if (typeof globalThis.history === 'undefined' || typeof globalThis.location === 'undefined') return

    const params: Record<string, string | null> = { meshScope: newScope === 'session' ? null : newScope }
    if (newScope === 'user' && newUserId) {
      params.userId = newUserId
    } else {
      params.userId = null
    }

    const next = getCurrentUrlWithUpdatedSearchParams(params)
    if (next && next !== `${globalThis.location.pathname}${globalThis.location.search}`) {
      globalThis.history.pushState({ ...globalThis.history.state, meshScope: newScope }, '', next)
    }
  }, [])

  return { scope, userId, setScope }
}
