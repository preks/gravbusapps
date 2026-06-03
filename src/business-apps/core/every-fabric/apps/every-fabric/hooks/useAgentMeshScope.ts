import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'
import { getCurrentUrlWithUpdatedSearchParams } from '@/common/utils/navigationUtils'
import type { MeshScope } from '../components/agent-mesh/meshScopes'
import { useFabric } from '../context/FabricContext'
import {
  current as stackCurrent,
  goToIndex as stackGoToIndex,
  pop as stackPop,
  push as stackPush,
  replaceTop as stackReplaceTop,
  type MeshNavSnapshot
} from '../utils/meshNavigationStack'

interface UrlState {
  scope: MeshScope
  userId?: string
  fullscreen: boolean
}

function readUrl(): UrlState {
  if (typeof globalThis.location === 'undefined') return { scope: 'session', fullscreen: false }
  const params = new URLSearchParams(globalThis.location.search)
  const raw = params.get('meshScope')
  const scope: MeshScope = raw === 'company' || raw === 'user' || raw === 'me' ? raw : 'session'
  const userId = params.get('userId') ?? undefined
  const fullscreen = params.get('fullscreen') === '1'
  return { scope, userId, fullscreen }
}

const MESH_STACK_KEY = '__meshStack'

function writeUrl(snap: MeshNavSnapshot, fullStack?: MeshNavSnapshot[]): void {
  if (typeof globalThis.history === 'undefined' || typeof globalThis.location === 'undefined') return
  const updates: Record<string, string | null> = {
    meshScope: snap.scope === 'session' ? null : snap.scope,
    userId: snap.scope === 'user' && snap.userId ? snap.userId : null,
    fullscreen: snap.fullscreen ? '1' : null
  }
  // Set sessionId when drilling into a session so the URL is correct
  // before FabricContext's own pushState fires. For non-session scopes
  // leave sessionId untouched — FabricContext clears it via selectSession(null).
  if (snap.scope === 'session' && snap.sessionId) {
    updates.sessionId = snap.sessionId
  }
  const next = getCurrentUrlWithUpdatedSearchParams(updates)
  if (!next) return
  const currentUrl = `${globalThis.location.pathname}${globalThis.location.search}`
  const statePayload = {
    ...globalThis.history.state,
    meshSnapshot: snap,
    [MESH_STACK_KEY]: fullStack ?? [snap]
  }
  if (next === currentUrl) {
    // URL is the same but we still need to persist the stack in state.
    globalThis.history.replaceState(statePayload, '', next)
    return
  }
  globalThis.history.replaceState(statePayload, '', next)
}

function readSavedStack(): MeshNavSnapshot[] | null {
  if (typeof globalThis.history === 'undefined') return null
  const saved = globalThis.history.state?.[MESH_STACK_KEY]
  if (!Array.isArray(saved) || saved.length === 0) return null
  // Validate that every entry has a scope field.
  if (saved.some((s: unknown) => !s || typeof (s as MeshNavSnapshot).scope !== 'string')) return null
  return saved as MeshNavSnapshot[]
}

function buildInitialSnapshot(activeSessionId: string | null): MeshNavSnapshot {
  const url = readUrl()
  // When the URL implies `session` scope but no session is open, fall back
  // to `company` so the sidebar entry-point ("Company Mesh") and any deep
  // links land on a meaningful view rather than an empty session screen.
  // The old fallback was `me`, which felt arbitrary and undermined the new
  // sidebar IA that explicitly separates company-wide vs session destinations.
  const scope: MeshScope = url.scope === 'session' && !activeSessionId ? 'company' : url.scope
  return {
    scope,
    userId: scope === 'user' ? url.userId : undefined,
    sessionId: scope === 'session' ? (activeSessionId ?? undefined) : undefined,
    fullscreen: url.fullscreen
  }
}

export interface AgentMeshScopeValue {
  scope: MeshScope
  userId?: string
  sessionId?: string
  isFullscreen: boolean
  breadcrumbs: MeshNavSnapshot[]
  canGoBack: boolean
  setScope: (scope: MeshScope, userId?: string) => void
  pushSnapshot: (snap: MeshNavSnapshot) => void
  back: () => void
  goToIndex: (index: number) => void
  toggleFullscreen: () => void
  setFullscreen: (value: boolean) => void
  updateTopLabel: (label: string) => void
}

const AgentMeshScopeContext = createContext<AgentMeshScopeValue | null>(null)

/**
 * Owns the mesh navigation stack so users can drill down
 * (Company -> User -> Session) and step back without losing context.
 * Single source of truth: must be wrapped in `AgentMeshScopeProvider`.
 */
