// Live trace streaming for a single Workforce run.
//
// A Workforce run is a DeepAgentSession, so we reuse the shared per-session
// SSE registry (the same one interactive Fabric chat uses) instead of polling.
// The hook merges the authoritative REST trace (loaded once via
// `getWorkforceRun`) with the live SSE events, deduped by event id / seq, and
// reports whether the run is still streaming so the UI can show a live pill.
//
// When the REST run is already terminal, the stream is suppressed entirely —
// the persisted trace is authoritative and we avoid opening a dead connection.

import { useMemo } from 'react'
import { useSessionStreamEntry } from '../../hooks/useSessionStreamEntry'
import type { AgentStreamEvent } from '../../types/enterpriseAgent'
import { isTerminalRunStatus } from './useWorkforceRuns'
import type { WorkforceRun, WorkforceRunStatus, WorkforceRunTraceEvent } from './workforceTypes'

export interface UseWorkforceRunStreamResult {
  /** REST trace merged with any live SSE events, sorted by seq. */
  trace: WorkforceRunTraceEvent[]
  /** True while the run is in-flight and we expect more events. */
  isStreaming: boolean
  /** True while the SSE connection is open. */
  isConnected: boolean
  /** Latest known run status (live terminal status wins over the REST status). */
  liveStatus: WorkforceRunStatus | null
}

function seqOf(event: { seq?: unknown }): number {
  return typeof event.seq === 'number' ? event.seq : 0
}

function keyOf(event: { event_id?: unknown; seq?: unknown }): string {
  if (event.event_id) return String(event.event_id)
  return `seq:${seqOf(event)}`
}

/**
 * Subscribe to a Workforce run's live trace.
 *
 * Pass the run as loaded from `getWorkforceRun` (it carries the REST trace and
 * status). The hook keeps streaming while the run is non-terminal and stops as
 * soon as a terminal event arrives or the REST status is already terminal.
 */
export function useWorkforceRunStream(run: WorkforceRun | null, accessToken: string): UseWorkforceRunStreamResult {
  const restTerminal = run ? isTerminalRunStatus(run.status) : true
  const sessionId = run?.session_id ?? null
  const streamSuppressed = !run || restTerminal || !accessToken
  const { events, isConnected } = useSessionStreamEntry(sessionId, accessToken, streamSuppressed)

  return useMemo<UseWorkforceRunStreamResult>(() => {
    const restTrace = (run?.trace ?? []) as WorkforceRunTraceEvent[]
    const restStatus = run?.status ?? null

    if (streamSuppressed) {
      return { trace: restTrace, isStreaming: false, isConnected: false, liveStatus: restStatus }
    }

    const byKey = new Map<string, WorkforceRunTraceEvent>()
    for (const entry of restTrace) byKey.set(keyOf(entry), entry)

    let terminalStatus: WorkforceRunStatus | null = null
    for (const event of events as AgentStreamEvent[]) {
      if (event.type === 'terminal') {
        const status = (event as { status?: WorkforceRunStatus }).status
        if (status) terminalStatus = status
        continue
      }
      const traceEvent = event as unknown as WorkforceRunTraceEvent
      byKey.set(keyOf(traceEvent), traceEvent)
    }

    const merged = Array.from(byKey.values()).sort((a, b) => seqOf(a) - seqOf(b))
    const isStreaming = terminalStatus === null
    return {
      trace: merged,
      isStreaming,
      isConnected,
      liveStatus: terminalStatus ?? restStatus
    }
  }, [run, events, isConnected, streamSuppressed])
}
