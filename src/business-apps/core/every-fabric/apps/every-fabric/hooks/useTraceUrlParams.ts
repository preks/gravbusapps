// Reads `t` (time offset in ms) and `focus` (node id) from URL search params.

import { useMemo } from 'react'

interface TraceUrlParams {
  /** Replay time offset in milliseconds, or null if not set. */
  t: number | null
  /** Focused node id, or null if not set. */
  focus: string | null
}

export function useTraceUrlParams(): TraceUrlParams {
  return useMemo(() => {
    if (typeof globalThis.location === 'undefined') return { t: null, focus: null }
    const params = new URLSearchParams(globalThis.location.search)
    const rawT = params.get('t')
    const t = rawT !== null ? Number(rawT) : null
    const focus = params.get('focus')
    return { t: Number.isFinite(t) ? t : null, focus }
  }, [])
}