function useAgentMeshScopeImpl(): AgentMeshScopeValue {
  const { activeSessionId, selectSession } = useFabric()

  const [stack, setStack] = useState<MeshNavSnapshot[]>(
    () => readSavedStack() ?? [buildInitialSnapshot(activeSessionId)]
  )
  const stackRef = useRef(stack)
  stackRef.current = stack

  const top = stackCurrent(stack) ?? buildInitialSnapshot(activeSessionId)
  const isFirstSync = useRef(true)

  // Fallback: keep URL in sync after external state changes (e.g. session load).
  // Synchronous writeUrl calls in mutation callbacks handle the common path.
  useEffect(() => {
    if (isFirstSync.current) {
      isFirstSync.current = false
      return
    }
    writeUrl(top, stack)
  }, [top, stack])

  useEffect(() => {
    if (typeof globalThis.addEventListener === 'undefined') return
    const onPop = () => {
      // Prefer the saved stack from the history entry — it preserves
      // the full drill-down trail. Fall back to building a fresh
      // single-entry stack from the URL when nothing is saved.
      const saved = readSavedStack()
      if (saved) {
        setStack(prev => {
          const prevTop = stackCurrent(prev)
          const nextTop = stackCurrent(saved)
          if (
            prevTop &&
            nextTop &&
            prevTop.scope === nextTop.scope &&
            (prevTop.userId ?? null) === (nextTop.userId ?? null) &&
            (prevTop.sessionId ?? null) === (nextTop.sessionId ?? null) &&
            prevTop.fullscreen === nextTop.fullscreen &&
            prev.length === saved.length
          ) {
            return prev
          }
          return saved
        })
        return
      }
      const next = buildInitialSnapshot(activeSessionId)
      setStack(prev => {
        const prevTop = stackCurrent(prev)
        if (
          prevTop &&
          prevTop.scope === next.scope &&
          (prevTop.userId ?? null) === (next.userId ?? null) &&
          (prevTop.sessionId ?? null) === (next.sessionId ?? null) &&
          prevTop.fullscreen === next.fullscreen
        ) {
          return prev
        }
        return [next]
      })
    }
    globalThis.addEventListener('popstate', onPop)
    return () => globalThis.removeEventListener('popstate', onPop)
  }, [activeSessionId])

  const applySessionSideEffect = useCallback(
    (target: MeshNavSnapshot) => {
      if (target.scope === 'session') {
        if (target.sessionId && activeSessionId !== target.sessionId) {
          selectSession(target.sessionId)
        }
      } else if (activeSessionId) {
        selectSession(null)
      }
    },
    [activeSessionId, selectSession]
  )

  const pushSnapshot = useCallback(
    (snap: MeshNavSnapshot) => {
      const newStack = stackPush(stackRef.current, snap)
      setStack(newStack)
      writeUrl(snap, newStack)
      applySessionSideEffect(snap)
    },
    [applySessionSideEffect]
  )

  // Tab-based scope switch is a lateral move, not a drill-down.
  // Reset the stack to just the new scope so the breadcrumb doesn't
  // show e.g. "Igor > Company" (Company is the widest scope, not
  // a child of a user).
  const setScope = useCallback(
    (newScope: MeshScope, newUserId?: string) => {
      const fullscreen = stackCurrent(stackRef.current)?.fullscreen ?? false
      const snap: MeshNavSnapshot = {
        scope: newScope,
        userId: newScope === 'user' ? newUserId : undefined,
        sessionId: newScope === 'session' ? (activeSessionId ?? undefined) : undefined,
        fullscreen
      }
      const newStack = [snap]
      setStack(newStack)
      writeUrl(snap, newStack)
      applySessionSideEffect(snap)
    },
    [activeSessionId, applySessionSideEffect]
  )

  const back = useCallback(() => {
    const current = stackRef.current
    if (current.length <= 1) return
    const newStack = stackPop(current)
    const newTop = stackCurrent(newStack)
    setStack(newStack)
    if (newTop) {
      writeUrl(newTop, newStack)
      applySessionSideEffect(newTop)
    }
  }, [applySessionSideEffect])

  const goToIndex = useCallback(
    (index: number) => {
      const current = stackRef.current
      const newStack = stackGoToIndex(current, index)
      if (newStack === current) return
      const newTop = stackCurrent(newStack)
      setStack(newStack)
      if (newTop) {
        writeUrl(newTop, newStack)
        applySessionSideEffect(newTop)
      }
    },
    [applySessionSideEffect]
  )

  const setFullscreen = useCallback((value: boolean) => {
    const current = stackRef.current
    const topSnap = stackCurrent(current)
    if (!topSnap || topSnap.fullscreen === value) return
    const newTop = { ...topSnap, fullscreen: value }
    const newStack = stackReplaceTop(current, newTop)
    setStack(newStack)
    writeUrl(newTop, newStack)
  }, [])

  const toggleFullscreen = useCallback(() => {
    const current = stackRef.current
    const topSnap = stackCurrent(current)
    if (!topSnap) return
    const newTop = { ...topSnap, fullscreen: !topSnap.fullscreen }
    const newStack = stackReplaceTop(current, newTop)
    setStack(newStack)
    writeUrl(newTop, newStack)
  }, [])

  const updateTopLabel = useCallback((label: string) => {
    const current = stackRef.current
    const topSnap = stackCurrent(current)
    if (!topSnap || topSnap.label === label) return
    setStack(stackReplaceTop(current, { ...topSnap, label }))
  }, [])

  return useMemo(
    () => ({
      scope: top.scope,
      userId: top.userId,
      sessionId: top.sessionId,
      isFullscreen: top.fullscreen,
      breadcrumbs: stack,
      canGoBack: stack.length > 1,
      setScope,
      pushSnapshot,
      back,
      goToIndex,
      toggleFullscreen,
      setFullscreen,
      updateTopLabel
    }),
    [
      top.scope,
      top.userId,
      top.sessionId,
      top.fullscreen,
      stack,
      setScope,
      pushSnapshot,
      back,
      goToIndex,
      toggleFullscreen,
      setFullscreen,
      updateTopLabel
    ]
  )
}

export const AgentMeshScopeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const value = useAgentMeshScopeImpl()
  return createElement(AgentMeshScopeContext.Provider, { value }, children)
}

/**
 * Read the shared mesh navigation state. Throws when called outside
 * `AgentMeshScopeProvider` to surface wiring bugs early.
 */
export function useAgentMeshScope(): AgentMeshScopeValue {
  const value = useContext(AgentMeshScopeContext)
  if (!value) throw new Error('useAgentMeshScope must be used inside AgentMeshScopeProvider')
  return value
}
