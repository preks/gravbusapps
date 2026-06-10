// Phase A: URL-driven state for the Workforce screens.
//
// Three query-string params live under the `view=enterprise-workforce`
// shell so the browser back/forward buttons, deep links, and refreshes
// all line up:
//
//   ?agentId=<id>        // selects an agent (drops -> list view)
//   &tab=<overview|...>  // active tab inside the detail screen
//   &runId=<session_id>  // selected run (Trace tab + drawer)
//
// Intentionally separate from `useSessionUrlState` (which handles the
// top-level `view` switching) so this stays scoped to Workforce and we
// do not have to touch the shared hook's closed type.

import { useCallback, useEffect, useState } from 'react'
import { getCurrentUrlWithUpdatedSearchParams } from '@/common/utils/navigationUtils'

export type WorkforceDetailTab = 'overview' | 'runs' | 'inbox' | 'trace' | 'config'

const VALID_TABS: ReadonlySet<WorkforceDetailTab> = new Set<WorkforceDetailTab>([
  'overview',
  'runs',
  'inbox',
  'trace',
  'config'
])

const DEFAULT_TAB: WorkforceDetailTab = 'overview'

export interface WorkforceUrlState {
  agentId: string | null
  tab: WorkforceDetailTab
  runId: string | null
}

export interface WorkforceUrlUpdate {
  agentId?: string | null
  tab?: WorkforceDetailTab | null
  runId?: string | null
}

function readSearchParam(name: string): string | null {
  if (typeof globalThis.location === 'undefined') return null
  return new URLSearchParams(globalThis.location.search).get(name)
}

function normaliseTab(value: string | null): WorkforceDetailTab {
  if (value && VALID_TABS.has(value as WorkforceDetailTab)) {
    return value as WorkforceDetailTab
  }
  return DEFAULT_TAB
}

function readUrlState(): WorkforceUrlState {
  return {
    agentId: readSearchParam('agentId'),
    tab: normaliseTab(readSearchParam('tab')),
    runId: readSearchParam('runId')
  }
}

export interface UseWorkforceUrlStateApi extends WorkforceUrlState {
  setAgent: (agentId: string | null) => void
  setTab: (tab: WorkforceDetailTab) => void
  setRun: (runId: string | null) => void
  // Combined update so callers can transition multiple params atomically
  // (e.g. "open agent X on the Trace tab focused on run Y" from a notification).
  updateUrl: (changes: WorkforceUrlUpdate) => void
}

export function useWorkforceUrlState(): UseWorkforceUrlStateApi {
  const [state, setState] = useState<WorkforceUrlState>(() => readUrlState())

  // Keep local state in sync with browser navigation events (back/forward,
  // external pushState by the parent shell).
  useEffect(() => {
    if (typeof globalThis.addEventListener !== 'function') return undefined
    const handler = () => setState(readUrlState())
    globalThis.addEventListener('popstate', handler)
    return () => globalThis.removeEventListener('popstate', handler)
  }, [])

  const updateUrl = useCallback((changes: WorkforceUrlUpdate) => {
    if (globalThis.history === undefined || globalThis.location === undefined) return
    const updates: Record<string, string | null> = {}
    if ('agentId' in changes) updates.agentId = changes.agentId ?? null
    if ('tab' in changes) updates.tab = changes.tab ?? null
    if ('runId' in changes) updates.runId = changes.runId ?? null
    // Default tab is implicit — drop it from the URL to keep links clean.
    if (updates.tab === DEFAULT_TAB) updates.tab = null
    // Clearing the agent must also drop tab/runId so navigation back to the
    // list view does not carry stale state into a re-entry.
    if ('agentId' in changes && changes.agentId === null) {
      updates.tab = null
      updates.runId = null
    }
    const next = getCurrentUrlWithUpdatedSearchParams(updates)
    if (!next) return
    if (next === `${globalThis.location.pathname}${globalThis.location.search}`) {
      // URL is already in the requested state; still resync local state
      // because the caller may have mutated upstream.
      setState(readUrlState())
      return
    }
    const currentState = globalThis.history.state
    globalThis.history.pushState({ ...(currentState ?? {}) }, '', next)
    setState(readUrlState())
  }, [])

  const setAgent = useCallback((agentId: string | null) => updateUrl({ agentId }), [updateUrl])
  const setTab = useCallback((tab: WorkforceDetailTab) => updateUrl({ tab }), [updateUrl])
  const setRun = useCallback((runId: string | null) => updateUrl({ runId }), [updateUrl])

  return {
    ...state,
    setAgent,
    setTab,
    setRun,
    updateUrl
  }
}
